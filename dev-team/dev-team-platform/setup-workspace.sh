#!/bin/bash

# Setup npm workspace for Dev Team Platform
# This script properly handles workspace dependencies and generates all necessary lock files

set -e  # Exit on any error

echo "🔧 Setting up Dev Team Platform workspace..."
echo "=============================================="

# Function to check if a directory has a package.json
has_package_json() {
    [ -f "$1/package.json" ]
}

# Function to display status
display_status() {
    local status=$1
    local message=$2
    
    if [ "$status" = "success" ]; then
        echo "✅ $message"
    elif [ "$status" = "error" ]; then
        echo "❌ $message"
    elif [ "$status" = "info" ]; then
        echo "ℹ️  $message"
    elif [ "$status" = "warning" ]; then
        echo "⚠️  $message"
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in current directory"
    echo "Please run this script from the dev-team-platform root directory"
    exit 1
fi

# Check if this is a workspace project
if ! grep -q '"workspaces"' package.json; then
    echo "❌ Error: This doesn't appear to be an npm workspace project"
    exit 1
fi

echo "📋 Detected workspace configuration:"
echo "   - Root workspace: dev-team-platform"
echo "   - Workspaces: shared/*, services/*, services/agents/*, frontend"
echo ""

# Step 1: Install root dependencies and workspace dependencies
echo "🏗️  Step 1: Installing workspace dependencies from root..."
echo "--------------------------------------------------------"

display_status "info" "Running npm install from workspace root..."

if npm install; then
    display_status "success" "Workspace dependencies installed successfully"
else
    display_status "error" "Failed to install workspace dependencies"
    echo ""
    echo "💡 Troubleshooting tips:"
    echo "   - Make sure you have Node.js 18+ installed"
    echo "   - Try: npm cache clean --force"
    echo "   - Try: rm -rf node_modules package-lock.json && npm install"
    exit 1
fi

# Step 2: Build shared packages (required for other services)
echo ""
echo "🔨 Step 2: Building shared packages..."
echo "------------------------------------"

if npm run build:shared; then
    display_status "success" "Shared packages built successfully"
else
    display_status "warning" "Shared packages build failed (some services may still work)"
fi

# Step 3: Verify lock files were created
echo ""
echo "🔍 Step 3: Verifying package-lock.json files..."
echo "----------------------------------------------"

# List of all directories that should have package-lock.json
services=(
    "."
    "shared/types"
    "services/api-gateway"
    "services/orchestrator-service" 
    "services/project-service"
    "services/task-service"
    "services/auth-service"
    "services/agents/architecture"
    "services/agents/frontend"
    "services/agents/backend"
    "services/agents/qa"
    "services/agents/devops"
    "services/agents/mcp"
    "frontend"
)

lock_files_count=0
total_services=0

for service in "${services[@]}"; do
    if has_package_json "$service"; then
        total_services=$((total_services + 1))
        if [ -f "$service/package-lock.json" ]; then
            lock_files_count=$((lock_files_count + 1))
            display_status "success" "$service - package-lock.json exists"
        else
            display_status "warning" "$service - package-lock.json missing"
        fi
    fi
done

echo ""
echo "📊 Lock file generation summary:"
echo "   - Total services: $total_services"
echo "   - Lock files created: $lock_files_count"

if [ $lock_files_count -eq $total_services ]; then
    echo ""
    echo "🎉 SUCCESS! All package-lock.json files are ready!"
    echo "=============================================="
    echo ""
    echo "🚀 Next steps:"
    echo "1. Add your Anthropic API key to .env:"
    echo "   ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here"
    echo ""
    echo "2. Start the platform:"
    echo "   docker compose up --build -d"
    echo ""
    echo "3. Access the dashboard:"
    echo "   http://localhost:3080"
    echo ""
    echo "4. Login with default credentials:"
    echo "   Email: admin@devteam.local"
    echo "   Password: admin123"
    echo ""
    
elif [ $lock_files_count -gt $((total_services / 2)) ]; then
    display_status "warning" "Most lock files created, Docker build should work"
    echo ""
    echo "🔄 You can try running Docker Compose now:"
    echo "   docker compose up --build -d"
else
    display_status "error" "Too many missing lock files, please check for errors above"
    echo ""
    echo "💡 Try these troubleshooting steps:"
    echo "   1. npm cache clean --force"
    echo "   2. rm -rf node_modules package-lock.json"
    echo "   3. npm install"
    exit 1
fi

echo ""
echo "📚 For more help, see:"
echo "   - docs/getting-started/QUICK-START.md"
echo "   - docs/troubleshooting/COMMON-ISSUES.md"
