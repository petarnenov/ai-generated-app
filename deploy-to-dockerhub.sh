#!/bin/bash

# Docker Hub Deployment Script for GitLab PR AI Reviewer
# Replace 'yourusername' with your actual Docker Hub username

DOCKER_USERNAME="petarnenovpetrov"
IMAGE_NAME="gitlab-pr-ai-reviewer"
VERSION="1.0.0"

echo "🐳 Docker Hub Deployment Script"
echo "================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Step 1: Build the image
echo "📦 Building Docker image..."
docker build -t ${IMAGE_NAME}:latest .

if [ $? -ne 0 ]; then
    echo "❌ Failed to build Docker image"
    exit 1
fi

echo "✅ Image built successfully"

# Step 2: Tag the image for Docker Hub
echo "🏷️  Tagging image for Docker Hub..."
docker tag ${IMAGE_NAME}:latest ${DOCKER_USERNAME}/${IMAGE_NAME}:latest
docker tag ${IMAGE_NAME}:latest ${DOCKER_USERNAME}/${IMAGE_NAME}:v${VERSION}

echo "✅ Image tagged successfully"

# Step 3: Login to Docker Hub (if not already logged in)
echo "🔐 Checking Docker Hub login status..."
if ! docker info | grep -q "Username:"; then
    echo "Please login to Docker Hub:"
    docker login
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to login to Docker Hub"
        exit 1
    fi
fi

# Step 4: Push to Docker Hub
echo "🚀 Pushing to Docker Hub..."
docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:latest

if [ $? -ne 0 ]; then
    echo "❌ Failed to push latest tag"
    exit 1
fi

docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:v${VERSION}

if [ $? -ne 0 ]; then
    echo "❌ Failed to push version tag"
    exit 1
fi

echo "🎉 Successfully deployed to Docker Hub!"
echo ""
echo "📋 Your image is now available at:"
echo "   https://hub.docker.com/r/${DOCKER_USERNAME}/${IMAGE_NAME}"
echo ""
echo "🚀 Others can now run your container with:"
echo "   docker run -p 3001:3001 ${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
echo ""
echo "📄 For production deployment with environment variables, see:"
echo "   DOCKER_HUB_DEPLOYMENT.md"
