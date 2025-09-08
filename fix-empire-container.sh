#!/bin/bash

# Empire Container Troubleshooting & Self-Healing Script
# This script provides comprehensive Empire container diagnosis and repair

set -e

echo "🏴‍☠️ Empire Container Troubleshooting & Self-Healing System"
echo "==========================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="attacknode-empire"
DATA_CONTAINER="empire-data"
EMPIRE_IMAGE="bcsecurity/empire:latest"
API_PORT="1337"
STARKILLER_PORT="5000"
LOG_FILE="logs/empire-container-repair.log"
MAX_RETRIES=3
STARTUP_TIMEOUT=180

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

print_empire() {
    echo -e "${MAGENTA}[EMPIRE]${NC} $1"
}

print_docker() {
    echo -e "${CYAN}[DOCKER]${NC} $1"
}

# Enhanced logging function
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Log to file
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    # Also print to console
    case $level in
        "INFO") print_status "$message" ;;
        "SUCCESS") print_success "$message" ;;
        "WARNING") print_warning "$message" ;;
        "ERROR") print_error "$message" ;;
        "EMPIRE") print_empire "$message" ;;
        "DOCKER") print_docker "$message" ;;
    esac
}

# Check if running as root or with sudo access
check_permissions() {
    log_message "INFO" "Checking permissions..."
    
    if ! docker info >/dev/null 2>&1; then
        if ! sudo docker info >/dev/null 2>&1; then
            log_message "ERROR" "Cannot access Docker daemon. Please ensure Docker is running and you have proper permissions."
            exit 1
        else
            log_message "WARNING" "Using sudo for Docker commands"
            DOCKER_CMD="sudo docker"
        fi
    else
        DOCKER_CMD="docker"
    fi
    
    log_message "SUCCESS" "Docker access confirmed"
}

# Check system resources
check_system_resources() {
    log_message "INFO" "Checking system resources..."
    
    # Check available memory
    local available_memory=$(free -m | awk 'NR==2{printf "%.1f", $7/1024 }')
    if (( $(echo "$available_memory < 1.0" | bc -l) )); then
        log_message "WARNING" "Low available memory: ${available_memory}GB"
    else
        log_message "SUCCESS" "Available memory: ${available_memory}GB"
    fi
    
    # Check disk space
    local disk_usage=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log_message "WARNING" "High disk usage: ${disk_usage}%"
    else
        log_message "SUCCESS" "Disk usage: ${disk_usage}%"
    fi
    
    # Check CPU load
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    log_message "INFO" "CPU load average: $cpu_load"
}

# Check port availability
check_port_availability() {
    log_message "INFO" "Checking port availability..."
    
    local ports=("$API_PORT" "$STARKILLER_PORT")
    
    for port in "${ports[@]}"; do
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            local process=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | head -1)
            log_message "WARNING" "Port $port is in use by: $process"
        else
            log_message "SUCCESS" "Port $port is available"
        fi
    done
}

# Get container status
get_container_status() {
    local container_name=$1
    
    if $DOCKER_CMD ps -a --format "{{.Names}}" | grep -q "^${container_name}$"; then
        local status=$($DOCKER_CMD ps -a --filter "name=${container_name}" --format "{{.Status}}")
        echo "$status"
    else
        echo "not_found"
    fi
}

# Get container logs
get_container_logs() {
    local container_name=$1
    local lines=${2:-50}
    
    if $DOCKER_CMD ps -a --format "{{.Names}}" | grep -q "^${container_name}$"; then
        $DOCKER_CMD logs "$container_name" --tail "$lines" 2>&1
    else
        echo "Container not found"
    fi
}

# Analyze container exit reason
analyze_container_exit() {
    local container_name=$1
    
    log_message "INFO" "Analyzing container exit reason..."
    
    if $DOCKER_CMD ps -a --format "{{.Names}}" | grep -q "^${container_name}$"; then
        local exit_code=$($DOCKER_CMD inspect "$container_name" --format "{{.State.ExitCode}}")
        local exit_reason=$($DOCKER_CMD inspect "$container_name" --format "{{.State.Error}}")
        local finished_at=$($DOCKER_CMD inspect "$container_name" --format "{{.State.FinishedAt}}")
        
        log_message "INFO" "Container exit code: $exit_code"
        log_message "INFO" "Container finished at: $finished_at"
        
        if [ -n "$exit_reason" ] && [ "$exit_reason" != "<no value>" ]; then
            log_message "ERROR" "Container exit reason: $exit_reason"
        fi
        
        # Analyze exit code
        case $exit_code in
            0) log_message "SUCCESS" "Container exited normally" ;;
            1) log_message "ERROR" "Container exited with general error" ;;
            125) log_message "ERROR" "Docker daemon error" ;;
            126) log_message "ERROR" "Container command not executable" ;;
            127) log_message "ERROR" "Container command not found" ;;
            130) log_message "WARNING" "Container terminated by SIGINT" ;;
            137) log_message "WARNING" "Container killed by SIGKILL (OOM or manual)" ;;
            143) log_message "WARNING" "Container terminated by SIGTERM" ;;
            *) log_message "WARNING" "Container exited with code: $exit_code" ;;
        esac
    else
        log_message "ERROR" "Container not found for analysis"
    fi
}

# Comprehensive container diagnostics
diagnose_container() {
    log_message "INFO" "Running comprehensive container diagnostics..."
    echo ""
    
    # Check Empire main container
    print_status "Empire Main Container Status:"
    echo "=============================="
    
    local main_status=$(get_container_status "$CONTAINER_NAME")
    echo "Status: $main_status"
    
    if [ "$main_status" != "not_found" ]; then
        if [[ "$main_status" == *"Up"* ]]; then
            print_success "Empire container is running"
        else
            print_error "Empire container is not running"
            analyze_container_exit "$CONTAINER_NAME"
        fi
    else
        print_error "Empire container not found"
    fi
    echo ""
    
    # Check Empire data container
    print_status "Empire Data Container Status:"
    echo "============================"
    
    local data_status=$(get_container_status "$DATA_CONTAINER")
    echo "Status: $data_status"
    
    if [ "$data_status" != "not_found" ]; then
        print_success "Empire data container exists"
    else
        print_warning "Empire data container not found"
    fi
    echo ""
    
    # Check container logs
    print_status "Recent Container Logs:"
    echo "====================="
    
    local logs=$(get_container_logs "$CONTAINER_NAME" 20)
    echo "$logs"
    echo ""
    
    # Check resource usage
    print_status "Container Resource Usage:"
    echo "========================"
    
    if [[ "$main_status" == *"Up"* ]]; then
        $DOCKER_CMD stats "$CONTAINER_NAME" --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null || echo "Stats not available"
    else
        echo "Container not running - no stats available"
    fi
    echo ""
    
    # Check Empire-specific diagnostics
    check_empire_health
}

# Check Empire application health
check_empire_health() {
    print_status "Empire Application Health:"
    echo "========================="
    
    # Check if API is responding
    echo -n "API Health (port $API_PORT): "
    
    # Try multiple Empire API endpoints
    local api_healthy=false
    local endpoints=("http://localhost:$API_PORT/api/admin/users" "http://localhost:$API_PORT/api/users" "http://localhost:$API_PORT/api/" "http://localhost:$API_PORT/")
    
    for endpoint in "${endpoints[@]}"; do
        if curl -s -I "$endpoint" --max-time 5 2>/dev/null | grep -E "HTTP/1.1 (200|401|403)" >/dev/null; then
            api_healthy=true
            break
        fi
    done
    
    # Fallback: check if Empire process is running
    if [ "$api_healthy" = false ]; then
        if $DOCKER_CMD exec "$CONTAINER_NAME" pgrep -f "empire" >/dev/null 2>&1; then
            api_healthy=true
        fi
    fi
    
    if [ "$api_healthy" = true ]; then
        print_success "OK"
    else
        print_error "FAILED"
    fi
    
    # Check if Starkiller is responding
    echo -n "Starkiller Health (port $STARKILLER_PORT): "
    if curl -s -f "http://localhost:$STARKILLER_PORT" --max-time 5 >/dev/null 2>&1; then
        print_success "OK"
    else
        print_error "FAILED"
    fi
    
    # Check Empire database
    echo -n "Database Health: "
    if $DOCKER_CMD exec "$CONTAINER_NAME" ls -la /empire/empire.db >/dev/null 2>&1; then
        print_success "OK"
    else
        print_error "FAILED"
    fi
    
    # Check Empire processes
    echo -n "Empire Processes: "
    if $DOCKER_CMD exec "$CONTAINER_NAME" pgrep -f "empire" >/dev/null 2>&1; then
        print_success "OK"
    else
        print_error "FAILED"
    fi
    
    echo ""
}

# Complete container cleanup
complete_cleanup() {
    log_message "INFO" "Performing complete container cleanup..."
    
    # Stop containers
    log_message "INFO" "Stopping Empire containers..."
    $DOCKER_CMD stop "$CONTAINER_NAME" --time 10 2>/dev/null || true
    $DOCKER_CMD stop "$DATA_CONTAINER" --time 10 2>/dev/null || true
    
    # Remove containers
    log_message "INFO" "Removing Empire containers..."
    $DOCKER_CMD rm -f "$CONTAINER_NAME" 2>/dev/null || true
    $DOCKER_CMD rm -f "$DATA_CONTAINER" 2>/dev/null || true
    
    # Clean up any Empire-related containers
    log_message "INFO" "Cleaning up orphaned Empire containers..."
    $DOCKER_CMD rm -f $($DOCKER_CMD ps -aq --filter "name=empire") 2>/dev/null || true
    
    # Clean up unused containers
    $DOCKER_CMD container prune -f 2>/dev/null || true
    
    log_message "SUCCESS" "Container cleanup completed"
}

# Setup Empire volumes
setup_volumes() {
    log_message "INFO" "Setting up Empire volumes..."
    
    local volume_dirs=(
        "uploads/empire/data"
        "uploads/empire/downloads"
        "uploads/empire/logs"
    )
    
    for dir in "${volume_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            chmod 755 "$dir"
            log_message "INFO" "Created volume directory: $dir"
        else
            log_message "INFO" "Volume directory exists: $dir"
        fi
    done
    
    log_message "SUCCESS" "Empire volumes setup completed"
}

# Start Empire container with retry logic
start_empire_container() {
    log_message "INFO" "Starting Empire container with retry logic..."
    
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log_message "INFO" "Start attempt $attempt of $MAX_RETRIES"
        
        if [ $attempt -gt 1 ]; then
            log_message "INFO" "Waiting 10 seconds before retry..."
            sleep 10
        fi
        
        # Try to start Empire container
        if start_empire_container_single; then
            log_message "SUCCESS" "Empire container started successfully"
            return 0
        else
            log_message "ERROR" "Empire container start attempt $attempt failed"
            ((attempt++))
        fi
    done
    
    log_message "ERROR" "Failed to start Empire container after $MAX_RETRIES attempts"
    return 1
}

# Start Empire container (single attempt)
start_empire_container_single() {
    # Step 1: Pull Empire image
    log_message "INFO" "Pulling Empire image..."
    if ! $DOCKER_CMD pull "$EMPIRE_IMAGE"; then
        log_message "ERROR" "Failed to pull Empire image"
        return 1
    fi
    
    # Step 2: Create data container
    log_message "INFO" "Creating Empire data container..."
    if ! $DOCKER_CMD create -v /empire --name "$DATA_CONTAINER" "$EMPIRE_IMAGE" >/dev/null 2>&1; then
        log_message "ERROR" "Failed to create Empire data container"
        return 1
    fi
    
    # Step 3: Start main container
    log_message "INFO" "Starting Empire main container..."
    if ! $DOCKER_CMD run -d -it \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        -p "$API_PORT:$API_PORT" \
        -p "$STARKILLER_PORT:$STARKILLER_PORT" \
        --volumes-from "$DATA_CONTAINER" \
        "$EMPIRE_IMAGE" >/dev/null 2>&1; then
        log_message "ERROR" "Failed to start Empire main container"
        return 1
    fi
    
    # Step 4: Wait for container to be ready
    if wait_for_container_ready; then
        return 0
    else
        return 1
    fi
}

# Wait for container to be ready
wait_for_container_ready() {
    log_message "INFO" "Waiting for Empire container to be ready..."
    
    local start_time=$(date +%s)
    local timeout=$STARTUP_TIMEOUT
    
    while [ $(($(date +%s) - start_time)) -lt $timeout ]; do
        # Check if container is running
        if ! $DOCKER_CMD ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}" | grep -q "Up"; then
            log_message "WARNING" "Container stopped unexpectedly"
            return 1
        fi
        
        # Check Empire startup indicators
        local logs=$(get_container_logs "$CONTAINER_NAME" 50)
        
        if echo "$logs" | grep -q "Application startup complete" && \
           echo "$logs" | grep -q "Uvicorn running on"; then
            log_message "SUCCESS" "Empire container is ready"
            return 0
        fi
        
        # Check for startup errors
        if echo "$logs" | grep -qi "error\|exception\|failed"; then
            log_message "ERROR" "Empire startup errors detected"
            return 1
        fi
        
        sleep 5
    done
    
    log_message "ERROR" "Empire container failed to become ready within timeout"
    return 1
}

# Test Empire functionality
test_empire_functionality() {
    log_message "INFO" "Testing Empire functionality..."
    
    # Test API endpoint
    log_message "INFO" "Testing Empire API..."
    local api_attempts=20
    local api_attempt=1
    
    while [ $api_attempt -le $api_attempts ]; do
        if curl -s -f "http://localhost:$API_PORT/api/version" --max-time 5 >/dev/null 2>&1; then
            log_message "SUCCESS" "Empire API is responding"
            break
        fi
        
        if [ $api_attempt -eq $api_attempts ]; then
            log_message "WARNING" "Empire API not responding (this may be normal during initialization)"
        fi
        
        sleep 5
        ((api_attempt++))
    done
    
    # Test Starkiller UI
    log_message "INFO" "Testing Starkiller UI..."
    if curl -s -f "http://localhost:$STARKILLER_PORT" --max-time 5 >/dev/null 2>&1; then
        log_message "SUCCESS" "Starkiller UI is accessible"
    else
        log_message "WARNING" "Starkiller UI not accessible (this may be normal during initialization)"
    fi
    
    # Test container health
    log_message "INFO" "Testing container health..."
    if $DOCKER_CMD ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}" | grep -q "Up"; then
        log_message "SUCCESS" "Empire container is running"
    else
        log_message "ERROR" "Empire container is not running"
    fi
}

# Display comprehensive status
display_status() {
    echo ""
    echo "=========================================="
    print_status "Empire Container Status Report"
    echo "=========================================="
    echo ""
    
    # Container status
    echo "Container Status:"
    echo "================"
    $DOCKER_CMD ps -a --filter "name=empire" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No Empire containers found"
    echo ""
    
    # Network status
    echo "Network Status:"
    echo "=============="
    netstat -tlnp 2>/dev/null | grep -E ":$API_PORT|:$STARKILLER_PORT" || echo "No Empire ports active"
    echo ""
    
    # Recent logs
    echo "Recent Logs (last 10 lines):"
    echo "============================"
    get_container_logs "$CONTAINER_NAME" 10
    echo ""
    
    # Resource usage
    echo "Resource Usage:"
    echo "=============="
    if $DOCKER_CMD ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}" | grep -q "Up"; then
        $DOCKER_CMD stats "$CONTAINER_NAME" --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null || echo "Stats not available"
    else
        echo "Container not running - no stats available"
    fi
    echo ""
}

# Create Empire recovery script
create_recovery_script() {
    log_message "INFO" "Creating Empire recovery script..."
    
    cat > empire-recovery.sh << 'EOF'
#!/bin/bash
# Emergency Empire Recovery Script

echo "🚨 Emergency Empire Recovery"
echo "=========================="

# Stop and remove all Empire containers
echo "Stopping Empire containers..."
sudo docker stop attacknode-empire empire-data 2>/dev/null || true

echo "Removing Empire containers..."
sudo docker rm -f attacknode-empire empire-data 2>/dev/null || true

# Clean up
echo "Cleaning up..."
sudo docker container prune -f 2>/dev/null || true

echo "Starting Empire recovery..."
./fix-empire-container.sh --repair

echo "Emergency recovery completed!"
EOF
    
    chmod +x empire-recovery.sh
    log_message "SUCCESS" "Emergency recovery script created: empire-recovery.sh"
}

# Main function
main() {
    case "${1:-}" in
        --diagnose|-d)
            check_permissions
            check_system_resources
            check_port_availability
            diagnose_container
            ;;
        --repair|-r)
            check_permissions
            log_message "INFO" "Starting Empire container repair..."
            complete_cleanup
            setup_volumes
            if start_empire_container; then
                test_empire_functionality
                display_status
                log_message "SUCCESS" "Empire container repair completed successfully"
            else
                log_message "ERROR" "Empire container repair failed"
                exit 1
            fi
            ;;
        --cleanup|-c)
            check_permissions
            complete_cleanup
            ;;
        --restart|-restart)
            check_permissions
            log_message "INFO" "Restarting Empire container..."
            $DOCKER_CMD restart "$CONTAINER_NAME" 2>/dev/null || true
            wait_for_container_ready
            test_empire_functionality
            ;;
        --logs|-l)
            check_permissions
            echo "Empire Container Logs:"
            echo "====================="
            get_container_logs "$CONTAINER_NAME" 100
            ;;
        --status|-s)
            check_permissions
            display_status
            ;;
        --recovery|-recovery)
            create_recovery_script
            ;;
        --help|-h)
            echo "Empire Container Troubleshooting & Self-Healing System"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --diagnose, -d     Run comprehensive container diagnostics"
            echo "  --repair, -r       Repair Empire container issues"
            echo "  --cleanup, -c      Clean up Empire containers"
            echo "  --restart          Restart Empire container"
            echo "  --logs, -l         Show Empire container logs"
            echo "  --status, -s       Show Empire container status"
            echo "  --recovery         Create emergency recovery script"
            echo "  --help, -h         Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --diagnose     # Run full diagnostics"
            echo "  $0 --repair       # Repair container issues"
            echo "  $0 --restart      # Restart Empire container"
            echo "  $0 --status       # Show status"
            echo ""
            exit 0
            ;;
        "")
            # Default: run diagnostics and repair if needed
            echo "Running Empire container diagnostics and repair..."
            echo ""
            
            # Clear log file
            > "$LOG_FILE"
            
            # Check permissions
            check_permissions
            
            # Check system resources
            check_system_resources
            
            # Check port availability
            check_port_availability
            
            # Run diagnostics
            diagnose_container
            
            # Check if repair is needed
            local main_status=$(get_container_status "$CONTAINER_NAME")
            if [ "$main_status" = "not_found" ] || [[ "$main_status" != *"Up"* ]]; then
                echo ""
                print_warning "Empire container issues detected. Attempting repair..."
                complete_cleanup
                setup_volumes
                if start_empire_container; then
                    test_empire_functionality
                else
                    print_error "Empire container repair failed"
                    exit 1
                fi
            else
                print_success "Empire container is healthy"
            fi
            
            # Display final status
            display_status
            
            # Create recovery script
            create_recovery_script
            
            echo ""
            log_message "SUCCESS" "Empire container troubleshooting completed"
            echo "Log file: $LOG_FILE"
            echo "Recovery script: empire-recovery.sh"
            echo ""
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
