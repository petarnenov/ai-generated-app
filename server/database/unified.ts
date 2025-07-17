import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

// Database configuration
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

let db: any;
let dbType: 'sqlite' | 'postgres';

if (isProduction && databaseUrl) {
  // PostgreSQL for production (Vercel)
  dbType = 'postgres';
  db = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // SQLite for development
  dbType = 'sqlite';
  db = new sqlite3.Database('./database.sqlite');
}

// Unified database interface
export const query = async (sql: string, params: any[] = []): Promise<any[]> => {
  if (dbType === 'postgres') {
    const client = await db.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  } else {
    // SQLite
    const all = promisify(db.all.bind(db));
    return await all(sql, params);
  }
};

export const queryOne = async (sql: string, params: any[] = []): Promise<any> => {
  if (dbType === 'postgres') {
    const client = await db.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  } else {
    // SQLite
    const get = promisify(db.get.bind(db));
    return await get(sql, params);
  }
};

export const execute = async (sql: string, params: any[] = []): Promise<any> => {
  if (dbType === 'postgres') {
    const client = await db.connect();
    try {
      const result = await client.query(sql, params);
      return { lastID: result.rows[0]?.id, changes: result.rowCount };
    } finally {
      client.release();
    }
  } else {
    // SQLite
    const run = promisify(db.run.bind(db));
    return await run(sql, params);
  }
};

export { db, dbType };
