// Mock database for Vercel deployment when real database is not available
export const mockDatabase = {
  // Mock data for testing
  projects: [
    {
      id: 1,
      gitlab_project_id: 123,
      name: "Test Project",
      namespace: "test-namespace",
      web_url: "https://gitlab.com/test/project",
      default_branch: "main",
      ai_enabled: true,
      ai_provider: "openai",
      ai_model: "gpt-4"
    }
  ],
  
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

// Database interface for consistent API
interface DatabaseInterface {
  all(sql: string, params?: any[], callback?: (err: Error | null, rows: any[]) => void): void;
  get(sql: string, params?: any[], callback?: (err: Error | null, row: any) => void): void;
  run(sql: string, params?: any[], callback?: (err: Error | null) => void): void;
  serialize(callback: () => void): void;
}

class MockDatabase implements DatabaseInterface {
  all(sql: string, params: any[] = [], callback?: (err: Error | null, rows: any[]) => void): void {
    try {
      console.log('Mock DB Query:', sql, params);
      
      // Simple query parsing for common patterns
      if (sql.includes('FROM merge_requests') && sql.includes('COUNT(*)')) {
        // Stats query
        const stats = {
          total_mrs: this.mockDatabase.merge_requests.length,
          open_mrs: this.mockDatabase.merge_requests.filter(mr => mr.state === 'opened').length,
          merged_mrs: this.mockDatabase.merge_requests.filter(mr => mr.state === 'merged').length,
          closed_mrs: this.mockDatabase.merge_requests.filter(mr => mr.state === 'closed').length
        };
        callback?.(null, [stats]);
      } else if (sql.includes('FROM ai_reviews') && sql.includes('COUNT(*)')) {
        // Review stats query
        const reviewStats = {
          total_reviews: this.mockDatabase.ai_reviews.length,
          completed_reviews: this.mockDatabase.ai_reviews.filter(r => r.status === 'completed').length,
          pending_reviews: this.mockDatabase.ai_reviews.filter(r => r.status === 'pending').length,
          failed_reviews: this.mockDatabase.ai_reviews.filter(r => r.status === 'failed').length,
          avg_score: this.mockDatabase.ai_reviews.reduce((sum, r) => sum + (r.score || 0), 0) / this.mockDatabase.ai_reviews.length
        };
        callback?.(null, [reviewStats]);
      } else if (sql.includes('FROM merge_requests')) {
        // Regular merge requests query
        callback?.(null, this.mockDatabase.merge_requests);
      } else if (sql.includes('FROM ai_reviews')) {
        // AI reviews query
        callback?.(null, this.mockDatabase.ai_reviews);
      } else {
        callback?.(null, []);
      }
    } catch (error) {
      callback?.(error as Error, []);
    }
  }

  get(sql: string, params: any[] = [], callback?: (err: Error | null, row: any) => void): void {
    try {
      console.log('Mock DB Get:', sql, params);
      
      if (sql.includes('FROM merge_requests')) {
        callback?.(null, this.mockDatabase.merge_requests[0]);
      } else if (sql.includes('FROM projects')) {
        callback?.(null, this.mockDatabase.projects[0]);
      } else if (sql.includes('FROM ai_reviews')) {
        callback?.(null, this.mockDatabase.ai_reviews[0]);
      } else {
        callback?.(null, null);
      }
    } catch (error) {
      callback?.(error as Error, null);
    }
  }

  run(sql: string, params: any[] = [], callback?: (err: Error | null) => void): void {
    try {
      console.log('Mock DB Run:', sql, params);
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
    }
  }

  serialize(callback: () => void): void {
    callback();
  }

  private mockDatabase = mockDatabase;
}

// Create database instance
let dbInstance: DatabaseInterface;

try {
  if (process.env.NODE_ENV === 'production') {
    console.log('Using mock database for production deployment');
    dbInstance = new MockDatabase();
  } else {
    // Use SQLite for local development
    const sqlite3 = require('sqlite3');
    const { join } = require('path');
    const dbPath = join(process.cwd(), 'database.sqlite');
    dbInstance = new sqlite3.Database(dbPath);
  }
} catch (error) {
  console.error('Database initialization failed, using mock database:', error);
  dbInstance = new MockDatabase();
}

export const db = dbInstance;

export const initDatabase = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    console.log('Mock database initialized');
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Only run actual database initialization in development
      resolve();
    });
  });
};
