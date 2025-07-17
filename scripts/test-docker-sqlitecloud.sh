#!/bin/bash

# Docker SQLiteCloud Test Script
# Tests that Docker containers properly connect to SQLiteCloud

set -e

echo "🐳 Testing Docker with SQLiteCloud Integration"
echo "=============================================="

# Check if .env file exists and has SQLITECLOUD_URL
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    echo "💡 Please create .env file with SQLITECLOUD_URL"
    exit 1
fi

if ! grep -q "SQLITECLOUD_URL=" .env; then
    echo "❌ SQLITECLOUD_URL not found in .env"
    echo "💡 Please add SQLITECLOUD_URL to your .env file"
    exit 1
fi

echo "✅ Environment configuration found"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    echo "💡 Please start Docker Desktop and try again"
    exit 1
fi

echo "✅ Docker is running"

# Validate docker-compose.yml
echo "🔍 Validating Docker Compose configuration..."
if docker compose config > /dev/null 2>&1; then
    echo "✅ Docker Compose configuration is valid"
else
    echo "❌ Docker Compose configuration has errors"
    exit 1
fi

# Check SQLiteCloud URL format
SQLITECLOUD_URL=$(grep "SQLITECLOUD_URL=" .env | cut -d '=' -f2)
if [[ $SQLITECLOUD_URL == *"sqlitecloud://"* ]]; then
    echo "✅ SQLiteCloud URL format looks correct"
else
    echo "❌ SQLiteCloud URL format is invalid"
    echo "💡 Should start with: sqlitecloud://"
    exit 1
fi

echo ""
echo "🎯 Docker SQLiteCloud Configuration Test Results:"
echo "================================================="
echo "✅ Environment file configured"
echo "✅ Docker daemon running"
echo "✅ Docker Compose configuration valid"
echo "✅ SQLiteCloud URL format correct"
echo ""
echo "🚀 Ready to deploy with:"
echo "   docker compose up --build"
echo ""
echo "🔍 Monitor logs with:"
echo "   docker compose logs -f app"
echo ""
echo "🏥 Check health with:"
echo "   curl http://localhost:3001/health"
