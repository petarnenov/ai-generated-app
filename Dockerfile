# Multi-stage build for GitLab PR AI Reviewer
FROM node:20 AS base

# Install system dependencies for native modules
RUN apt-get update && apt-get install -y \
	python3 \
	make \
	g++ \
	sqlite3 \
	&& rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Development dependencies for building
FROM base AS deps-dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .

# Set environment for build
ENV NODE_ENV=production

# Build frontend and backend
RUN npm run build:frontend
RUN npm run build:backend

# Production image
FROM node:20-slim AS runner
WORKDIR /app

# Install runtime dependencies for SQLite
RUN apt-get update && apt-get install -y \
	sqlite3 \
	curl \
	&& rm -rf /var/lib/apt/lists/*

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Create app user
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs appuser

# Copy built application
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/package.json ./package.json
# Copy local database file if it exists (fallback for development)
RUN touch database.sqlite && chown appuser:nodejs database.sqlite

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "dist/server/index.js"]
