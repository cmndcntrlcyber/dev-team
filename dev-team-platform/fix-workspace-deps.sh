#!/bin/bash

# Fix workspace dependency issues for Docker builds
# This script removes workspace dependencies and copies shared types directly to each service

set -e

echo "🔧 Fixing workspace dependencies for Docker builds..."
echo "===================================================="

# Function to remove workspace dependency from package.json
remove_workspace_dep() {
    local package_file=$1
    local service_name=$2
    
    if [ -f "$package_file" ]; then
        echo "📦 Processing $service_name..."
        
        # Create backup
        cp "$package_file" "$package_file.bak"
        
        # Remove workspace dependency line
        sed -i '/"@dev-team-platform\/types": "workspace:\*"/d' "$package_file"
        
        # Create types directory in service
        local service_dir=$(dirname "$package_file")
        mkdir -p "$service_dir/src/shared"
        
        # Copy shared types
        cp -r "shared/types/src/"* "$service_dir/src/shared/" 2>/dev/null || true
        
        echo "✅ $service_name - workspace dependency removed, types copied"
    else
        echo "⚠️  $service_name - package.json not found"
    fi
}

echo "🚀 Removing workspace dependencies and copying shared types..."
echo "------------------------------------------------------------"

# Core Services
remove_workspace_dep "services/api-gateway/package.json" "API Gateway"
remove_workspace_dep "services/orchestrator-service/package.json" "Orchestrator Service"
remove_workspace_dep "services/project-service/package.json" "Project Service"
remove_workspace_dep "services/task-service/package.json" "Task Service"
remove_workspace_dep "services/auth-service/package.json" "Auth Service"

# Agent Services
remove_workspace_dep "services/agents/architecture/package.json" "Architecture Agent"
remove_workspace_dep "services/agents/frontend/package.json" "Frontend Agent"
remove_workspace_dep "services/agents/backend/package.json" "Backend Agent"
remove_workspace_dep "services/agents/qa/package.json" "QA Agent"
remove_workspace_dep "services/agents/devops/package.json" "DevOps Agent"
remove_workspace_dep "services/agents/mcp/package.json" "MCP Agent"

echo ""
echo "🔄 Updating imports in TypeScript files..."
echo "-----------------------------------------"

# Function to update imports in TypeScript files
update_imports() {
    local service_dir=$1
    local service_name=$2
    
    if [ -d "$service_dir/src" ]; then
        echo "📝 Updating imports in $service_name..."
        
        # Find all TypeScript files and update imports
        find "$service_dir/src" -name "*.ts" -type f -exec sed -i \
            's|from ['\''"]@dev-team-platform/types['\''"]|from "./shared"|g; s|import.*from ['\''"]@dev-team-platform/types['\''"]|import * as Types from "./shared"|g' {} + 2>/dev/null || true
        
        echo "✅ $service_name - imports updated"
    fi
}

# Update imports in all services
update_imports "services/api-gateway" "API Gateway"
update_imports "services/orchestrator-service" "Orchestrator Service"
update_imports "services/project-service" "Project Service"
update_imports "services/task-service" "Task Service"
update_imports "services/auth-service" "Auth Service"
update_imports "services/agents/architecture" "Architecture Agent"
update_imports "services/agents/frontend" "Frontend Agent"
update_imports "services/agents/backend" "Backend Agent"
update_imports "services/agents/qa" "QA Agent"
update_imports "services/agents/devops" "DevOps Agent"
update_imports "services/agents/mcp" "MCP Agent"

echo ""
echo "🎉 Workspace dependencies fixed!"
echo "==============================="
echo ""
echo "✅ Changes made:"
echo "   - Removed workspace:* dependencies from all services"
echo "   - Copied shared types to each service"
echo "   - Updated import statements to use local paths"
echo ""
echo "🚀 Now you can build and run with Docker:"
echo "   docker compose up --build -d"
echo ""
echo "💾 Backup files created (*.bak) in case you need to revert"
