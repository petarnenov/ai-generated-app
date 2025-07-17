import express from 'express';
import axios from 'axios';
import { db } from '../database/init.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

const router = express.Router();

interface GitLabProject {
  id: number;
  name: string;
  namespace: {
    name: string;
    path: string;
  };
  web_url: string;
  default_branch: string;
  path_with_namespace: string;
}

interface GitLabMergeRequest {
  id: number;
  title: string;
  description: string;
  source_branch: string;
  target_branch: string;
  author: {
    username: string;
  };
  state: string;
  web_url: string;
  created_at: string;
  updated_at: string;
}

interface GitLabConfig {
  gitlab_url?: string;
  gitlab_token?: string;
}

// Get GitLab configuration
router.get('/config', asyncHandler(async (req, res) => {
  db.all(
    'SELECT key, value FROM settings WHERE key IN (?, ?)',
    ['gitlab_url', 'gitlab_token'],
    (err, rows: any[]) => {
      if (err) {
        throw createError(500, 'Failed to fetch GitLab configuration');
      }
      
      const config = rows.reduce((acc: GitLabConfig, row: any) => {
        acc[row.key as keyof GitLabConfig] = row.value;
        return acc;
      }, {} as GitLabConfig);
      
      res.json({
        gitlab_url: config.gitlab_url || '',
        has_token: !!config.gitlab_token
      });
    }
  );
}));

// Update GitLab configuration
router.post('/config', asyncHandler(async (req, res) => {
  const { gitlab_url, gitlab_token } = req.body;
  
  if (!gitlab_url || !gitlab_token) {
    throw createError(400, 'GitLab URL and token are required');
  }
  
  // Test the connection
  try {
    await axios.get(`${gitlab_url}/api/v4/user`, {
      headers: {
        'Authorization': `Bearer ${gitlab_token}`
      }
    });
  } catch (error) {
    throw createError(400, 'Invalid GitLab URL or token');
  }
  
  // Update settings
  const updatePromises = [
    new Promise((resolve, reject) => {
      db.run(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['gitlab_url', gitlab_url],
        (err) => err ? reject(err) : resolve(null)
      );
    }),
    new Promise((resolve, reject) => {
      db.run(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['gitlab_token', gitlab_token],
        (err) => err ? reject(err) : resolve(null)
      );
    })
  ];
  
  await Promise.all(updatePromises);
  
  res.json({ message: 'GitLab configuration updated successfully' });
}));

// Get projects from GitLab
router.get('/projects', asyncHandler(async (req, res) => {
  const { page = 1, per_page = 20, search = '' } = req.query;
  
  // Get GitLab config
  const config = await new Promise<any>((resolve, reject) => {
    db.all(
      'SELECT key, value FROM settings WHERE key IN (?, ?)',
      ['gitlab_url', 'gitlab_token'],
      (err, rows) => {
        if (err) return reject(err);
        const config = rows.reduce((acc: any, row: any) => {
          acc[row.key] = row.value;
          return acc;
        }, {});
        resolve(config);
      }
    );
  });
  
  if (!config.gitlab_url || !config.gitlab_token) {
    throw createError(400, 'GitLab not configured');
  }
  
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: per_page.toString(),
    membership: 'true',
    order_by: 'last_activity_at',
    sort: 'desc'
  });
  
  if (search) {
    params.append('search', search.toString());
  }
  
  const response = await axios.get(`${config.gitlab_url}/api/v4/projects?${params}`, {
    headers: {
      'Authorization': `Bearer ${config.gitlab_token}`
    }
  });
  
  res.json({
    projects: response.data,
    pagination: {
      page: parseInt(page.toString()),
      per_page: parseInt(per_page.toString()),
      total: parseInt(response.headers['x-total'] || '0'),
      total_pages: parseInt(response.headers['x-total-pages'] || '0')
    }
  });
}));

// Add project to track
router.post('/projects/:id/track', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { webhook_token } = req.body;
  
  // Get GitLab config
  const config = await new Promise<any>((resolve, reject) => {
    db.all(
      'SELECT key, value FROM settings WHERE key IN (?, ?)',
      ['gitlab_url', 'gitlab_token'],
      (err, rows) => {
        if (err) return reject(err);
        const config = rows.reduce((acc: any, row: any) => {
          acc[row.key] = row.value;
          return acc;
        }, {});
        resolve(config);
      }
    );
  });
  
  // Get project details from GitLab
  const response = await axios.get(`${config.gitlab_url}/api/v4/projects/${projectId}`, {
    headers: {
      'Authorization': `Bearer ${config.gitlab_token}`
    }
  });
  
  const project: GitLabProject = response.data;
  
  // Save to database
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO projects 
       (gitlab_project_id, name, namespace, web_url, default_branch, webhook_token, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        project.id,
        project.name,
        project.namespace.path,
        project.web_url,
        project.default_branch,
        webhook_token || null
      ],
      (err) => err ? reject(err) : resolve(null)
    );
  });
  
  res.json({ message: 'Project added successfully', project });
}));

// Get tracked projects
router.get('/tracked-projects', asyncHandler(async (req, res) => {
  db.all(
    'SELECT * FROM projects ORDER BY updated_at DESC',
    [],
    (err, rows) => {
      if (err) {
        throw createError(500, 'Failed to fetch tracked projects');
      }
      res.json({ projects: rows });
    }
  );
}));

// Sync merge requests for a project
router.post('/projects/:id/sync', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  
  // Get project data from local DB
  const projectData = await new Promise<any>((resolve, reject) => {
    db.get(
      'SELECT * FROM projects WHERE id = ?',
      [projectId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
  
  if (!projectData) {
    throw createError(404, 'Project not found');
  }
  
  // Get GitLab config
  const config = await new Promise<any>((resolve, reject) => {
    db.all(
      'SELECT key, value FROM settings WHERE key IN (?, ?)',
      ['gitlab_url', 'gitlab_token'],
      (err, rows) => {
        if (err) return reject(err);
        const config = rows.reduce((acc: any, row: any) => {
          acc[row.key] = row.value;
          return acc;
        }, {});
        resolve(config);
      }
    );
  });
  
  if (!config.gitlab_url || !config.gitlab_token) {
    throw createError(400, 'GitLab not configured');
  }
  
  // Fetch merge requests from GitLab
  const response = await axios.get(
    `${config.gitlab_url}/api/v4/projects/${projectData.gitlab_project_id}/merge_requests`,
    {
      headers: {
        'Authorization': `Bearer ${config.gitlab_token}`
      },
      params: {
        state: 'opened',
        per_page: 100
      }
    }
  );
  
  const mergeRequests: GitLabMergeRequest[] = response.data;
  
  // Save merge requests to database
  let syncCount = 0;
  for (const mr of mergeRequests) {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO merge_requests 
         (project_id, gitlab_mr_id, title, description, source_branch, target_branch, 
          author_username, state, web_url, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          projectData.id,
          mr.id,
          mr.title,
          mr.description,
          mr.source_branch,
          mr.target_branch,
          mr.author?.username || 'unknown',
          mr.state,
          mr.web_url
        ],
        (err) => err ? reject(err) : resolve(null)
      );
    });
    syncCount++;
  }
  
  res.json({ 
    message: `Synced ${syncCount} merge requests successfully`,
    count: syncCount 
  });
}));

// Sync all tracked projects
router.post('/sync-all', asyncHandler(async (req, res) => {
  // Get all tracked projects
  const projects = await new Promise<any[]>((resolve, reject) => {
    db.all(
      'SELECT * FROM projects',
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
  
  if (projects.length === 0) {
    return res.json({ message: 'No projects to sync', results: [] });
  }
  
  // Get GitLab config
  const config = await new Promise<any>((resolve, reject) => {
    db.all(
      'SELECT key, value FROM settings WHERE key IN (?, ?)',
      ['gitlab_url', 'gitlab_token'],
      (err, rows) => {
        if (err) return reject(err);
        const config = rows.reduce((acc: any, row: any) => {
          acc[row.key] = row.value;
          return acc;
        }, {});
        resolve(config);
      }
    );
  });
  
  if (!config.gitlab_url || !config.gitlab_token) {
    throw createError(400, 'GitLab not configured');
  }
  
  const results: Array<{
    project_id: any;
    project_name: any;
    synced_count: number;
    status: string;
    error?: string;
  }> = [];
  
  // Sync each project
  for (const project of projects) {
    try {
      // Fetch merge requests from GitLab
      const response = await axios.get(
        `${config.gitlab_url}/api/v4/projects/${project.gitlab_project_id}/merge_requests`,
        {
          headers: {
            'Authorization': `Bearer ${config.gitlab_token}`
          },
          params: {
            state: 'opened',
            per_page: 100
          }
        }
      );
      
      const mergeRequests: GitLabMergeRequest[] = response.data;
      
      // Save merge requests to database
      let syncCount = 0;
      for (const mr of mergeRequests) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR REPLACE INTO merge_requests 
             (project_id, gitlab_mr_id, title, description, source_branch, target_branch, 
              author_username, state, web_url, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              project.id,
              mr.id,
              mr.title,
              mr.description,
              mr.source_branch,
              mr.target_branch,
              mr.author?.username || 'unknown',
              mr.state,
              mr.web_url
            ],
            (err) => err ? reject(err) : resolve(null)
          );
        });
        syncCount++;
      }
      
      results.push({
        project_id: project.id,
        project_name: project.name,
        synced_count: syncCount,
        status: 'success'
      });
      
    } catch (error) {
      results.push({
        project_id: project.id,
        project_name: project.name,
        synced_count: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  res.json({
    message: 'Sync completed',
    results
  });
}));

// Remove tracked project
router.delete('/projects/:id', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  
  await new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM projects WHERE id = ?',
      [projectId],
      (err) => err ? reject(err) : resolve(null)
    );
  });
  
  res.json({ message: 'Project removed successfully' });
}));

// Update project AI configuration
router.put('/projects/:id/ai-config', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { ai_provider, ai_model } = req.body;
  
  if (!ai_provider || !ai_model) {
    throw createError(400, 'AI provider and model are required');
  }
  
  await new Promise((resolve, reject) => {
    db.run(
      'UPDATE projects SET ai_provider = ?, ai_model = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [ai_provider, ai_model, projectId],
      (err) => err ? reject(err) : resolve(null)
    );
  });
  
  res.json({ message: 'AI configuration updated successfully' });
}));

// Webhook handler for GitLab events
router.post('/webhook', asyncHandler(async (req, res) => {
  const event = req.headers['x-gitlab-event'];
  const token = req.headers['x-gitlab-token'];
  
  if (event === 'Merge Request Hook') {
    const { object_attributes: mr, project } = req.body;
    
    // Verify webhook token
    const projectData = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT * FROM projects WHERE gitlab_project_id = ?',
        [project.id],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
    
    if (!projectData) {
      throw createError(404, 'Project not tracked');
    }
    
    if (projectData.webhook_token && projectData.webhook_token !== token) {
      throw createError(401, 'Invalid webhook token');
    }
    
    // Save/update merge request
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO merge_requests 
         (project_id, gitlab_mr_id, title, description, source_branch, target_branch, 
          author_username, state, web_url, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          projectData.id,
          mr.id,
          mr.title,
          mr.description,
          mr.source_branch,
          mr.target_branch,
          mr.author?.username || 'unknown',
          mr.state,
          mr.url
        ],
        (err) => err ? reject(err) : resolve(null)
      );
    });
    
    // Trigger AI review if MR is opened or updated
    if (mr.state === 'opened' || mr.state === 'updated') {
      // TODO: Trigger AI review (implement in next steps)
      console.log(`🔄 MR ${mr.id} ${mr.state} - AI review will be triggered`);
    }
  }
  
  res.json({ message: 'Webhook processed successfully' });
}));

export default router;
