# Docker Development & Production Setup

This project includes a complete Docker setup for both development and production environments, **now with SQLiteCloud integration** for cloud-native database deployment.

## 🚀 Quick Start

### Production Environment (SQLiteCloud)
```bash
# Ensure SQLITECLOUD_URL is set in your .env file
echo "SQLITECLOUD_URL=your-connection-string" >> .env

# Start production environment
docker compose up --build

# Or with nginx reverse proxy
docker compose --profile production up --build
```

### Development Environment
```bash
# Start development environment with hot reload
docker compose --profile dev up --build

# Or using the dev service directly
docker compose up app-dev --build
```

## 🔧 Environment Setup

1. Copy the environment template:
```bash
cp .env.docker .env
```

2. **Add SQLiteCloud configuration**:
```bash
# Required for cloud database
SQLITECLOUD_URL=sqlitecloud://your-connection-string

# Other required variables
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=your-gitlab-token
```

2. Edit `.env` with your configuration:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=your_database_url_here
API_BASE_URL=http://localhost:3000
```

## Docker Services

### App (Production)
- **Image**: Multi-stage optimized build
- **Port**: 3000
- **Features**: Production builds, security hardening, health checks
- **Usage**: `docker-compose --profile production up`

### App-Dev (Development)
- **Image**: Development-optimized build
- **Port**: 5173 (Vite dev server)
- **Features**: Hot reload, volume mounts, dev dependencies
- **Usage**: `docker-compose --profile dev up`

### Nginx (Reverse Proxy)
- **Port**: 80 (maps to app:3000)
- **Features**: Static file serving, compression, security headers
- **Usage**: Included in production profile

## Development Workflow

1. **Start development environment**:
   ```bash
   docker-compose --profile dev up --build
   ```

2. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

3. **Make changes**: Files are mounted as volumes, so changes will trigger hot reload

4. **View logs**:
   ```bash
   docker-compose logs -f app-dev
   ```

## Production Deployment

1. **Build production image**:
   ```bash
   docker-compose --profile production build
   ```

2. **Start production services**:
   ```bash
   docker-compose --profile production up -d
   ```

3. **Access the application**:
   - Application: http://localhost (via nginx)
   - Direct API: http://localhost:3000

## Docker Commands Reference

### Build Commands
```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build app

# Build with no cache
docker-compose build --no-cache
```

### Run Commands
```bash
# Start all services in background
docker-compose up -d

# Start with specific profile
docker-compose --profile dev up

# Start specific service
docker-compose up app-dev

# Follow logs
docker-compose logs -f
```

### Maintenance Commands
```bash
# Stop all services
docker-compose down

# Remove volumes (careful!)
docker-compose down -v

# Clean up images
docker system prune -a

# Shell into running container
docker-compose exec app sh
```

## File Structure

```
├── Dockerfile              # Production multi-stage build
├── Dockerfile.dev          # Development environment
├── docker-compose.yml      # Service orchestration
├── .dockerignore           # Docker ignore patterns
├── nginx.conf              # Nginx configuration
└── .env.docker             # Environment template
```

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   docker-compose down
   # Check what's using the port
   lsof -i :3000
   ```

2. **Permission errors**:
   ```bash
   # Make sure Docker has proper permissions
   sudo usermod -aG docker $USER
   ```

3. **Build failures**:
   ```bash
   # Clear Docker cache
   docker system prune -a
   docker-compose build --no-cache
   ```

### Health Checks

The production container includes health checks:
```bash
# Check container health
docker-compose ps

# View health check logs
docker inspect $(docker-compose ps -q app) | grep -A 10 Health
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Application port | `3000` |
| `DATABASE_URL` | Database connection | SQLite local |
| `API_BASE_URL` | API base URL | `http://localhost:3000` |

## Security Features

- Non-root user in production container
- Minimal Alpine Linux base image
- Security headers via nginx
- No development dependencies in production
- Health checks for monitoring
