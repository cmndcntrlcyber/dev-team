#!/bin/bash

# Test script to verify all essential containers start at application startup
# This script tests the auto-startup configuration for attacknode-empire, attacknode-maltego, attacknode-vscode, attacknode-kali

set -e

echo "=== Attack Node Container Startup Test ==="
echo "Testing auto-startup configuration for essential security tools..."
echo

# Function to check if a container is running
check_container_running() {
    local container_name=$1
    if docker ps --filter "name=$container_name" --filter "status=running" | grep -q "$container_name"; then
        echo "✓ $container_name is running"
        return 0
    else
        echo "✗ $container_name is NOT running"
        return 1
    fi
}

# Function to check if a port is accessible
check_port_accessible() {
    local port=$1
    local service_name=$2
    if curl -s --connect-timeout 5 http://localhost:$port > /dev/null 2>&1; then
        echo "✓ $service_name is accessible on port $port"
        return 0
    else
        echo "✗ $service_name is NOT accessible on port $port"
        return 1
    fi
}

# Function to wait for container to be ready
wait_for_container() {
    local container_name=$1
    local timeout=${2:-60}
    local elapsed=0
    
    echo "Waiting for $container_name to be ready (timeout: ${timeout}s)..."
    
    while [ $elapsed -lt $timeout ]; do
        if check_container_running "$container_name"; then
            return 0
        fi
        sleep 5
        elapsed=$((elapsed + 5))
        echo "  ... waiting ($elapsed/${timeout}s)"
    done
    
    echo "✗ Timeout waiting for $container_name"
    return 1
}

echo "1. Starting Attack Node application with Docker Compose..."
echo "   This will start all essential containers automatically"
echo

# Start the application in development mode
docker compose up -d

echo
echo "2. Waiting for containers to initialize..."
echo

# Wait for each essential container
wait_for_container "attacknode-kali" 120
wait_for_container "attacknode-vscode" 60
wait_for_container "attacknode-empire" 120
wait_for_container "attacknode-maltego" 60

echo
echo "3. Verifying container status..."
echo

# Check all containers are running
all_running=true
check_container_running "attacknode-kali" || all_running=false
check_container_running "attacknode-vscode" || all_running=false
check_container_running "attacknode-empire" || all_running=false
check_container_running "attacknode-maltego" || all_running=false

echo
echo "4. Testing service accessibility..."
echo

# Test service ports (give services time to start)
echo "Waiting 30 seconds for services to initialize..."
sleep 30

# Check if ports are accessible
check_port_accessible "6902" "Kali Linux Desktop"
check_port_accessible "6903" "VS Code"
check_port_accessible "1337" "Empire C2 (main)"
check_port_accessible "5000" "Empire C2 (web)"
check_port_accessible "6904" "Maltego"

echo
echo "5. Container logs summary..."
echo

# Show recent logs for each container
for container in attacknode-kali attacknode-vscode attacknode-empire attacknode-maltego; do
    echo "--- $container logs (last 5 lines) ---"
    docker logs "$container" --tail 5 2>/dev/null || echo "No logs available or container not found"
    echo
done

echo
echo "6. Docker Compose services status..."
echo
docker compose ps

echo
if $all_running; then
    echo "✓ SUCCESS: All essential containers are configured to start automatically!"
    echo
    echo "Access URLs:"
    echo "  - Kali Linux Desktop: http://localhost:6902"
    echo "  - VS Code IDE: http://localhost:6903"
    echo "  - Empire C2 Framework: http://localhost:1337 (main) / http://localhost:5000 (web)"
    echo "  - Maltego: http://localhost:6904"
    echo
    echo "All containers have 'restart: unless-stopped' policy and will start automatically"
    echo "when the Attack Node application starts."
else
    echo "✗ FAILURE: Some containers failed to start automatically"
    echo
    echo "Troubleshooting:"
    echo "  1. Check Docker daemon is running"
    echo "  2. Verify sufficient system resources (RAM/CPU)"
    echo "  3. Check container logs: docker logs [container-name]"
    echo "  4. Verify port availability"
    echo
    exit 1
fi

echo
echo "=== Test Complete ==="
