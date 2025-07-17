import sqlite3 from 'sqlite3';
import { join } from 'path';
import { SQLiteCloudDatabase } from './sqlitecloud.js';

// Database interface for compatibility
export interface DatabaseInterface {
  all(sql: string, params?: unknown[], callback?: (err: Error | null, rows: unknown[]) => void): void | Promise<unknown[]>;
  get(sql: string, params?: unknown[], callback?: (err: Error | null, row: unknown) => void): void | Promise<unknown | null>;
  run(sql: string, params?: unknown[], callback?: (err: Error | null) => void): void | Promise<void>;
  serialize(callback: () => void): void;
  on?(event: string, callback: (error: Error) => void): void;
  close?(callback?: (error: Error | null) => void): void;
}

// Wrapper class to provide sqlite3-compatible interface for SQLiteCloud
class SQLiteCloudWrapper implements DatabaseInterface {
  private cloudDb: SQLiteCloudDatabase;

  constructor(connectionString: string) {
    this.cloudDb = new SQLiteCloudDatabase(connectionString);
  }

  async connect(): Promise<void> {
    await this.cloudDb.connect();
  }

  async disconnect(): Promise<void> {
    await this.cloudDb.disconnect();
  }

  all(sql: string, params: unknown[] = [], callback?: (err: Error | null, rows: unknown[]) => void): void | Promise<unknown[]> {
    if (callback) {
      // Callback-style (sqlite3 compatibility)
      this.cloudDb.all(sql, params)
        .then(rows => callback(null, rows))
        .catch(error => callback(error as Error, []));
    } else {
      // Promise-style
      return this.cloudDb.all(sql, params);
    }
  }

  get(sql: string, params: unknown[] = [], callback?: (err: Error | null, row: unknown) => void): void | Promise<unknown | null> {
    if (callback) {
      // Callback-style (sqlite3 compatibility)
      this.cloudDb.get(sql, params)
        .then(row => callback(null, row))
        .catch(error => callback(error as Error, null));
    } else {
      // Promise-style
      return this.cloudDb.get(sql, params);
    }
  }

  run(sql: string, params: unknown[] = [], callback?: (err: Error | null) => void): void | Promise<void> {
    if (callback) {
      // Callback-style (sqlite3 compatibility)
      this.cloudDb.run(sql, params)
        .then(() => callback(null))
        .catch(error => callback(error as Error));
    } else {
      // Promise-style
      return this.cloudDb.run(sql, params);
    }
  }

  serialize(callback: () => void): void {
    // For SQLiteCloud, we don't need to serialize, just execute
    callback();
  }

  // Mock event handler for compatibility
  on(event: string, callback: (error: Error) => void): void {
    // SQLiteCloud doesn't have event emitters like sqlite3
    // This is just for compatibility
  }

  // Mock close for compatibility
  close(callback?: (error: Error | null) => void): void {
    this.cloudDb.disconnect()
      .then(() => callback?.(null))
      .catch(error => callback?.(error as Error));
  }
}

// Mock database for fallback
const createMockDatabase = (): DatabaseInterface => {
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
    all: (sql: string, _params: unknown[] = [], callback?: (err: Error | null, rows: unknown[]) => void) => {
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
    
    get: (sql: string, _params: unknown[] = [], callback?: (err: Error | null, row: unknown) => void) => {
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
    
    run: (sql: string, _params: unknown[] = [], callback?: (err: Error | null) => void) => {
      setTimeout(() => {
        callback?.(null);
      }, 10);
    },
    
    serialize: (callback: () => void) => {
      callback();
    },

    on: (_event: string, _callback: (error: Error) => void) => {
      // Mock event handler - do nothing
    },

    close: (callback?: (error: Error | null) => void) => {
      // Mock close - do nothing
      callback?.(null);
    }
  };
};

// Wrapper for sqlite3 to make it compatible with our interface
class SQLite3Wrapper implements DatabaseInterface {
  private sqliteDb: sqlite3.Database;

  constructor(filename: string) {
    this.sqliteDb = new sqlite3.Database(filename);
  }

  all(sql: string, params: unknown[] = [], callback?: (err: Error | null, rows: unknown[]) => void): void {
    if (callback) {
      this.sqliteDb.all(sql, params, callback);
    } else {
      this.sqliteDb.all(sql, params);
    }
  }

  get(sql: string, params: unknown[] = [], callback?: (err: Error | null, row: unknown) => void): void {
    if (callback) {
      this.sqliteDb.get(sql, params, callback);
    } else {
      this.sqliteDb.get(sql, params);
    }
  }

  run(sql: string, params: unknown[] = [], callback?: (err: Error | null) => void): void {
    if (callback) {
      this.sqliteDb.run(sql, params, callback);
    } else {
      this.sqliteDb.run(sql, params);
    }
  }

  serialize(callback: () => void): void {
    this.sqliteDb.serialize(callback);
  }

  on(event: string, callback: (error: Error) => void): void {
    this.sqliteDb.on(event, callback);
  }

  close(callback?: (error: Error | null) => void): void {
    this.sqliteDb.close(callback);
  }
}

// Create database instance based on configuration
const createDatabase = (): DatabaseInterface => {
  const sqliteCloudUrl = process.env.SQLITECLOUD_URL;
  
  if (sqliteCloudUrl) {
    console.log('🌩️ Using SQLiteCloud database');
    return new SQLiteCloudWrapper(sqliteCloudUrl);
  } else if (process.env.NODE_ENV === 'production') {
    console.log('📦 Using mock database for production (no SQLiteCloud URL provided)');
    return createMockDatabase();
  } else {
    console.log('💾 Using local SQLite database for development');
    return new SQLite3Wrapper(join(process.cwd(), 'database.sqlite'));
  }
};

// Global database instance
export const db = createDatabase();

export const initDatabase = async (): Promise<void> => {
  // Initialize cloud connection first
  if (db instanceof SQLiteCloudWrapper) {
    await db.connect();
  }

  // If using mock database, skip schema creation
  if (process.env.NODE_ENV === 'production' && !process.env.SQLITECLOUD_URL) {
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
      `, [], (err) => {
        if (err) {
          console.error('❌ Database initialization error:', err);
          reject(err);
        } else {
          console.log('✅ Database initialized successfully');
          resolve();
        }
      });
    });

    // Handle database errors
    if (db.on) {
      db.on('error', (error) => {
        console.error('❌ Database error:', error);
        reject(error);
      });
    }
  });
};

export const closeDatabase = async (): Promise<void> => {
  if (db instanceof SQLiteCloudWrapper) {
    await db.disconnect();
    return;
  }
  
  if (process.env.NODE_ENV === 'production' && !process.env.SQLITECLOUD_URL) {
    console.log('✅ Mock database connection closed');
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    if (db.close) {
      db.close((error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          console.log('✅ Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};
