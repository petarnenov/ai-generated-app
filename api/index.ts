import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock database for Vercel deployment
const mockDatabase = {
  merge_requests: [
    {
      id: 1,
      project_id: 1,
      gitlab_mr_id: 1,
      title: "Sample Merge Request",
      description: "This is a sample merge request for testing",
      source_branch: "feature/test",
      target_branch: "main",
      author_username: "testuser",
      state: "opened",
      web_url: "https://gitlab.com/test/project/-/merge_requests/1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      project_name: "Test Project",
      namespace: "test-namespace",
      project_url: "https://gitlab.com/test/project"
    }
  ],
  
  ai_reviews: [
    {
      id: 1,
      merge_request_id: 1,
      provider: "openai",
      model: "gpt-4",
      review_data: JSON.stringify({
        summary: "This is a test review",
        suggestions: ["Test suggestion 1", "Test suggestion 2"],
        score: 85
      }),
      score: 85,
      status: "completed",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

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
    const { url, method } = req;
    
    // Parse the API path
    const path = url?.replace('/api', '') || '';
    
    console.log(`API Request: ${method} ${path}`);

    // Handle different API endpoints
    if (path.startsWith('/pr/stats/summary')) {
      // Statistics endpoint
      const stats = {
        merge_requests: {
          total_mrs: mockDatabase.merge_requests.length,
          open_mrs: mockDatabase.merge_requests.filter(mr => mr.state === 'opened').length,
          merged_mrs: mockDatabase.merge_requests.filter(mr => mr.state === 'merged').length,
          closed_mrs: mockDatabase.merge_requests.filter(mr => mr.state === 'closed').length
        },
        reviews: {
          total_reviews: mockDatabase.ai_reviews.length,
          completed_reviews: mockDatabase.ai_reviews.filter(r => r.status === 'completed').length,
          pending_reviews: mockDatabase.ai_reviews.filter(r => r.status === 'pending').length,
          failed_reviews: mockDatabase.ai_reviews.filter(r => r.status === 'failed').length,
          avg_score: mockDatabase.ai_reviews.reduce((sum, r) => sum + (r.score || 0), 0) / mockDatabase.ai_reviews.length
        }
      };
      
      res.status(200).json(stats);
      return;
    }
    
    if (path.startsWith('/pr') && method === 'GET') {
      // Merge requests endpoint
      const { per_page = '20', state } = req.query;
      
      let results = mockDatabase.merge_requests;
      
      if (state && state !== 'all') {
        results = results.filter(mr => mr.state === state);
      }
      
      // Apply pagination
      const limit = parseInt(per_page as string);
      results = results.slice(0, limit);
      
      res.status(200).json({ merge_requests: results });
      return;
    }
    
    if (path.startsWith('/gitlab')) {
      // GitLab endpoints - return empty for now
      res.status(200).json({ projects: [] });
      return;
    }
    
    if (path.startsWith('/ai')) {
      // AI endpoints - return empty for now
      res.status(200).json({ message: 'AI endpoint not configured in demo mode' });
      return;
    }
    
    // Default response for unknown endpoints
    res.status(404).json({ error: 'Endpoint not found' });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
