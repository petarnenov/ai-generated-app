import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// TypeScript interfaces
interface MergeRequest {
  id: number;
  title: string;
  state: 'opened' | 'merged' | 'closed';
  author: string;
  created_at: string;
  updated_at: string;
  target_branch: string;
  source_branch: string;
  description?: string;
  project_id?: number;
}

interface Review {
  id: number;
  merge_request_id: number;
  status: 'pending' | 'completed' | 'failed';
  score?: number;
  feedback?: string;
  created_at: string;
  updated_at: string;
}

// Environment variables
const GITLAB_URL = process.env.GITLAB_URL || 'https://gitlab.com';
const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:7103041524Kanatunta$@db.pphxnusfobkgkyvrkrku.supabase.co:5432/postgres';

// Initialize PostgreSQL pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('supabase.co') ? { rejectUnauthorized: false } : false
});

// Database helper functions
async function getMergeRequestsFromDB(): Promise<MergeRequest[]> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          mr.*,
          p.name as project_name,
          p.web_url as project_web_url
        FROM merge_requests mr
        LEFT JOIN projects p ON mr.project_id = p.id
        ORDER BY mr.updated_at DESC
        LIMIT 50
      `);
      
      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        state: row.state,
        author: row.author,
        created_at: row.created_at,
        updated_at: row.updated_at,
        target_branch: row.target_branch,
        source_branch: row.source_branch,
        description: row.description,
        project_id: row.project_id
      }));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    return [];
  }
}

async function getReviewsFromDB(): Promise<Review[]> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT *
        FROM ai_reviews
        ORDER BY created_at DESC
        LIMIT 100
      `);
      
      return result.rows.map(row => ({
        id: row.id,
        merge_request_id: row.merge_request_id,
        status: row.status,
        score: row.score,
        feedback: row.feedback,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('API Request received:', {
      method: req.method,
      url: req.url,
      query: req.query,
      gitlabConfigured: !!GITLAB_TOKEN
    });

    const { url, method } = req;
    
    // Parse the API path - remove /api prefix
    const path = url?.replace('/api', '') || '';
    
    console.log(`Processing: ${method} ${path}`);

    // Handle different API endpoints
    if (path === '/pr/stats/summary' || path.startsWith('/pr/stats/summary')) {
      console.log('Handling stats request');
      
      // Get data from Supabase
      const mergeRequests = await getMergeRequestsFromDB();
      const reviews = await getReviewsFromDB();
      
      // Statistics endpoint
      const stats = {
        merge_requests: {
          total_mrs: mergeRequests.length,
          open_mrs: mergeRequests.filter((mr: MergeRequest) => mr.state === 'opened').length,
          merged_mrs: mergeRequests.filter((mr: MergeRequest) => mr.state === 'merged').length,
          closed_mrs: mergeRequests.filter((mr: MergeRequest) => mr.state === 'closed').length
        },
        reviews: {
          total_reviews: reviews.length,
          completed_reviews: reviews.filter((r: Review) => r.status === 'completed').length,
          pending_reviews: reviews.filter((r: Review) => r.status === 'pending').length,
          failed_reviews: reviews.filter((r: Review) => r.status === 'failed').length,
          avg_score: reviews.length > 0 
            ? reviews.reduce((sum: number, r: Review) => sum + (r.score || 0), 0) / reviews.length 
            : 0
        },
        data_source: 'postgresql_direct',
        gitlab_configured: !!GITLAB_TOKEN,
        gitlab_url: GITLAB_URL
      };
      
      console.log('Returning stats:', stats);
      res.status(200).json(stats);
      return;
    }
    
    if (path.startsWith('/pr') && method === 'GET') {
      console.log('Handling merge requests');
      
      // Merge requests endpoint
      const { per_page = '20', state } = req.query;
      
      // Get merge requests from Supabase
      let results = await getMergeRequestsFromDB();
      
      if (state && state !== 'all') {
        results = results.filter((mr: MergeRequest) => mr.state === state);
      }
      
      // Apply pagination
      const limit = parseInt(per_page as string);
      results = results.slice(0, limit);
      
      console.log('Returning merge requests:', results.length);
      res.status(200).json({ 
        merge_requests: results,
        data_source: 'postgresql_direct'
      });
      return;
    }
    
    if (path.startsWith('/gitlab')) {
      console.log('Handling GitLab request');
      res.status(200).json({ projects: [] });
      return;
    }
    
    if (path.startsWith('/ai')) {
      console.log('Handling AI request');
      res.status(200).json({ message: 'AI endpoint not configured in demo mode' });
      return;
    }
    
    // Handle root API request
    if (path === '' || path === '/') {
      console.log('Handling root API request');
      res.status(200).json({ 
        message: 'GitLab AI Code Reviewer API',
        version: '1.0.0',
        endpoints: ['/pr', '/pr/stats/summary', '/gitlab', '/ai']
      });
      return;
    }
    
    // Default response for unknown endpoints
    console.log('Unknown endpoint:', path);
    res.status(404).json({ 
      error: 'Endpoint not found',
      path: path,
      method: method
    });
    
  } catch (error) {
    console.error('API Error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};
