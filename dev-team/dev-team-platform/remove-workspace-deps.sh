#!/bin/bash

# Safely remove workspace dependencies for Docker builds
# This script properly handles JSON syntax and removes workspace references

set -e

echo "🔧 Removing workspace dependencies for Docker compatibility..."
echo "============================================================"

# Function to safely remove workspace dependency using Node.js
remove_workspace_dep_safe() {
    local package_file=$1
    local service_name=$2
    
    if [ -f "$package_file" ]; then
        echo "📦 Processing $service_name..."
        
        # Create backup
        cp "$package_file" "$package_file.bak"
        
        # Use Node.js to safely modify JSON
        node -e "
        const fs = require('fs');
        const path = '$package_file';
        const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
        
        // Remove workspace dependencies
        if (pkg.dependencies && pkg.dependencies['@dev-team-platform/types']) {
            delete pkg.dependencies['@dev-team-platform/types'];
        }
        
        // Write back to file with proper formatting
        fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
        console.log('✅ $service_name - workspace dependency removed safely');
        " || {
            echo "❌ $service_name - Failed to process package.json"
            # Restore from backup if failed
            cp "$package_file.bak" "$package_file"
            return 1
        }
        
    else
        echo "⚠️  $service_name - package.json not found"
    fi
}

echo "🚀 Removing workspace dependencies from all services..."
echo "-----------------------------------------------------"

# Core Services
remove_workspace_dep_safe "services/api-gateway/package.json" "API Gateway"
remove_workspace_dep_safe "services/orchestrator-service/package.json" "Orchestrator Service"
remove_workspace_dep_safe "services/project-service/package.json" "Project Service"
remove_workspace_dep_safe "services/task-service/package.json" "Task Service"
remove_workspace_dep_safe "services/auth-service/package.json" "Auth Service"

# Agent Services
remove_workspace_dep_safe "services/agents/architecture/package.json" "Architecture Agent"
remove_workspace_dep_safe "services/agents/frontend/package.json" "Frontend Agent"
remove_workspace_dep_safe "services/agents/backend/package.json" "Backend Agent"
remove_workspace_dep_safe "services/agents/qa/package.json" "QA Agent"
remove_workspace_dep_safe "services/agents/devops/package.json" "DevOps Agent"
remove_workspace_dep_safe "services/agents/mcp/package.json" "MCP Agent"

echo ""
echo "🎉 Workspace dependencies removed successfully!"
echo "=============================================="
echo ""
echo "✅ All package.json files now have valid JSON syntax"
echo "✅ Workspace dependencies have been safely removed"
echo "✅ Backup files (.bak) are available for rollback"
echo ""
echo "🚀 Now you can build and run with Docker:"
echo "   docker compose up --build -d"
echo ""
echo "💡 Note: Services will work without shared types initially."
echo "   The shared types can be added back manually if needed."
