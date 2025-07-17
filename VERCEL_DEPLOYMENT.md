# Vercel Deployment Guide

## Quick Setup Steps

### 1. Choose Database Provider

**Option A: Supabase (Recommended - Free tier)**
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get DATABASE_URL from Settings > Database
4. Format: `postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres`

**Option B: Railway ($5/month)**
1. Go to [railway.app](https://railway.app)
2. Create PostgreSQL database
3. Get DATABASE_URL from database settings

### 2. Deploy to Vercel

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select this project

3. **Set Environment Variables** in Vercel Dashboard:
   ```
   DATABASE_URL=your-database-url-here
   OPENAI_API_KEY=your-openai-key-here
   GITLAB_URL=https://your-gitlab-instance.com
   GITLAB_TOKEN=your-gitlab-token-here
   NODE_ENV=production
   ```

4. **Deploy**: Vercel will automatically build and deploy

### 3. Database Schema Migration

After deployment, run this SQL in your PostgreSQL database:

```sql
-- Create tables (converted from SQLite)
-- Run this in your PostgreSQL database console

-- Projects table
CREATE TABLE projects (
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

-- Merge requests table  
CREATE TABLE merge_requests (
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

-- AI reviews table
CREATE TABLE ai_reviews (
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

-- Review comments table
CREATE TABLE review_comments (
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

-- Settings table
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES 
('openai_api_key', ''),
('anthropic_api_key', ''),
('gitlab_url', ''),
('gitlab_token', '');
```

### 4. Your App Will Be Available At:
`https://your-app-name.vercel.app`

### 5. Cost Estimate:
- **Vercel**: Free tier (hobbyist use)
- **Supabase**: Free tier (up to 500MB storage)
- **Total**: $0/month for basic usage

**OR**

- **Vercel**: Free tier
- **Railway DB**: $5/month
- **Total**: $5/month

## Troubleshooting

### Database Connection Issues:
1. Check DATABASE_URL format
2. Ensure SSL is enabled for PostgreSQL
3. Verify firewall allows Vercel IPs

### Build Failures:
1. Check environment variables are set
2. Ensure all dependencies are in package.json
3. Check build logs in Vercel dashboard

### API Errors:
1. Verify OpenAI API key is valid
2. Check GitLab token permissions
3. Ensure database schema is created
