# 🐳 Docker Hub Deployment Guide

This guide shows how to deploy the GitLab PR AI Reviewer to Docker Hub and run it anywhere.

## 📦 Publishing to Docker Hub

### 1. Build the Image
```bash
docker build -t gitlab-pr-ai-reviewer:latest .
```

### 2. Tag for Docker Hub
Replace `yourusername` with your Docker Hub username:
```bash
docker tag gitlab-pr-ai-reviewer:latest yourusername/gitlab-pr-ai-reviewer:latest
docker tag gitlab-pr-ai-reviewer:latest yourusername/gitlab-pr-ai-reviewer:v1.0.0
```

### 3. Login to Docker Hub
```bash
docker login
```

### 4. Push to Docker Hub
```bash
docker push yourusername/gitlab-pr-ai-reviewer:latest
docker push yourusername/gitlab-pr-ai-reviewer:v1.0.0
```

## 🚀 Running the Container

### Basic Run
```bash
docker run -d \
  --name gitlab-ai-reviewer \
  -p 3001:3001 \
  yourusername/gitlab-pr-ai-reviewer:latest
```

### Production Run with Environment Variables
```bash
docker run -d \
  --name gitlab-ai-reviewer \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e GITLAB_URL=https://gitlab.com \
  -e GITLAB_TOKEN=your_gitlab_token \
  -e OPENAI_API_KEY=your_openai_key \
  -e ANTHROPIC_API_KEY=your_anthropic_key \
  -e SQLITECLOUD_URL=your_sqlitecloud_url \
  -e JWT_SECRET=your-super-secret-jwt-key \
  -e SESSION_SECRET=your-session-secret \
  -e REVIEW_AUTO_POST=false \
  -e REVIEW_MIN_SCORE=7 \
  -e REVIEW_MAX_FILES=20 \
  -e REVIEW_MAX_LINES=1000 \
  --restart unless-stopped \
  yourusername/gitlab-pr-ai-reviewer:latest
```

### Using Docker Compose
Create a `docker-compose.yml` file:
```yaml
version: '3.8'

services:
  gitlab-ai-reviewer:
    image: yourusername/gitlab-pr-ai-reviewer:latest
    container_name: gitlab-ai-reviewer
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - GITLAB_URL=https://gitlab.com
      - GITLAB_TOKEN=${GITLAB_TOKEN}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SQLITECLOUD_URL=${SQLITECLOUD_URL}
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - REVIEW_AUTO_POST=false
      - REVIEW_MIN_SCORE=7
      - REVIEW_MAX_FILES=20
      - REVIEW_MAX_LINES=1000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Then run:
```bash
docker-compose up -d
```

## 🔧 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | No | `production` |
| `PORT` | Application port | No | `3001` |
| `GITLAB_URL` | GitLab instance URL | Yes | `https://gitlab.com` |
| `GITLAB_TOKEN` | GitLab access token | Yes | - |
| `OPENAI_API_KEY` | OpenAI API key | No* | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | No* | - |
| `SQLITECLOUD_URL` | SQLiteCloud database URL | Yes | - |
| `JWT_SECRET` | JWT secret key | No | Auto-generated |
| `SESSION_SECRET` | Session secret key | No | Auto-generated |
| `REVIEW_AUTO_POST` | Auto-post reviews to GitLab | No | `false` |
| `REVIEW_MIN_SCORE` | Minimum score to post | No | `7` |
| `REVIEW_MAX_FILES` | Max files to review | No | `20` |
| `REVIEW_MAX_LINES` | Max lines to review | No | `1000` |

*At least one AI provider key is required

## 🌐 Access the Application

Once running, access the application at:
- **Frontend**: http://localhost:3001
- **API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/health

## 🔍 Monitoring and Logs

### View Container Logs
```bash
docker logs gitlab-ai-reviewer
```

### Follow Logs in Real-time
```bash
docker logs -f gitlab-ai-reviewer
```

### Check Container Status
```bash
docker ps
```

### Health Check
```bash
curl http://localhost:3001/health
```

## 🛑 Managing the Container

### Stop the Container
```bash
docker stop gitlab-ai-reviewer
```

### Start the Container
```bash
docker start gitlab-ai-reviewer
```

### Restart the Container
```bash
docker restart gitlab-ai-reviewer
```

### Remove the Container
```bash
docker rm -f gitlab-ai-reviewer
```

### Update to Latest Version
```bash
# Pull latest image
docker pull yourusername/gitlab-pr-ai-reviewer:latest

# Stop and remove old container
docker stop gitlab-ai-reviewer
docker rm gitlab-ai-reviewer

# Run new container
docker run -d \
  --name gitlab-ai-reviewer \
  -p 3001:3001 \
  [environment variables...] \
  yourusername/gitlab-pr-ai-reviewer:latest
```

## 🔧 Troubleshooting

### Container Won't Start
```bash
# Check logs for errors
docker logs gitlab-ai-reviewer

# Check if port is already in use
netstat -tulpn | grep 3001

# Verify environment variables
docker inspect gitlab-ai-reviewer
```

### Database Connection Issues
```bash
# Test SQLiteCloud connection
docker exec gitlab-ai-reviewer curl -f http://localhost:3001/health

# Check environment variables
docker exec gitlab-ai-reviewer env | grep SQLITE
```

### GitLab API Issues
```bash
# Test GitLab token
docker exec gitlab-ai-reviewer curl -H "Authorization: Bearer $GITLAB_TOKEN" https://gitlab.com/api/v4/user
```

## 📋 Example .env File

Create a `.env` file for easy management:
```env
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SQLITECLOUD_URL=sqlitecloud://xxxxxxxxx.sqlite.cloud:8860/database?apikey=xxxxxxxxx
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-session-secret-change-this-in-production
REVIEW_AUTO_POST=false
REVIEW_MIN_SCORE=7
REVIEW_MAX_FILES=20
REVIEW_MAX_LINES=1000
```

Then use with Docker Compose:
```bash
docker-compose --env-file .env up -d
```

## 🌟 Features

- ✅ **Multi-stage Docker build** for optimized image size
- ✅ **Health checks** for monitoring
- ✅ **Non-root user** for security
- ✅ **SQLiteCloud integration** for scalable database
- ✅ **AI-powered code reviews** with OpenAI and Anthropic
- ✅ **GitLab API integration** for automated reviews
- ✅ **React frontend** with modern UI
- ✅ **Comprehensive error handling**
- ✅ **Production-ready configuration**

## 📚 Additional Resources

- [Docker Hub Repository](https://hub.docker.com/r/yourusername/gitlab-pr-ai-reviewer)
- [GitHub Repository](https://github.com/yourusername/ai-generated-app)
- [SQLiteCloud Documentation](https://docs.sqlitecloud.io/)
- [GitLab API Documentation](https://docs.gitlab.com/ee/api/)
