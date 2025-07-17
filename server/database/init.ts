import sqlite3 from 'sqlite3';
import { join } from 'path';

// Mock database for production deployment
const createMockDatabase = () => {
  const mockData = {
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
        namespace: "test-namespace"
      }
    ]
  };

  return {
    all: (sql: string, params: unknown[] = [], callback?: (err: Error | null, rows: unknown[]) => void) => {
      setTimeout(() => {
        try {
          if (sql.includes('COUNT(*)') && sql.includes('merge_requests')) {
            const stats = {
              total_mrs: 1,
              open_mrs: 1,
              merged_mrs: 0,
              closed_mrs: 0
            };
            callback?.(null, [stats]);
          } else if (sql.includes('COUNT(*)') && sql.includes('ai_reviews')) {
            const reviewStats = {
              total_reviews: 0,
              completed_reviews: 0,
              pending_reviews: 0,
              failed_reviews: 0,
              avg_score: 0
            };
            callback?.(null, [reviewStats]);
          } else if (sql.includes('FROM merge_requests')) {
            callback?.(null, mockData.merge_requests);
          } else {
            callback?.(null, []);
          }
        } catch (error) {
          callback?.(error as Error, []);
        }
      }, 10);
    },
    
    get: (sql: string, params: unknown[] = [], callback?: (err: Error | null, row: unknown) => void) => {
      setTimeout(() => {
        try {
          if (sql.includes('FROM merge_requests')) {
            callback?.(null, mockData.merge_requests[0]);
          } else {
            callback?.(null, null);
          }
        } catch (error) {
          callback?.(error as Error, null);
        }
      }, 10);
    },
    
    run: (sql: string, params: unknown[] = [], callback?: (err: Error | null) => void) => {
      setTimeout(() => {
        callback?.(null);
      }, 10);
    },
    
    serialize: (callback: () => void) => {
      callback();
    }
  };
};

// Create database instance based on environment
export const db = process.env.NODE_ENV === 'production' 
  ? {
      ...createMockDatabase(),
      on: (event: string, callback: (error: Error) => void) => {
        // Mock event handler - do nothing in production
      },
      close: (callback?: (error: Error | null) => void) => {
        // Mock close - do nothing in production
        callback?.(null);
      }
    }
  : new sqlite3.Database(join(process.cwd(), 'database.sqlite'));

export const initDatabase = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    console.log('Using mock database for production');
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Projects table
      db.run(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gitlab_project_id INTEGER UNIQUE NOT NULL,
          name TEXT NOT NULL,
          namespace TEXT NOT NULL,
          web_url TEXT NOT NULL,
          default_branch TEXT NOT NULL,
          webhook_token TEXT,
          ai_enabled BOOLEAN DEFAULT 1,
          ai_provider TEXT DEFAULT 'openai',
          ai_model TEXT DEFAULT 'gpt-4',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Merge requests table
      db.run(`
        CREATE TABLE IF NOT EXISTS merge_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          gitlab_mr_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          source_branch TEXT NOT NULL,
          target_branch TEXT NOT NULL,
          author_username TEXT NOT NULL,
          state TEXT NOT NULL,
          web_url TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects (id),
          UNIQUE(project_id, gitlab_mr_id)
        )
      `);

      // AI reviews table
      db.run(`
        CREATE TABLE IF NOT EXISTS ai_reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          merge_request_id INTEGER NOT NULL,
          review_type TEXT NOT NULL, -- 'code', 'security', 'performance', 'general'
          ai_provider TEXT NOT NULL,
          ai_model TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
          review_content TEXT,
          suggestions TEXT, -- JSON array of suggestions
          score INTEGER, -- 1-10 rating
          files_reviewed INTEGER DEFAULT 0,
          lines_reviewed INTEGER DEFAULT 0,
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (merge_request_id) REFERENCES merge_requests (id)
        )
      `);

      // Review comments table
      db.run(`
        CREATE TABLE IF NOT EXISTS review_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ai_review_id INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          line_number INTEGER,
          comment_type TEXT NOT NULL, -- 'suggestion', 'issue', 'question', 'praise'
          severity TEXT NOT NULL, -- 'info', 'warning', 'error', 'critical'
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          code_snippet TEXT,
          suggested_fix TEXT,
          gitlab_discussion_id TEXT,
          posted_to_gitlab BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (ai_review_id) REFERENCES ai_reviews (id)
        )
      `);

      // Settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert default settings
      db.run(`
        INSERT OR IGNORE INTO settings (key, value, description) VALUES
        ('gitlab_url', '', 'GitLab instance URL'),
        ('gitlab_token', '', 'GitLab API token'),
        ('openai_api_key', '', 'OpenAI API key'),
        ('anthropic_api_key', '', 'Anthropic API key'),
        ('review_auto_post', 'false', 'Automatically post reviews to GitLab'),
        ('review_min_score', '7', 'Minimum score to auto-approve'),
        ('review_max_files', '20', 'Maximum files to review per MR'),
        ('review_max_lines', '1000', 'Maximum lines to review per file')
      `);

      console.log('✅ Database initialized successfully');
      resolve();
    });

    db.on('error', (error) => {
      console.error('❌ Database error:', error);
      reject(error);
    });
  });
};

export const closeDatabase = (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Mock database connection closed');
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    (db as any).close((error: Error | null) => {
      if (error) {
        reject(error);
      } else {
        console.log('✅ Database connection closed');
        resolve();
      }
    });
  });
};
