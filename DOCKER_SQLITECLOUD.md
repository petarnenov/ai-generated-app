# 🐳 Docker with SQLiteCloud Configuration

## Overview

The Docker configuration has been updated to use **SQLiteCloud** instead of local SQLite database files. This enables fully cloud-native deployments without requiring local database storage.

## 🔧 Configuration Changes

### Docker Compose Updates

The `docker-compose.yml` has been modified to:

1. **✅ Added SQLiteCloud environment variable** to both production and development services
2. **✅ Removed local database volume mount** - no longer needed
3. **✅ Maintained all other functionality** - logging, health checks, networking

### Dockerfile Updates

The `Dockerfile` has been optimized for cloud database usage:

1. **✅ Removed mandatory database.sqlite copying**
2. **✅ Creates empty database.sqlite as fallback** (for development scenarios)
3. **✅ Maintains SQLite3 runtime dependencies** (for backup/migration tools)

## 🚀 Usage

### Production Deployment

```bash
# 1. Ensure your .env file has SQLITECLOUD_URL set
echo "SQLITECLOUD_URL=sqlitecloud://your-connection-string" >> .env

# 2. Start production containers
docker compose up -d app

# 3. Check logs
docker compose logs -f app
```

### Development with Docker

```bash
# Start development container with hot reload
docker compose --profile dev up -d app-dev

# View logs
docker compose logs -f app-dev
```

### Full Stack with Nginx (Production)

```bash
# Start complete production stack
docker compose --profile production up -d

# This starts:
# - app (SQLiteCloud-enabled)
# - nginx (reverse proxy)
```

## 📊 Environment Variables

The Docker containers now use these database-related environment variables:

| Variable | Purpose | Required |
|----------|---------|----------|
| `SQLITECLOUD_URL` | Cloud database connection string | **Yes** for production |
| `NODE_ENV` | Environment mode (`production` or `development`) | **Yes** |

### Example Environment Setup

```bash
# Required for SQLiteCloud
SQLITECLOUD_URL=sqlitecloud://cuogqqo8nk.g4.sqlite.cloud:8860/chinook.sqlite?apikey=your-api-key

# Application environment
NODE_ENV=production
PORT=3001

# GitLab integration
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=your-gitlab-token

# AI providers
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## 🏗️ Database Behavior in Docker

### Automatic Database Selection

The application automatically chooses the database based on environment:

```typescript
// Priority order:
1. SQLiteCloud (if SQLITECLOUD_URL is set)
2. Local SQLite (if database.sqlite exists)
3. Mock data (fallback for demos)
```

### Container Database Logic

| Scenario | Database Used | Notes |
|----------|---------------|-------|
| **Production** (`NODE_ENV=production`) | SQLiteCloud | Requires `SQLITECLOUD_URL` |
| **Development** (`NODE_ENV=development`) | Local SQLite or SQLiteCloud | Based on available configuration |
| **No Configuration** | Mock data | Safe fallback mode |

## 🔍 Troubleshooting

### Common Issues

**1. Container fails to start**
```bash
# Check if SQLITECLOUD_URL is set
docker compose config

# View detailed logs
docker compose logs app
```

**2. Database connection errors**
```bash
# Test cloud connection from container
docker compose exec app npm run test:cloud

# Check environment variables
docker compose exec app env | grep SQLITE
```

**3. Missing database tables**
```bash
# Run migration inside container
docker compose exec app npm run migrate:sqlitecloud
```

### Health Checks

The containers include health checks:

```bash
# Check container health
docker compose ps

# Manual health check
curl http://localhost:3001/health
```

## 📁 File Structure Changes

### Removed/Modified

- ❌ `./database.sqlite:/app/database.sqlite` volume mount (removed)
- ✅ `COPY database.sqlite` (made optional in Dockerfile)

### Added

- ✅ `SQLITECLOUD_URL` environment variable in both services
- ✅ Cloud database configuration documentation

## 🎯 Deployment Platforms

This Docker configuration works with:

### Railway
```bash
# Deploy to Railway
railway up
# Ensure SQLITECLOUD_URL is set in Railway environment
```

### Vercel (with Docker)
```bash
# Build and deploy
vercel --docker
```

### AWS/GCP/Azure
```bash
# Build and push to container registry
docker build -t your-registry/gitlab-pr-ai:latest .
docker push your-registry/gitlab-pr-ai:latest
```

### Local Development
```bash
# Development with live reload
docker compose --profile dev up

# Production-like local testing
docker compose up
```

## 🎊 Benefits

### Cloud-Native Architecture
- ✅ **No local storage dependencies**
- ✅ **Horizontal scaling ready**
- ✅ **Stateless containers**
- ✅ **Global database access**

### Operational Advantages
- ✅ **Simplified deployments** (no database volume management)
- ✅ **Consistent data** across all container instances
- ✅ **Automatic backups** via SQLiteCloud
- ✅ **Enterprise-grade reliability**

### Development Benefits
- ✅ **Same database** for development and production
- ✅ **Easy container updates** (no data migration needed)
- ✅ **Team collaboration** with shared cloud database
- ✅ **Simplified CI/CD** pipelines

---

Your Docker configuration is now **production-ready** with SQLiteCloud integration! 🚀

The containers will automatically use your cloud database, providing global scalability and enterprise-grade reliability.
