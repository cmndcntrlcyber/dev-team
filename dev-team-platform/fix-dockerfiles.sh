#!/bin/bash

# Fix all Dockerfiles to use npm install instead of npm ci
# This resolves workspace dependency issues

set -e

echo "🔧 Fixing Dockerfiles to handle workspace dependencies..."

# List of Dockerfile paths
dockerfiles=(
    "services/orchestrator-service/Dockerfile"
    "services/project-service/Dockerfile"
    "services/task-service/Dockerfile"
    "services/auth-service/Dockerfile"
    "services/agents/architecture/Dockerfile"
    "services/agents/frontend/Dockerfile"
    "services/agents/backend/Dockerfile"
    "services/agents/qa/Dockerfile"
    "services/agents/devops/Dockerfile"
    "services/agents/mcp/Dockerfile"
)

for dockerfile in "${dockerfiles[@]}"; do
    if [ -f "$dockerfile" ]; then
        echo "📦 Updating $dockerfile..."
        sed -i 's/npm ci --only=production/npm install --only=production/g' "$dockerfile"
        sed -i 's/npm ci$/npm install/g' "$dockerfile"
        echo "✅ $dockerfile updated"
    else
        echo "⚠️  $dockerfile not found, skipping..."
    fi
done

echo ""
echo "🎉 All Dockerfiles updated successfully!"
echo ""
echo "🚀 Now try running:"
echo "   docker compose up --build -d"
