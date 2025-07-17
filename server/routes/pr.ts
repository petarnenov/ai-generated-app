import express from 'express';
import axios from 'axios';
import { db } from '../database/init';
import { asyncHandler, createError } from '../middleware/errorHandler';

interface GitLabChange {
  old_path: string;
  new_path: string;
  new_file: boolean;
  deleted_file: boolean;
  renamed_file: boolean;
  diff: string;
}

interface GitLabMergeRequestChanges {
  changes: GitLabChange[];
}

interface GitLabConfig {
  gitlab_url?: string;
  gitlab_token?: string;
}

interface MergeRequestStats {
  total_mrs: number;
  open_mrs: number;
  merged_mrs: number;
  closed_mrs: number;
}

interface ReviewStats {
  total_reviews: number;
  completed_reviews: number;
  pending_reviews: number;
  failed_reviews: number;
  avg_score: number;
}

const router = express.Router();

// Get merge requests
router.get('/', asyncHandler(async (req, res) => {
  const { project_id, state, page = 1, per_page = 20 } = req.query;
  
  let query = `
    SELECT mr.*, p.name as project_name, p.namespace, p.web_url as project_url
    FROM merge_requests mr
    LEFT JOIN projects p ON mr.project_id = p.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (project_id) {
    query += ' AND mr.project_id = ?';
    params.push(project_id);
  }
  
  if (state) {
    query += ' AND mr.state = ?';
    params.push(state);
  }
  
  query += ' ORDER BY mr.updated_at DESC LIMIT ? OFFSET ?';
  params.push(per_page, (parseInt(page.toString()) - 1) * parseInt(per_page.toString()));
  
  db.all(query, params, (err, rows) => {
    if (err) {
      throw createError(500, 'Failed to fetch merge requests');
    }
    res.json({ merge_requests: rows });
  });
}));

// Get merge request details
router.get('/:id', asyncHandler(async (req, res) => {
  const mrId = parseInt(req.params.id);
  
  // Get MR details
  const mr = await new Promise<any>((resolve, reject) => {
    db.get(
      `SELECT mr.*, p.name as project_name, p.namespace, p.web_url as project_url
       FROM merge_requests mr
       LEFT JOIN projects p ON mr.project_id = p.id
       WHERE mr.id = ?`,
      [mrId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
  
  if (!mr) {
    throw createError(404, 'Merge request not found');
  }
  
  // Get AI reviews
  const reviews = await new Promise<any[]>((resolve, reject) => {
    db.all(
      'SELECT * FROM ai_reviews WHERE merge_request_id = ? ORDER BY created_at DESC',
      [mrId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
  
  // Get review comments for each review
  const reviewsWithComments = await Promise.all(
    reviews.map(async (review) => {
      const comments = await new Promise<any[]>((resolve, reject) => {
        db.all(
          'SELECT * FROM review_comments WHERE ai_review_id = ? ORDER BY file_path, line_number',
          [review.id],
          (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
          }
        );
      });
      
      return {
        ...review,
        comments
      };
    })
  );
  
  res.json({
    merge_request: mr,
    reviews: reviewsWithComments
  });
}));

// Trigger AI review
router.post('/:id/review', asyncHandler(async (req, res) => {
  const mrId = parseInt(req.params.id);
  const { review_type = 'general', force = false } = req.body;
  
  // Get MR details
  const mr = await new Promise<any>((resolve, reject) => {
    db.get(
      'SELECT * FROM merge_requests WHERE id = ?',
      [mrId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
  
  if (!mr) {
    throw createError(404, 'Merge request not found');
  }
  
  // Check if review already exists and is not forced
  if (!force) {
    const existingReview = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT * FROM ai_reviews WHERE merge_request_id = ? AND review_type = ? AND status = ?',
        [mrId, review_type, 'completed'],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
    
    if (existingReview) {
      throw createError(409, 'Review already exists for this MR and type');
    }
  }
  
  // Create new AI review record
  const reviewId = await new Promise<number>((resolve, reject) => {
    db.run(
      `INSERT INTO ai_reviews (merge_request_id, review_type, ai_provider, ai_model, status)
       VALUES (?, ?, ?, ?, ?)`,
      [mrId, review_type, 'openai', 'gpt-4', 'pending'],
      function(err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });

  // Perform actual AI review
  try {
    // Get project configuration for AI settings
    const projectConfig = await new Promise<any>((resolve, reject) => {
      db.get(
        `SELECT p.ai_provider, p.ai_model FROM projects p 
         JOIN merge_requests mr ON p.id = mr.project_id 
         WHERE mr.id = ?`,
        [mrId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    // Get AI configuration
    const aiConfig = await new Promise<any>((resolve, reject) => {
      db.all(
        'SELECT key, value FROM settings WHERE key IN (?, ?)',
        ['openai_api_key', 'anthropic_api_key'],
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

    const provider = projectConfig?.ai_provider || 'openai';
    const model = projectConfig?.ai_model || 'gpt-4';
    const apiKey = provider === 'openai' ? aiConfig.openai_api_key : aiConfig.anthropic_api_key;

    if (!apiKey) {
      throw new Error(`${provider} API key not configured`);
    }

    // Get GitLab configuration for API access
    const gitlabConfig = await new Promise<GitLabConfig>((resolve, reject) => {
      db.all(
        'SELECT key, value FROM settings WHERE key IN (?, ?)',
        ['gitlab_url', 'gitlab_token'],
        (err, rows) => {
          if (err) return reject(err);
          const config = (rows as { key: string; value: string }[]).reduce((acc: GitLabConfig, row) => {
            (acc as any)[row.key] = row.value;
            return acc;
          }, {} as GitLabConfig);
          resolve(config);
        }
      );
    });

    let codeChanges = '';
    
    // Fetch actual code changes from GitLab API
    if (gitlabConfig.gitlab_url && gitlabConfig.gitlab_token) {
      try {
        // First get the project info to get the GitLab project ID
        const projectInfo = await new Promise<any>((resolve, reject) => {
          db.get(
            'SELECT gitlab_project_id FROM projects WHERE id = ?',
            [mr.project_id],
            (err, row) => {
              if (err) return reject(err);
              resolve(row);
            }
          );
        });

        if (projectInfo?.gitlab_project_id) {
          // Get the IID for this merge request by searching for it
          const mrSearchResponse = await axios.get(
            `${gitlabConfig.gitlab_url}/api/v4/projects/${projectInfo.gitlab_project_id}/merge_requests`,
            {
              headers: {
                'Authorization': `Bearer ${gitlabConfig.gitlab_token}`,
                'Content-Type': 'application/json'
              },
              params: {
                search: mr.title.split(' - ')[0] // Search by ticket number
              }
            }
          );

          const matchingMR = mrSearchResponse.data.find((gitlabMR: any) => gitlabMR.id === mr.gitlab_mr_id);
          
          if (matchingMR) {
            // Get merge request changes/diff using the IID
            const changesResponse = await axios.get(
              `${gitlabConfig.gitlab_url}/api/v4/projects/${projectInfo.gitlab_project_id}/merge_requests/${matchingMR.iid}/changes`,
              {
                headers: {
                  'Authorization': `Bearer ${gitlabConfig.gitlab_token}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            if (changesResponse.data && changesResponse.data.changes) {
              codeChanges = changesResponse.data.changes.map((change: GitLabChange) => {
                return `
=== File: ${change.new_path || change.old_path} ===
${change.new_file ? '[NEW FILE]' : ''}
${change.deleted_file ? '[DELETED FILE]' : ''}
${change.renamed_file ? `[RENAMED FROM: ${change.old_path}]` : ''}

${change.diff || 'No diff available'}
`;
              }).join('\n');
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch code changes:', error);
        codeChanges = 'Unable to fetch code changes from GitLab API';
      }
    }

    // Create enhanced review prompt with code snippets
    const systemPrompt = `You are a senior React/JavaScript developer and senior Java developer conducting a code review. 

IMPORTANT: You do not post positive comments. You only focus on identifying issues, problems, and areas for improvement. Your role is to check for good practices and code quality, not to praise what's already working correctly.

Focus exclusively on:
- Code quality issues and violations of best practices
- Potential bugs, errors, or problematic code patterns  
- Security vulnerabilities and concerns
- Performance problems and inefficiencies
- Maintainability issues and code readability problems
- Missing error handling, edge cases, or validation
- Architecture or design flaws
- Code smells and anti-patterns

Do not mention anything that is working correctly or praise good implementations. Only provide critical feedback on what needs to be fixed or improved.`;

    const reviewPrompt = `${systemPrompt}

Please review this merge request and provide feedback:

Title: ${mr.title}
Description: ${mr.description || 'No description provided'}
Source Branch: ${mr.source_branch}
Target Branch: ${mr.target_branch}
Author: ${mr.author_username}

CODE CHANGES:
${codeChanges || 'No code changes available'}

Please provide a comprehensive code review focusing on:
1. Code quality and best practices violations
2. Potential bugs or issues
3. Security considerations
4. Performance implications
5. Maintainability and readability problems

RESPONSE FORMAT:
Provide your response in the following JSON structure:

{
  "summary": "Overall review summary",
  "score": 8,
  "comments": [
    {
      "file_path": "src/example.js",
      "line_number": 15,
      "severity": "error",
      "title": "Issue title",
      "content": "Description of the issue",
      "code_snippet": "// Original problematic code\nconst data = getValue();",
      "suggested_fix": "// Fixed version with proper error handling\nconst data = getValue();\nif (!data) {\n  throw new Error('Data is required');\n}"
    }
  ]
}

Rules:
- severity can be: "critical", "error", "warning", "info"
- line_number should be the actual line number from the code changes
- code_snippet should contain the original problematic code
- suggested_fix should contain the corrected version of the code
- Only include comments for actual issues that need fixing
- Score from 1-10 where 1-3=critical, 4-6=significant, 7-8=minor, 9-10=minimal issues

Provide ONLY the JSON response, no additional text.`;

    let reviewContent = '';
    
    // Call AI API based on provider
    if (provider === 'openai') {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: reviewPrompt.replace(systemPrompt, '').trim() }
          ],
          max_tokens: 4000,
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      reviewContent = response.data.choices[0].message.content;
    } else if (provider === 'anthropic') {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: model,
          max_tokens: 4000,
          messages: [{ role: 'user', content: reviewPrompt }]
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        }
      );
      reviewContent = response.data.content[0].text;
    }

    // Update review record with results
    let extractedScore: number | null = null;
    let parsedResponse: any = null;
    
    // Try to parse JSON response
    try {
      parsedResponse = JSON.parse(reviewContent);
      extractedScore = parsedResponse.score || null;
      
      // Ensure score is within valid range
      if (extractedScore && extractedScore < 1) extractedScore = 1;
      if (extractedScore && extractedScore > 10) extractedScore = 10;
    } catch (parseError) {
      // Fallback to old format if JSON parsing fails
      const scoreMatch = reviewContent.match(/REVIEW SCORE:\s*(\d+(?:\.\d+)?)/i);
      if (scoreMatch) {
        extractedScore = parseFloat(scoreMatch[1]);
        if (extractedScore < 1) extractedScore = 1;
        if (extractedScore > 10) extractedScore = 10;
      }
    }
    
    // Store the main review content (summary or full text)
    const reviewSummary = parsedResponse?.summary || reviewContent;
    
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE ai_reviews 
         SET status = ?, review_content = ?, ai_provider = ?, ai_model = ?, score = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        ['completed', reviewSummary, provider, model, extractedScore, reviewId],
        (err) => err ? reject(err) : resolve(null)
      );
    });
    
    // Store individual comments if available in parsed response
    if (parsedResponse?.comments && Array.isArray(parsedResponse.comments)) {
      for (const comment of parsedResponse.comments) {
        try {
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO review_comments 
               (ai_review_id, file_path, line_number, comment_type, severity, title, content, code_snippet, suggested_fix)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                reviewId,
                comment.file_path || 'unknown',
                comment.line_number || null,
                'suggestion', // comment_type
                comment.severity || 'info',
                comment.title || 'Code Issue',
                comment.content || '',
                comment.code_snippet || '',
                comment.suggested_fix || ''
              ],
              (err) => err ? reject(err) : resolve(null)
            );
          });
        } catch (commentError) {
          console.error('Failed to save comment:', commentError);
        }
      }
    }

    res.json({
      message: 'AI review completed successfully',
      review_id: reviewId,
      status: 'completed'
    });

  } catch (error) {
    // Update review record with error
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE ai_reviews 
         SET status = ?, review_content = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        ['failed', `Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`, reviewId],
        (err) => err ? reject(err) : resolve(null)
      );
    });

    res.json({
      message: 'AI review triggered successfully',
      review_id: reviewId,
      status: 'pending'
    });
  }
}));

// Delete AI review
router.delete('/:id/review/:reviewId', asyncHandler(async (req, res) => {
  const mrId = parseInt(req.params.id);
  const reviewId = parseInt(req.params.reviewId);
  
  // Check if review exists and belongs to the specified MR
  const review = await new Promise<any>((resolve, reject) => {
    db.get(
      'SELECT * FROM ai_reviews WHERE id = ? AND merge_request_id = ?',
      [reviewId, mrId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
  
  if (!review) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }
  
  // Delete the review
  await new Promise<void>((resolve, reject) => {
    db.run(
      'DELETE FROM ai_reviews WHERE id = ? AND merge_request_id = ?',
      [reviewId, mrId],
      (err) => err ? reject(err) : resolve()
    );
  });
  
  res.json({
    message: 'Review deleted successfully'
  });
}));

// Get review statistics
router.get('/stats/summary', asyncHandler(async (req, res) => {
  const stats = await new Promise<any>((resolve, reject) => {
    db.all(
      `SELECT 
        COUNT(*) as total_mrs,
        SUM(CASE WHEN state = 'opened' THEN 1 ELSE 0 END) as open_mrs,
        SUM(CASE WHEN state = 'merged' THEN 1 ELSE 0 END) as merged_mrs,
        SUM(CASE WHEN state = 'closed' THEN 1 ELSE 0 END) as closed_mrs
       FROM merge_requests`,
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0]);
      }
    );
  });
  
  const reviewStats = await new Promise<any>((resolve, reject) => {
    db.all(
      `SELECT 
        COUNT(*) as total_reviews,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_reviews,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_reviews,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_reviews,
        AVG(score) as avg_score
       FROM ai_reviews`,
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0]);
      }
    );
  });
  
  res.json({
    merge_requests: stats,
    reviews: reviewStats
  });
}));

export default router;
