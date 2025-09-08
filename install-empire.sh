#!/bin/bash

# Empire Installation Script
# This script implements the successful Empire deployment pattern using data containers

set -e

echo "🔥 Empire Installation Script"
echo "============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is available
check_docker() {
    print_status "Checking Docker availability..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    
    print_success "Docker is available and running"
}

# Clean up any existing Empire containers
cleanup_existing() {
    print_status "Cleaning up existing Empire containers..."
    
    # Stop and remove main container
    if docker ps -a --filter "name=attacknode-empire" --format "{{.Names}}" | grep -q "attacknode-empire"; then
        print_status "Stopping existing Empire container..."
        docker stop attacknode-empire 2>/dev/null || true
        docker rm attacknode-empire 2>/dev/null || true
        print_success "Existing Empire container removed"
    fi
    
    # Remove data container
    if docker ps -a --filter "name=empire-data" --format "{{.Names}}" | grep -q "empire-data"; then
        print_status "Removing existing Empire data container..."
        docker rm empire-data 2>/dev/null || true
        print_success "Existing Empire data container removed"
    fi
}

# Install Empire using data container pattern
install_empire() {
    print_status "Installing Empire using data container pattern..."
    
    # Step 1: Pull the Empire image
    print_status "Pulling Empire image..."
    if docker pull bcsecurity/empire:latest; then
        print_success "Empire image pulled successfully"
    else
        print_error "Failed to pull Empire image"
        exit 1
    fi
    
    # Step 2: Create data container with persistent storage
    print_status "Creating Empire data container..."
    if docker create -v /empire --name empire-data bcsecurity/empire:latest; then
        print_success "Empire data container created successfully"
    else
        print_error "Failed to create Empire data container"
        exit 1
    fi
    
    # Step 3: Start main container with data container volumes
    print_status "Starting Empire main container..."
    if docker run -d -it \
        --name attacknode-empire \
        --restart unless-stopped \
        -p 1337:1337 \
        -p 5000:5000 \
        --volumes-from empire-data \
        bcsecurity/empire:latest; then
        print_success "Empire main container started successfully"
    else
        print_error "Failed to start Empire main container"
        exit 1
    fi
}

# Wait for Empire to be ready
wait_for_empire() {
    print_status "Waiting for Empire to initialize..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_status "Checking Empire status... (attempt $attempt/$max_attempts)"
        
        if docker ps --filter "name=attacknode-empire" --format "{{.Status}}" | grep -q "Up"; then
            print_success "Empire container is running"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "Empire failed to start within timeout"
            print_status "Container logs:"
            docker logs attacknode-empire 2>&1 | tail -20
            return 1
        fi
        
        sleep 5
        ((attempt++))
    done
    
    # Additional wait for Empire services to initialize
    print_status "Waiting for Empire services to initialize..."
    sleep 15
}

# Test Empire installation
test_empire() {
    print_status "Testing Empire installation..."
    
    # Test container status
    if docker ps --filter "name=attacknode-empire" --format "{{.Names}}" | grep -q "attacknode-empire"; then
        print_success "Empire container is running"
    else
        print_error "Empire container is not running"
        return 1
    fi
    
    # Test API connectivity
    print_status "Testing Empire API connectivity..."
    local api_attempts=10
    local api_attempt=1
    
    while [ $api_attempt -le $api_attempts ]; do
        if curl -s -f --max-time 5 http://localhost:1337/api/version &> /dev/null; then
            print_success "Empire API is responding"
            break
        fi
        
        if [ $api_attempt -eq $api_attempts ]; then
            print_warning "Empire API not responding yet (this may be normal during initialization)"
        fi
        
        sleep 3
        ((api_attempt++))
    done
    
    # Test Starkiller UI
    print_status "Testing Starkiller UI connectivity..."
    if curl -s -f --max-time 5 http://localhost:5000 &> /dev/null; then
        print_success "Starkiller UI is accessible"
    else
        print_warning "Starkiller UI not accessible yet (this may be normal during initialization)"
    fi
}

# Display installation results
display_results() {
    print_status "Empire Installation Results:"
    echo "============================="
    echo ""
    
    # Container status
    echo "Container Status:"
    docker ps --filter "name=attacknode-empire" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers found"
    echo ""
    
    # Data container status
    echo "Data Container Status:"
    docker ps -a --filter "name=empire-data" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "No data container found"
    echo ""
    
    # Port status
    echo "Port Status:"
    netstat -tlnp 2>/dev/null | grep -E ':1337|:5000' || echo "No ports found"
    echo ""
    
    # Recent logs
    echo "Recent Logs (last 10 lines):"
    docker logs attacknode-empire --tail 10 2>/dev/null || echo "No logs available"
    echo ""
}

# Main installation function
main() {
    echo "Starting Empire installation..."
    echo ""
    
    # Pre-installation checks
    check_docker
    
    # Clean up existing installation
    cleanup_existing
    
    # Install Empire
    install_empire
    
    # Wait for Empire to be ready
    wait_for_empire
    
    # Test installation
    test_empire
    
    # Display results
    display_results
    
    echo ""
    echo "🎉 Empire Installation Complete!"
    echo "================================="
    echo ""
    print_success "Empire has been successfully installed and deployed"
    print_status "The installation uses Docker data containers for persistent storage"
    echo ""
    print_status "Access Empire:"
    echo "  - Empire API: http://localhost:1337"
    echo "  - Starkiller UI: http://localhost:5000"
    echo ""
    print_status "Default Credentials:"
    echo "  - Username: empireadmin"
    echo "  - Password: password123"
    echo ""
    print_status "Management Commands:"
    echo "  - View logs: docker logs attacknode-empire"
    echo "  - Restart: docker restart attacknode-empire"
    echo "  - Stop: docker stop attacknode-empire"
    echo "  - Remove: docker rm attacknode-empire empire-data"
    echo ""
    print_status "The self-healing system will automatically monitor and recover Empire if issues occur"
    echo ""
}

# Run main function
main "$@"
