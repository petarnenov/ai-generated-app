import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../../database.sqlite');

export const db = new sqlite3.Database(dbPath);

export const initDatabase = async (): Promise<void> => {
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
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
      } else {
        console.log('✅ Database connection closed');
        resolve();
      }
    });
  });
};
