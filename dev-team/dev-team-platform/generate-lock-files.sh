#!/bin/bash

# Generate package-lock.json files for all services in the Dev Team Platform
# This script runs npm install in each service directory to create the required lock files for Docker builds

set -e  # Exit on any error

echo "🔧 Generating package-lock.json files for all services..."
echo "============================================================"

# Function to run npm install in a directory
install_dependencies() {
    local dir=$1
    local service_name=$2
    
    if [ -f "$dir/package.json" ]; then
        echo "📦 Installing dependencies for $service_name..."
        cd "$dir"
        
        if npm install; then
            echo "✅ $service_name - package-lock.json generated successfully"
        else
            echo "❌ $service_name - Failed to install dependencies"
            return 1
        fi
        
        cd - > /dev/null
        echo ""
    else
        echo "⚠️  $service_name - No package.json found, skipping..."
        echo ""
    fi
}

# Store the original directory
ORIGINAL_DIR=$(pwd)

# Core Services
echo "🏗️  Processing Core Services..."
echo "--------------------------------"

install_dependencies "services/api-gateway" "API Gateway"
install_dependencies "services/orchestrator-service" "Orchestrator Service"
install_dependencies "services/project-service" "Project Service"
install_dependencies "services/task-service" "Task Service"
install_dependencies "services/auth-service" "Auth Service"

# Agent Services
echo "🤖 Processing Agent Services..."
echo "-------------------------------"

install_dependencies "services/agents/architecture" "Architecture Agent"
install_dependencies "services/agents/frontend" "Frontend Agent"
install_dependencies "services/agents/backend" "Backend Agent"
install_dependencies "services/agents/qa" "QA Agent"
install_dependencies "services/agents/devops" "DevOps Agent"
install_dependencies "services/agents/mcp" "MCP Agent"

# Frontend
echo "🎨 Processing Frontend..."
echo "-------------------------"

install_dependencies "frontend" "Frontend Dashboard"

# Shared packages
echo "📚 Processing Shared Packages..."
echo "--------------------------------"

install_dependencies "shared/types" "Shared Types"

# Return to original directory
cd "$ORIGINAL_DIR"

echo "============================================================"
echo "✅ All package-lock.json files generated successfully!"
echo ""
echo "📋 Summary:"
echo "   - Generated lock files for all services"
echo "   - Ready for Docker Compose build"
echo ""
echo "🚀 Next steps:"
echo "   1. Update your .env file with your Anthropic API key"
echo "   2. Run: docker compose up --build -d"
echo "   3. Access dashboard at: http://localhost:3080"
echo ""
echo "🔑 Don't forget to add your API key to .env:"
echo "   ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here"
