#!/usr/bin/env node

// Database Migration Script for PostgreSQL
// Run this after setting up your PostgreSQL database

import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

const migrations = [
  `
  CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    namespace VARCHAR(255),
    gitlab_project_id INTEGER,
    web_url TEXT,
    ai_provider VARCHAR(50) DEFAULT 'openai',
    ai_model VARCHAR(100) DEFAULT 'gpt-4',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS merge_requests (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    gitlab_mr_id INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    source_branch VARCHAR(255),
    target_branch VARCHAR(255),
    author_username VARCHAR(255),
    state VARCHAR(50) DEFAULT 'opened',
    web_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS ai_reviews (
    id SERIAL PRIMARY KEY,
    merge_request_id INTEGER REFERENCES merge_requests(id) ON DELETE CASCADE,
    review_type VARCHAR(100) DEFAULT 'general',
    ai_provider VARCHAR(50) NOT NULL,
    ai_model VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    review_content TEXT,
    score INTEGER CHECK (score >= 1 AND score <= 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS review_comments (
    id SERIAL PRIMARY KEY,
    ai_review_id INTEGER REFERENCES ai_reviews(id) ON DELETE CASCADE,
    file_path VARCHAR(500),
    line_number INTEGER,
    comment_type VARCHAR(100) DEFAULT 'suggestion',
    severity VARCHAR(50) DEFAULT 'info',
    title VARCHAR(500),
    content TEXT,
    code_snippet TEXT,
    suggested_fix TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  INSERT INTO settings (key, value) 
  VALUES 
    ('openai_api_key', ''),
    ('anthropic_api_key', ''),
    ('gitlab_url', ''),
    ('gitlab_token', '')
  ON CONFLICT (key) DO NOTHING;
  `
];

async function runMigrations() {
  console.log('🚀 Running database migrations...');
  
  const client = await pool.connect();
  
  try {
    for (let i = 0; i < migrations.length; i++) {
      console.log(`📋 Running migration ${i + 1}/${migrations.length}...`);
      await client.query(migrations[i]);
    }
    
    console.log('✅ All migrations completed successfully!');
    console.log('🎉 Database is ready for your GitLab AI Code Reviewer app');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
