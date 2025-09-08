#!/bin/bash

# Empire Self-Healing Test Script
# This script tests the Empire self-healing solution

set -e

echo "🔥 Empire Self-Healing Solution Test Script"
echo "==========================================="
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

# Function to wait for user input
wait_for_input() {
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read -r
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

# Check if Empire directories exist
check_empire_directories() {
    print_status "Checking Empire volume directories..."
    
    if [ ! -d "uploads/empire" ]; then
        print_warning "Empire directories don't exist, creating them..."
        mkdir -p uploads/empire/data
        mkdir -p uploads/empire/downloads
        chmod 755 uploads/empire/data
        chmod 755 uploads/empire/downloads
        print_success "Empire directories created"
    else
        print_success "Empire directories exist"
    fi
}

# Test Empire image availability
test_empire_image() {
    print_status "Testing Empire image availability..."
    
    if docker pull bcsecurity/empire:latest; then
        print_success "Empire image pulled successfully"
    else
        print_error "Failed to pull Empire image"
        exit 1
    fi
}

# Test Empire container startup
test_empire_startup() {
    print_status "Testing Empire container startup..."
    
    # Stop any existing Empire containers
    docker stop attacknode-empire 2>/dev/null || true
    docker rm attacknode-empire 2>/dev/null || true
    
  # Start Empire container with the data container pattern
  print_status "Starting Empire container with data container pattern..."
  
  # Step 1: Create data container
  print_status "Creating Empire data container..."
  docker create -v /empire --name empire-data bcsecurity/empire:latest
  
  # Step 2: Start main container
  print_status "Starting Empire main container..."
  docker run -d -it \
      --name attacknode-empire \
      --restart unless-stopped \
      -p 1337:1337 \
      -p 5000:5000 \
      --volumes-from empire-data \
      bcsecurity/empire:latest
    
    # Wait for container to start
    print_status "Waiting for Empire container to initialize..."
    sleep 15
    
    # Check if container is running
    if docker ps --filter "name=attacknode-empire" --format "table {{.Names}}\t{{.Status}}" | grep -q "attacknode-empire"; then
        print_success "Empire container is running"
    else
        print_error "Empire container failed to start"
        print_status "Container logs:"
        docker logs attacknode-empire 2>&1 | tail -20
        return 1
    fi
}

# Test Empire API
test_empire_api() {
    print_status "Testing Empire API connectivity..."
    
    # Wait for Empire to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_status "Attempt $attempt/$max_attempts: Testing API on port 1337..."
        
        if curl -s -f --max-time 5 http://localhost:1337/api/version &> /dev/null; then
            print_success "Empire API is responding"
            return 0
        fi
        
        sleep 5
        ((attempt++))
    done
    
    print_warning "Empire API not responding after $max_attempts attempts"
    print_status "This may be normal if Empire is still initializing"
    return 1
}

# Test Starkiller UI
test_starkiller_ui() {
    print_status "Testing Starkiller UI connectivity..."
    
    if curl -s -f --max-time 5 http://localhost:5000 &> /dev/null; then
        print_success "Starkiller UI is accessible"
        return 0
    else
        print_warning "Starkiller UI not accessible"
        print_status "This may be normal if Starkiller is not fully initialized"
        return 1
    fi
}

# Test Empire database
test_empire_database() {
    print_status "Testing Empire database..."
    
    if docker exec attacknode-empire ls -la /empire/empire.db &> /dev/null; then
        print_success "Empire database exists"
        return 0
    else
        print_warning "Empire database not found"
        return 1
    fi
}

# Test recovery mechanism
test_recovery_mechanism() {
    print_status "Testing Empire recovery mechanism..."
    
    # Stop the container to simulate failure
    print_status "Simulating container failure..."
    docker stop attacknode-empire
    
    print_status "Waiting for health monitor to detect failure and recover..."
    print_status "This may take up to 90 seconds..."
    
    # Wait for potential recovery
    sleep 90
    
    # Check if container was recovered
    if docker ps --filter "name=attacknode-empire" --format "table {{.Names}}\t{{.Status}}" | grep -q "attacknode-empire"; then
        print_success "Empire container recovered automatically"
        return 0
    else
        print_warning "Automatic recovery not detected"
        print_status "Manual recovery may be required"
        return 1
    fi
}

# Display Empire information
display_empire_info() {
    print_status "Empire Container Information:"
    echo "=============================="
    
    # Container status
    echo "Container Status:"
    docker ps --filter "name=attacknode-empire" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true
    echo ""
    
    # Container logs (last 10 lines)
    echo "Recent Logs:"
    docker logs attacknode-empire --tail 10 2>&1 || true
    echo ""
    
    # Port status
    echo "Port Status:"
    netstat -tlnp | grep -E ':1337|:5000' || echo "No ports found"
    echo ""
    
    # Volume status
    echo "Volume Status:"
    ls -la uploads/empire/ 2>/dev/null || echo "No volumes found"
    echo ""
}

# Main test execution
main() {
    echo "Starting Empire self-healing solution tests..."
    echo ""
    
    # Basic checks
    check_docker
    check_empire_directories
    
    # Image and startup tests
    test_empire_image
    
    print_status "About to test Empire container startup..."
    wait_for_input
    
    if test_empire_startup; then
        print_success "Empire startup test passed"
    else
        print_error "Empire startup test failed"
        display_empire_info
        return 1
    fi
    
    # API tests
    print_status "About to test Empire API..."
    wait_for_input
    
    if test_empire_api; then
        print_success "Empire API test passed"
    else
        print_warning "Empire API test failed"
    fi
    
    # UI tests
    if test_starkiller_ui; then
        print_success "Starkiller UI test passed"
    else
        print_warning "Starkiller UI test failed"
    fi
    
    # Database tests
    if test_empire_database; then
        print_success "Empire database test passed"
    else
        print_warning "Empire database test failed"
    fi
    
    # Recovery tests
    print_status "About to test recovery mechanism..."
    print_warning "This will stop the Empire container to test auto-recovery"
    wait_for_input
    
    if test_recovery_mechanism; then
        print_success "Recovery mechanism test passed"
    else
        print_warning "Recovery mechanism test failed"
    fi
    
    # Final information
    display_empire_info
    
    echo ""
    echo "🎉 Empire Self-Healing Solution Test Complete"
    echo "============================================="
    echo ""
    print_success "Test execution completed"
    print_status "Check the results above for any issues"
    print_status "Empire should now be running with self-healing capabilities"
    echo ""
    print_status "Access Empire:"
    echo "  - API: http://localhost:1337"
    echo "  - Starkiller UI: http://localhost:5000"
    echo ""
    print_status "Monitor Empire health:"
    echo "  - Container logs: docker logs attacknode-empire"
    echo "  - Health check: curl http://localhost:1337/api/version"
    echo ""
}

# Run main function
main "$@"
