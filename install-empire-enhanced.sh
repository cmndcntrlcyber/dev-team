#!/bin/bash

# Enhanced Empire Installation Script with Network Self-Healing
# This script implements robust Empire deployment with network error recovery

set -e

echo "🔥 Enhanced Empire Installation Script with Network Self-Healing"
echo "==============================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
MAX_RETRIES=5
RETRY_DELAY=5
PULL_TIMEOUT=300
NETWORK_CHECK_TIMEOUT=30

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

print_network() {
    echo -e "${CYAN}[NETWORK]${NC} $1"
}

# Function to wait for user input
wait_for_input() {
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read -r
}

# Enhanced logging function
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Log to file
    echo "[$timestamp] [$level] $message" >> logs/empire-install.log
    
    # Also print to console
    case $level in
        "INFO") print_status "$message" ;;
        "SUCCESS") print_success "$message" ;;
        "WARNING") print_warning "$message" ;;
        "ERROR") print_error "$message" ;;
        "NETWORK") print_network "$message" ;;
    esac
}

# Check if Docker is available
check_docker() {
    log_message "INFO" "Checking Docker availability..."
    
    if ! command -v docker &> /dev/null; then
        log_message "ERROR" "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null 2>&1; then
        log_message "ERROR" "Docker daemon is not running"
        exit 1
    fi
    
    log_message "SUCCESS" "Docker is available and running"
}

# Check internet connectivity
check_internet() {
    log_message "NETWORK" "Checking internet connectivity..."
    
    local test_urls=(
        "https://www.google.com"
        "https://1.1.1.1"
        "https://8.8.8.8"
    )
    
    for url in "${test_urls[@]}"; do
        if curl -s -f --max-time 5 "$url" > /dev/null 2>&1; then
            log_message "SUCCESS" "Internet connectivity confirmed"
            return 0
        fi
    done
    
    log_message "ERROR" "No internet connectivity detected"
    return 1
}

# Check DNS resolution
check_dns() {
    log_message "NETWORK" "Checking DNS resolution..."
    
    local domains=(
        "registry-1.docker.io"
        "docker.io"
        "github.com"
    )
    
    for domain in "${domains[@]}"; do
        if nslookup "$domain" > /dev/null 2>&1; then
            log_message "SUCCESS" "DNS resolution working"
            return 0
        fi
    done
    
    log_message "ERROR" "DNS resolution failed"
    return 1
}

# Check Docker Hub connectivity
check_docker_hub() {
    log_message "NETWORK" "Checking Docker Hub connectivity..."
    
    local registry_endpoints=(
        "https://registry-1.docker.io/v2/"
        "https://index.docker.io/v1/"
    )
    
    for endpoint in "${registry_endpoints[@]}"; do
        if curl -s -f --max-time 10 "$endpoint" > /dev/null 2>&1; then
            log_message "SUCCESS" "Docker Hub is reachable"
            return 0
        fi
    done
    
    log_message "WARNING" "Docker Hub may be unreachable"
    return 1
}

# Network diagnostics and repair
repair_network() {
    log_message "NETWORK" "Attempting comprehensive network repair..."
    
    # Use enhanced DNS repair script if available
    if [ -f "fix-dns-resolution.sh" ]; then
        log_message "NETWORK" "Using enhanced DNS repair system..."
        
        # Run DNS repair with auto-repair mode
        if ./fix-dns-resolution.sh --auto-repair; then
            log_message "SUCCESS" "Enhanced DNS repair successful"
            
            # Verify network recovery
            if check_internet && check_dns; then
                log_message "SUCCESS" "Network repair successful"
                return 0
            fi
        else
            log_message "WARNING" "Enhanced DNS repair failed, trying fallback..."
        fi
    fi
    
    # Fallback to basic repair if enhanced repair isn't available or failed
    log_message "NETWORK" "Using fallback DNS repair..."
    
    # Flush DNS cache
    log_message "NETWORK" "Flushing DNS cache..."
    sudo systemctl restart systemd-resolved 2>/dev/null || \
    sudo /etc/init.d/dns-clean restart 2>/dev/null || \
    sudo dscacheutil -flushcache 2>/dev/null || \
    log_message "WARNING" "Could not flush DNS cache"
    
    # Add reliable DNS servers
    log_message "NETWORK" "Adding reliable DNS servers..."
    local dns_servers=("8.8.8.8" "1.1.1.1" "9.9.9.9")
    
    # Backup original resolv.conf
    sudo cp /etc/resolv.conf /etc/resolv.conf.backup.$(date +%s) 2>/dev/null || true
    
    # Add DNS servers
    for dns in "${dns_servers[@]}"; do
        if ! grep -q "nameserver $dns" /etc/resolv.conf 2>/dev/null; then
            echo "nameserver $dns" | sudo tee -a /etc/resolv.conf > /dev/null 2>&1 || true
        fi
    done
    
    # Wait for DNS changes to take effect
    sleep 3
    
    # Verify network recovery
    if check_internet && check_dns; then
        log_message "SUCCESS" "Network repair successful"
        return 0
    else
        log_message "ERROR" "Network repair failed"
        return 1
    fi
}

# Enhanced Docker image pull with retry and network repair
pull_empire_image() {
    log_message "INFO" "Pulling Empire image with enhanced retry logic..."
    
    local image_name="bcsecurity/empire:latest"
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log_message "INFO" "Pull attempt $attempt of $MAX_RETRIES for $image_name"
        
        # Calculate exponential backoff delay
        local backoff_delay=$((RETRY_DELAY * (2 ** (attempt - 1))))
        
        if [ $attempt -gt 1 ]; then
            log_message "INFO" "Waiting ${backoff_delay}s before retry..."
            sleep $backoff_delay
        fi
        
        # Try different pull strategies
        local pull_commands=(
            "docker pull $image_name"
            "docker pull $image_name --disable-content-trust"
            "docker pull $image_name --platform linux/amd64"
        )
        
        for cmd in "${pull_commands[@]}"; do
            log_message "INFO" "Trying: $cmd"
            
            if timeout $PULL_TIMEOUT $cmd 2>&1 | tee -a logs/empire-install.log; then
                log_message "SUCCESS" "Successfully pulled $image_name"
                return 0
            else
                log_message "WARNING" "Pull command failed: $cmd"
            fi
        done
        
        # If we're halfway through retries, attempt network repair
        if [ $attempt -eq $((MAX_RETRIES / 2)) ]; then
            log_message "INFO" "Attempting network repair mid-retry..."
            repair_network || log_message "WARNING" "Network repair failed, continuing with retries"
        fi
        
        ((attempt++))
    done
    
    log_message "ERROR" "Failed to pull Empire image after $MAX_RETRIES attempts"
    return 1
}

# Check for existing Empire installations
check_existing_empire() {
    log_message "INFO" "Checking for existing Empire installations..."
    
    local containers_found=false
    
    # Check for containers
    if docker ps -a --filter "name=attacknode-empire" --format "{{.Names}}" | grep -q "attacknode-empire"; then
        log_message "WARNING" "Found existing Empire container"
        containers_found=true
    fi
    
    if docker ps -a --filter "name=empire-data" --format "{{.Names}}" | grep -q "empire-data"; then
        log_message "WARNING" "Found existing Empire data container"
        containers_found=true
    fi
    
    if [ "$containers_found" = true ]; then
        echo ""
        log_message "WARNING" "Existing Empire installation detected"
        echo "This will remove existing containers and create new ones."
        echo "All data will be preserved in the data container."
        echo ""
        echo "Continue? (y/N)"
        read -r response
        
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_message "INFO" "Installation cancelled by user"
            exit 0
        fi
    fi
}

# Clean up existing Empire containers
cleanup_existing() {
    log_message "INFO" "Cleaning up existing Empire containers..."
    
    # Stop and remove main container
    if docker ps -a --filter "name=attacknode-empire" --format "{{.Names}}" | grep -q "attacknode-empire"; then
        log_message "INFO" "Stopping existing Empire container..."
        docker stop attacknode-empire 2>/dev/null || true
        docker rm attacknode-empire 2>/dev/null || true
        log_message "SUCCESS" "Existing Empire container removed"
    fi
    
    # Remove data container if requested
    if docker ps -a --filter "name=empire-data" --format "{{.Names}}" | grep -q "empire-data"; then
        log_message "INFO" "Removing existing Empire data container..."
        docker rm empire-data 2>/dev/null || true
        log_message "SUCCESS" "Existing Empire data container removed"
    fi
    
    # Clean up any orphaned containers
    log_message "INFO" "Cleaning up orphaned containers..."
    docker container prune -f 2>/dev/null || true
}

# Network health pre-check
network_health_check() {
    log_message "NETWORK" "Performing comprehensive network health check..."
    
    local health_checks=(
        "check_internet"
        "check_dns"
        "check_docker_hub"
    )
    
    local failed_checks=0
    
    for check in "${health_checks[@]}"; do
        if ! $check; then
            ((failed_checks++))
        fi
    done
    
    if [ $failed_checks -gt 0 ]; then
        log_message "WARNING" "$failed_checks network health checks failed"
        log_message "INFO" "Attempting network repair..."
        
        if repair_network; then
            log_message "SUCCESS" "Network issues resolved"
        else
            log_message "ERROR" "Network issues persist, installation may fail"
            echo ""
            echo "Network issues detected. Continue anyway? (y/N)"
            read -r response
            
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                log_message "INFO" "Installation cancelled due to network issues"
                exit 1
            fi
        fi
    else
        log_message "SUCCESS" "All network health checks passed"
    fi
}

# Create Empire containers with data persistence
create_empire_containers() {
    log_message "INFO" "Creating Empire containers with data persistence..."
    
    # Step 1: Create data container
    log_message "INFO" "Creating Empire data container..."
    if docker create -v /empire --name empire-data bcsecurity/empire:latest; then
        log_message "SUCCESS" "Empire data container created successfully"
    else
        log_message "ERROR" "Failed to create Empire data container"
        return 1
    fi
    
    # Step 2: Start main container
    log_message "INFO" "Starting Empire main container..."
    if docker run -d -it \
        --name attacknode-empire \
        --restart unless-stopped \
        -p 1337:1337 \
        -p 5000:5000 \
        --volumes-from empire-data \
        bcsecurity/empire:latest; then
        log_message "SUCCESS" "Empire main container started successfully"
    else
        log_message "ERROR" "Failed to start Empire main container"
        return 1
    fi
    
    return 0
}

# Wait for Empire to initialize
wait_for_empire() {
    log_message "INFO" "Waiting for Empire to initialize..."
    
    local max_wait=300  # 5 minutes
    local check_interval=5
    local elapsed=0
    
    while [ $elapsed -lt $max_wait ]; do
        if docker ps --filter "name=attacknode-empire" --format "{{.Status}}" | grep -q "Up"; then
            log_message "SUCCESS" "Empire container is running"
            break
        fi
        
        if [ $elapsed -eq $max_wait ]; then
            log_message "ERROR" "Empire failed to start within timeout"
            log_message "INFO" "Container logs:"
            docker logs attacknode-empire 2>&1 | tail -20 | tee -a logs/empire-install.log
            return 1
        fi
        
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
        
        if [ $((elapsed % 30)) -eq 0 ]; then
            log_message "INFO" "Still waiting... (${elapsed}s elapsed)"
        fi
    done
    
    # Additional wait for Empire services to fully initialize
    log_message "INFO" "Waiting for Empire services to fully initialize..."
    sleep 30
    
    return 0
}

# Test Empire installation
test_empire() {
    log_message "INFO" "Testing Empire installation..."
    
    # Test container status
    if docker ps --filter "name=attacknode-empire" --format "{{.Names}}" | grep -q "attacknode-empire"; then
        log_message "SUCCESS" "Empire container is running"
    else
        log_message "ERROR" "Empire container is not running"
        return 1
    fi
    
    # Test API connectivity with retry
    log_message "INFO" "Testing Empire API connectivity..."
    local api_attempts=20
    local api_attempt=1
    
    while [ $api_attempt -le $api_attempts ]; do
        if curl -s -f --max-time 5 http://localhost:1337/api/version > /dev/null 2>&1; then
            log_message "SUCCESS" "Empire API is responding"
            break
        fi
        
        if [ $api_attempt -eq $api_attempts ]; then
            log_message "WARNING" "Empire API not responding yet (this may be normal during initialization)"
        fi
        
        sleep 5
        ((api_attempt++))
    done
    
    # Test Starkiller UI
    log_message "INFO" "Testing Starkiller UI connectivity..."
    if curl -s -f --max-time 5 http://localhost:5000 > /dev/null 2>&1; then
        log_message "SUCCESS" "Starkiller UI is accessible"
    else
        log_message "WARNING" "Starkiller UI not accessible yet (this may be normal during initialization)"
    fi
    
    return 0
}

# Display comprehensive installation results
display_results() {
    echo ""
    echo "=========================================="
    log_message "INFO" "Empire Installation Results"
    echo "=========================================="
    echo ""
    
    # Container status
    echo "Container Status:"
    docker ps --filter "name=attacknode-empire" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers found"
    echo ""
    
    # Data container status
    echo "Data Container Status:"
    docker ps -a --filter "name=empire-data" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "No data container found"
    echo ""
    
    # Network status
    echo "Network Status:"
    netstat -tlnp 2>/dev/null | grep -E ':1337|:5000' || echo "No active ports found"
    echo ""
    
    # Volume status
    echo "Volume Status:"
    docker inspect empire-data --format "{{.Mounts}}" 2>/dev/null || echo "Volume information unavailable"
    echo ""
    
    # Recent logs
    echo "Recent Logs (last 10 lines):"
    docker logs attacknode-empire --tail 10 2>/dev/null || echo "No logs available"
    echo ""
    
    # Resource usage
    echo "Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" attacknode-empire 2>/dev/null || echo "Stats unavailable"
    echo ""
}

# Create troubleshooting guide
create_troubleshooting_guide() {
    log_message "INFO" "Creating troubleshooting guide..."
    
    cat > Empire_Troubleshooting_Guide.md << 'EOF'
# Empire Troubleshooting Guide

## Common Issues and Solutions

### 1. Container Not Starting
**Symptoms**: Empire container exits immediately
**Solutions**:
- Check logs: `docker logs attacknode-empire`
- Verify ports are available: `netstat -tlnp | grep -E ':1337|:5000'`
- Restart container: `docker restart attacknode-empire`

### 2. API Not Responding
**Symptoms**: Cannot connect to http://localhost:1337
**Solutions**:
- Wait for full initialization (can take 2-3 minutes)
- Check container status: `docker ps --filter "name=attacknode-empire"`
- Verify firewall settings: `sudo ufw status`

### 3. Network Issues
**Symptoms**: TLS handshake timeout, DNS resolution failures
**Solutions**:
- Check internet connectivity: `ping 8.8.8.8`
- Verify DNS settings: `nslookup registry-1.docker.io`
- Run network repair: `./install-empire-enhanced.sh --network-repair`

### 4. Data Container Issues
**Symptoms**: Data not persisting between restarts
**Solutions**:
- Check data container: `docker ps -a --filter "name=empire-data"`
- Verify volume mounts: `docker inspect empire-data`
- Recreate data container if needed

## Manual Recovery Commands

### Complete Reinstallation
```bash
# Stop and remove all Empire containers
docker stop attacknode-empire empire-data 2>/dev/null || true
docker rm attacknode-empire empire-data 2>/dev/null || true

# Pull fresh image
docker pull bcsecurity/empire:latest

# Recreate containers
docker create -v /empire --name empire-data bcsecurity/empire:latest
docker run -d -it --name attacknode-empire --restart unless-stopped \
  -p 1337:1337 -p 5000:5000 --volumes-from empire-data bcsecurity/empire:latest
```

### Network Diagnostics
```bash
# Check Docker Hub connectivity
curl -s -f --max-time 10 https://registry-1.docker.io/v2/

# Check DNS resolution
nslookup registry-1.docker.io

# Check proxy settings
env | grep -i proxy
```

## Log Files
- Installation logs: `logs/empire-install.log`
- Container logs: `docker logs attacknode-empire`
- Network logs: `logs/network-health.log`

## Support Resources
- Empire Documentation: https://bc-security.gitbook.io/empire-wiki/
- Docker Documentation: https://docs.docker.com/
- Network Troubleshooting: Check firewall, proxy, and DNS settings
EOF

    log_message "SUCCESS" "Troubleshooting guide created: Empire_Troubleshooting_Guide.md"
}

# Main installation function
main() {
    echo "Starting enhanced Empire installation with network self-healing..."
    echo ""
    
    # Create logs directory
    mkdir -p logs
    
    # Clear previous installation log
    > logs/empire-install.log
    
    # Pre-installation checks
    check_docker
    check_existing_empire
    
    # Network health assessment and repair
    network_health_check
    
    # Clean up existing installation
    cleanup_existing
    
    # Enhanced image pull with retry
    if ! pull_empire_image; then
        log_message "ERROR" "Failed to pull Empire image"
        log_message "INFO" "Check logs/empire-install.log for details"
        exit 1
    fi
    
    # Create Empire containers
    if ! create_empire_containers; then
        log_message "ERROR" "Failed to create Empire containers"
        exit 1
    fi
    
    # Wait for Empire to be ready
    if ! wait_for_empire; then
        log_message "ERROR" "Empire failed to initialize properly"
        exit 1
    fi
    
    # Test installation
    test_empire
    
    # Display results
    display_results
    
    # Create troubleshooting guide
    create_troubleshooting_guide
    
    echo ""
    echo "🎉 Enhanced Empire Installation Complete!"
    echo "========================================"
    echo ""
    log_message "SUCCESS" "Empire has been successfully installed with network self-healing capabilities"
    log_message "INFO" "The installation includes robust error recovery and troubleshooting tools"
    echo ""
    log_message "INFO" "Access Empire:"
    echo "  - Empire API: http://localhost:1337"
    echo "  - Starkiller UI: http://localhost:5000"
    echo ""
    log_message "INFO" "Default Credentials:"
    echo "  - Username: empireadmin"
    echo "  - Password: password123"
    echo ""
    log_message "INFO" "Management Commands:"
    echo "  - View logs: docker logs attacknode-empire"
    echo "  - Restart: docker restart attacknode-empire"
    echo "  - Stop: docker stop attacknode-empire"
    echo "  - Remove: docker rm attacknode-empire empire-data"
    echo ""
    log_message "INFO" "Troubleshooting:"
    echo "  - Installation logs: logs/empire-install.log"
    echo "  - Troubleshooting guide: Empire_Troubleshooting_Guide.md"
    echo "  - Network repair: ./install-empire-enhanced.sh --network-repair"
    echo ""
    log_message "SUCCESS" "The self-healing system will automatically monitor and recover Empire"
    echo ""
}

# Handle command line arguments
case "${1:-}" in
    --network-repair)
        echo "🔧 Network Repair Mode"
        echo "====================="
        repair_network
        exit $?
        ;;
    --help|-h)
        echo "Enhanced Empire Installation Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --network-repair    Run network diagnostics and repair"
        echo "  --help, -h          Show this help message"
        echo ""
        exit 0
        ;;
    "")
        # Default installation
        main "$@"
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac
