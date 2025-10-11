#!/bin/bash
# Setup script for gcloud-mcp and cloud-run-mcp MCP servers
# This script will guide you through the installation and configuration process

set -e

echo "======================================"
echo "Google Cloud MCP Servers Setup"
echo "gcloud-mcp & cloud-run-mcp"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if gcloud is installed
check_gcloud() {
    echo ""
    echo "Step 1: Checking for gcloud CLI..."
    if command -v gcloud &> /dev/null; then
        GCLOUD_VERSION=$(gcloud --version | head -n 1)
        print_success "gcloud CLI is installed: $GCLOUD_VERSION"
        return 0
    else
        print_error "gcloud CLI is not installed"
        echo ""
        echo "Please install gcloud CLI from:"
        echo "https://cloud.google.com/sdk/docs/install"
        echo ""
        return 1
    fi
}

# Check if Node.js is installed
check_nodejs() {
    echo ""
    echo "Step 2: Checking for Node.js..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
        
        # Check if version is >= 20
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -lt 20 ]; then
            print_warning "Node.js version should be 20 or higher"
            echo "Current version: $NODE_VERSION"
            echo "Please upgrade from: https://nodejs.org/"
            return 1
        fi
        return 0
    else
        print_error "Node.js is not installed"
        echo ""
        echo "Please install Node.js (v20+) from:"
        echo "https://nodejs.org/"
        echo ""
        return 1
    fi
}

# Authenticate with gcloud
authenticate_gcloud() {
    echo ""
    echo "Step 3: Google Cloud Authentication"
    echo "-----------------------------------"
    
    # Check if already authenticated
    CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null)
    if [ -n "$CURRENT_ACCOUNT" ]; then
        print_info "Currently authenticated as: $CURRENT_ACCOUNT"
        read -p "Do you want to re-authenticate? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping authentication"
            return 0
        fi
    fi
    
    echo ""
    print_info "Running: gcloud auth login"
    if gcloud auth login; then
        print_success "Successfully authenticated with Google Cloud"
    else
        print_error "Authentication failed"
        return 1
    fi
}

# Set up Application Default Credentials
setup_adc() {
    echo ""
    echo "Step 4: Application Default Credentials (ADC)"
    echo "----------------------------------------------"
    
    ADC_PATH="$HOME/.config/gcloud/application_default_credentials.json"
    if [ -f "$ADC_PATH" ]; then
        print_info "ADC file already exists at: $ADC_PATH"
        read -p "Do you want to regenerate it? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Using existing ADC"
            return 0
        fi
    fi
    
    echo ""
    print_info "Setting up Application Default Credentials..."
    print_info "This will open a browser for authentication"
    echo ""
    
    if gcloud auth application-default login; then
        print_success "ADC successfully configured"
        print_info "Credentials saved to: $ADC_PATH"
        
        # Save the path for later use
        echo "$ADC_PATH" > .adc_path
    else
        print_error "Failed to set up ADC"
        return 1
    fi
}

# Set default project
set_project() {
    echo ""
    echo "Step 5: Set Default Google Cloud Project"
    echo "-----------------------------------------"
    
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
    if [ -n "$CURRENT_PROJECT" ]; then
        print_info "Current default project: $CURRENT_PROJECT"
        read -p "Do you want to change it? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "$CURRENT_PROJECT" > .project_id
            return 0
        fi
    fi
    
    echo ""
    print_info "Listing your Google Cloud projects..."
    gcloud projects list
    
    echo ""
    read -p "Enter the Project ID to use: " PROJECT_ID
    
    if gcloud config set project "$PROJECT_ID"; then
        print_success "Default project set to: $PROJECT_ID"
        echo "$PROJECT_ID" > .project_id
    else
        print_error "Failed to set project"
        return 1
    fi
}

# Enable required APIs
enable_apis() {
    echo ""
    echo "Step 6: Enable Required Google Cloud APIs"
    echo "------------------------------------------"
    
    PROJECT_ID=$(cat .project_id 2>/dev/null || gcloud config get-value project)
    
    print_info "Project: $PROJECT_ID"
    echo ""
    
    APIS=(
        "run.googleapis.com:Cloud Run API"
        "cloudbuild.googleapis.com:Cloud Build API"
        "artifactregistry.googleapis.com:Artifact Registry API"
        "compute.googleapis.com:Compute Engine API"
        "storage.googleapis.com:Cloud Storage API"
    )
    
    echo "The following APIs will be enabled:"
    for API_INFO in "${APIS[@]}"; do
        API=$(echo $API_INFO | cut -d':' -f1)
        NAME=$(echo $API_INFO | cut -d':' -f2)
        echo "  - $NAME ($API)"
    done
    
    echo ""
    read -p "Enable these APIs? (Y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        print_warning "Skipping API enablement"
        return 0
    fi
    
    for API_INFO in "${APIS[@]}"; do
        API=$(echo $API_INFO | cut -d':' -f1)
        NAME=$(echo $API_INFO | cut -d':' -f2)
        
        print_info "Enabling $NAME..."
        if gcloud services enable "$API" --project="$PROJECT_ID" 2>/dev/null; then
            print_success "$NAME enabled"
        else
            print_warning "Could not enable $NAME (may already be enabled or lack permissions)"
        fi
    done
}

# Test MCP servers
test_servers() {
    echo ""
    echo "Step 7: Testing MCP Server Installation"
    echo "----------------------------------------"
    
    echo ""
    print_info "Testing gcloud-mcp..."
    if npx -y @google-cloud/gcloud-mcp --version 2>/dev/null; then
        print_success "gcloud-mcp is accessible"
    else
        print_warning "Could not test gcloud-mcp (may still work with MCP client)"
    fi
    
    echo ""
    print_info "Testing cloud-run-mcp..."
    if npx -y @google-cloud/cloud-run-mcp --help 2>/dev/null; then
        print_success "cloud-run-mcp is accessible"
    else
        print_warning "Could not test cloud-run-mcp (may still work with MCP client)"
    fi
}

# Generate MCP client configuration
generate_config() {
    echo ""
    echo "Step 8: Generate MCP Client Configuration"
    echo "------------------------------------------"
    
    ADC_PATH=$(cat .adc_path 2>/dev/null || echo "$HOME/.config/gcloud/application_default_credentials.json")
    PROJECT_ID=$(cat .project_id 2>/dev/null || gcloud config get-value project)
    
    cat > mcp-config.json << EOF
{
  "mcpServers": {
    "gcloud": {
      "command": "npx",
      "args": ["-y", "@google-cloud/gcloud-mcp"]
    },
    "cloud-run": {
      "command": "npx",
      "args": ["-y", "@google-cloud/cloud-run-mcp"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "$PROJECT_ID"
      }
    }
  }
}
EOF
    
    print_success "Configuration file created: mcp-config.json"
    echo ""
    echo "Configuration details:"
    echo "  ADC Path: $ADC_PATH"
    echo "  Project ID: $PROJECT_ID"
    echo ""
    
    # Also create a version with explicit credentials path
    cat > mcp-config-explicit.json << EOF
{
  "mcpServers": {
    "gcloud": {
      "command": "npx",
      "args": ["-y", "@google-cloud/gcloud-mcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "$ADC_PATH",
        "GOOGLE_CLOUD_PROJECT": "$PROJECT_ID"
      }
    },
    "cloud-run": {
      "command": "npx",
      "args": ["-y", "@google-cloud/cloud-run-mcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "$ADC_PATH",
        "GOOGLE_CLOUD_PROJECT": "$PROJECT_ID"
      }
    }
  }
}
EOF
    
    print_info "Alternative config with explicit credentials: mcp-config-explicit.json"
}

# Print next steps
print_next_steps() {
    echo ""
    echo "======================================"
    echo "Setup Complete! 🎉"
    echo "======================================"
    echo ""
    echo "Next Steps:"
    echo ""
    echo "1. Add the MCP servers to your client configuration:"
    echo ""
    echo "   For Claude Desktop:"
    echo "   - Open: ~/Claude/claude_desktop_config.json"
    echo "   - Copy contents from: mcp-config.json"
    echo ""
    echo "   For Cline (VS Code):"
    echo "   - Open: .vscode/cline_mcp_settings.json"
    echo "   - Copy contents from: mcp-config.json"
    echo ""
    echo "   For Cursor:"
    echo "   - Open: ~/.cursor/mcp.json"
    echo "   - Copy contents from: mcp-config.json"
    echo ""
    echo "2. Restart your MCP client"
    echo ""
    echo "3. Test with prompts like:"
    echo "   - 'List my Google Cloud projects'"
    echo "   - 'Show my Cloud Run services'"
    echo "   - 'What compute instances do I have?'"
    echo ""
    echo "Configuration files created:"
    echo "  - mcp-config.json (basic config)"
    echo "  - mcp-config-explicit.json (with explicit credentials path)"
    echo ""
    print_success "Setup script completed successfully!"
}

# Main execution
main() {
    echo ""
    
    # Run all checks and setup steps
    check_gcloud || exit 1
    check_nodejs || exit 1
    authenticate_gcloud || exit 1
    setup_adc || exit 1
    set_project || exit 1
    enable_apis || exit 1
    test_servers
    generate_config
    print_next_steps
    
    echo ""
}

# Run main function
main
