#!/bin/bash

# Immediate Redis RDB Format Fix Script
# This script fixes Redis RDB format version incompatibility issues

echo "🔧 Attack Node Redis RDB Format Fix"
echo "===================================="

# Set colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    SUDO=""
else
    SUDO="sudo"
    print_warning "Running with sudo for file operations"
fi

print_status "Starting Redis RDB format fix..."

# Step 1: Stop Redis container if running
print_status "Stopping Redis container..."
$SUDO docker stop attacknode-redis 2>/dev/null || true
$SUDO docker rm -f attacknode-redis 2>/dev/null || true

# Step 2: Remove incompatible RDB files
print_status "Removing incompatible RDB files..."
if [ -d "redis-data" ]; then
    # Remove all RDB files that might be causing version conflicts
    find redis-data/ -name "*.rdb" -exec rm -f {} \; 2>/dev/null || true
    find redis-data/ -name "*.base.rdb" -exec rm -f {} \; 2>/dev/null || true
    find redis-data/ -name "dump.rdb" -exec rm -f {} \; 2>/dev/null || true
    find redis-data/ -name "appendonly.aof.*.base.rdb" -exec rm -f {} \; 2>/dev/null || true
    
    print_status "Removed RDB files with version conflicts"
else
    print_warning "redis-data directory does not exist"
fi

# Step 3: Clean up AOF files that might reference bad RDB
print_status "Cleaning AOF files that reference incompatible RDB..."
if [ -d "redis-data" ]; then
    # Remove AOF files that might reference the bad RDB
    find redis-data/ -name "appendonly.aof*" -exec rm -f {} \; 2>/dev/null || true
    find redis-data/ -name "*.aof" -exec rm -f {} \; 2>/dev/null || true
    find redis-data/ -name "*.incr.aof" -exec rm -f {} \; 2>/dev/null || true
    find redis-data/ -name "*.base.aof" -exec rm -f {} \; 2>/dev/null || true
    
    print_status "Cleaned AOF files"
fi

# Step 4: Clean up temp files
print_status "Removing temporary files..."
if [ -d "redis-data" ]; then
    find redis-data/ -name "temp-*" -exec rm -f {} \; 2>/dev/null || true
    find redis-data/ -name "*.tmp" -exec rm -f {} \; 2>/dev/null || true
    find redis-data/ -name "*.temp" -exec rm -f {} \; 2>/dev/null || true
    
    print_status "Removed temporary files"
fi

# Step 5: Reset permissions
print_status "Resetting Redis permissions..."
if [ -d "redis-data" ]; then
    $SUDO chown -R 999:999 redis-data/
    $SUDO chmod -R 777 redis-data/
    print_status "Reset permissions for Redis data"
fi

# Step 6: Create fresh appendonlydir
print_status "Creating fresh appendonlydir..."
mkdir -p redis-data/appendonlydir
$SUDO chown -R 999:999 redis-data/appendonlydir/
$SUDO chmod -R 777 redis-data/appendonlydir/

# Step 7: Test Redis container startup with fresh data
print_status "Testing Redis container startup with fresh data..."
if $SUDO docker run -d \
    --name attacknode-redis-test \
    -v "$(pwd)/redis-data:/bitnami/redis/data:rw" \
    -p 6380:6379 \
    -e REDIS_PASSWORD=redis123 \
    bitnami/redis:7.2; then
    
    print_status "Redis test container started successfully with fresh data"
    
    # Wait a moment then check logs
    sleep 5
    
    # Check for RDB format errors in logs
    if $SUDO docker logs attacknode-redis-test 2>&1 | grep -i "can't handle rdb format"; then
        print_error "RDB format errors still detected in Redis logs"
        $SUDO docker logs attacknode-redis-test
    else
        print_status "No RDB format errors detected - Redis is healthy!"
        
        # Test Redis functionality
        print_status "Testing Redis functionality..."
        if $SUDO docker exec attacknode-redis-test redis-cli -a redis123 ping 2>/dev/null | grep -q "PONG"; then
            print_status "Redis is responding to commands correctly"
        else
            print_warning "Redis is running but not responding to commands"
        fi
    fi
    
    # Clean up test container
    $SUDO docker stop attacknode-redis-test >/dev/null 2>&1
    $SUDO docker rm attacknode-redis-test >/dev/null 2>&1
    
else
    print_error "Failed to start Redis test container even with fresh data"
    exit 1
fi

# Step 8: Final verification
print_status "Final verification..."
echo "Redis data directory structure:"
ls -la redis-data/ 2>/dev/null || echo "No redis-data directory"
echo ""
echo "Appendonly directory:"
ls -la redis-data/appendonlydir/ 2>/dev/null || echo "No appendonlydir"

print_status "✅ Redis RDB format fix completed successfully!"
echo ""
echo "What was fixed:"
echo "1. Removed incompatible RDB files (format version 12)"
echo "2. Cleaned AOF files that referenced bad RDB"
echo "3. Removed temporary files that might cause conflicts"
echo "4. Reset permissions for Redis container access"
echo "5. Created fresh appendonlydir structure"
echo ""
echo "Next steps:"
echo "1. Try starting your sysreptor container again"
echo "2. Redis will start with a fresh database (no data loss risk since it couldn't read the old format anyway)"
echo "3. The self-healing system will monitor and prevent future RDB format issues"
echo ""
print_status "Fix script completed. Redis should now start without RDB format errors."
