import { Client } from 'pg';
import sqlite3 from 'sqlite3';
import { join } from 'path';

// Database interface to abstract SQLite and PostgreSQL
interface DatabaseInterface {
  all(sql: string, params?: any[]): Promise<any[]>;
  get(sql: string, params?: any[]): Promise<any>;
  run(sql: string, params?: any[]): Promise<any>;
  serialize(callback: () => void): void;
}

class PostgreSQLWrapper implements DatabaseInterface {
  private client: Client;

  constructor(connectionString: string) {
    this.client = new Client({ connectionString });
    this.client.connect();
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    const result = await this.client.query(sql, params);
    return result.rows;
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    const result = await this.client.query(sql, params);
    return result.rows[0];
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    const result = await this.client.query(sql, params);
    return result;
  }

  serialize(callback: () => void): void {
    // PostgreSQL doesn't need serialization like SQLite
    callback();
  }
}

class SQLiteWrapper implements DatabaseInterface {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
  }

  all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  run(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  serialize(callback: () => void): void {
    this.db.serialize(callback);
  }
}

// Create database instance based on environment
export const createDatabase = (): DatabaseInterface => {
  if (process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
    return new PostgreSQLWrapper(process.env.DATABASE_URL);
  } else {
    const dbPath = join(process.cwd(), 'database.sqlite');
    return new SQLiteWrapper(dbPath);
  }
};

export const db = createDatabase();

// Convert SQLite SQL to PostgreSQL compatible SQL
const convertSqlToPostgreSQL = (sql: string): string => {
  return sql
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
    .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
    .replace(/BOOLEAN DEFAULT 1/g, 'BOOLEAN DEFAULT TRUE')
    .replace(/BOOLEAN DEFAULT 0/g, 'BOOLEAN DEFAULT FALSE');
};

export const initDatabase = async (): Promise<void> => {
  const isPostgreSQL = process.env.DATABASE_URL && process.env.NODE_ENV === 'production';
  
  const createProjectsTable = `
    CREATE TABLE IF NOT EXISTS projects (
      id ${isPostgreSQL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      gitlab_project_id INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      namespace TEXT NOT NULL,
      web_url TEXT NOT NULL,
      default_branch TEXT NOT NULL,
      webhook_token TEXT,
      ai_enabled BOOLEAN DEFAULT ${isPostgreSQL ? 'TRUE' : '1'},
      ai_provider TEXT DEFAULT 'openai',
      ai_model TEXT DEFAULT 'gpt-4',
      created_at ${isPostgreSQL ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
      updated_at ${isPostgreSQL ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createMergeRequestsTable = `
    CREATE TABLE IF NOT EXISTS merge_requests (
      id ${isPostgreSQL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      project_id INTEGER NOT NULL,
      gitlab_mr_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      source_branch TEXT NOT NULL,
      target_branch TEXT NOT NULL,
      author_username TEXT NOT NULL,
      state TEXT NOT NULL,
      web_url TEXT NOT NULL,
      created_at ${isPostgreSQL ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
      updated_at ${isPostgreSQL ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id),
      UNIQUE(project_id, gitlab_mr_id)
    )
  `;

  const createAiReviewsTable = `
    CREATE TABLE IF NOT EXISTS ai_reviews (
      id ${isPostgreSQL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      merge_request_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      review_data TEXT NOT NULL,
      score REAL,
      status TEXT DEFAULT 'pending',
      created_at ${isPostgreSQL ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
      updated_at ${isPostgreSQL ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merge_request_id) REFERENCES merge_requests (id)
    )
  `;

  try {
    await db.run(createProjectsTable);
    await db.run(createMergeRequestsTable);
    await db.run(createAiReviewsTable);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};
