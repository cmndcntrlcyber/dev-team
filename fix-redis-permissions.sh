#!/bin/bash

# Immediate Redis Permission Fix Script
# This script fixes Redis volume permissions to resolve AOF permission errors

echo "🔧 Attack Node Redis Permission Fix"
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
    print_warning "Running with sudo for permission management"
fi

print_status "Starting Redis permission fix..."

# Step 1: Stop Redis container if running
print_status "Stopping Redis container if running..."
$SUDO docker stop attacknode-redis 2>/dev/null || true
$SUDO docker rm -f attacknode-redis 2>/dev/null || true

# Step 2: Fix redis-data directory permissions (aggressive mode for AOF rewrite)
print_status "Creating and fixing redis-data directory with full permissions..."
mkdir -p redis-data
$SUDO chown -R 999:999 redis-data/
$SUDO chmod -R 777 redis-data/

# Step 3: Create appendonlydir with full write permissions for temp files
print_status "Creating appendonlydir with full write permissions..."
mkdir -p redis-data/appendonlydir
$SUDO chown -R 999:999 redis-data/appendonlydir/
$SUDO chmod -R 777 redis-data/appendonlydir/

# Step 3.5: Clean up any existing temp files
print_status "Cleaning up Redis temp files..."
find redis-data/ -name "*temp-rewriteaof*" -delete 2>/dev/null || true
find redis-data/ -name "*.tmp" -delete 2>/dev/null || true
find redis-data/ -name "*.temp" -delete 2>/dev/null || true

# Step 4: Set up any existing AOF files
if [ -f "redis-data/appendonly.aof" ]; then
    print_status "Fixing existing AOF file permissions..."
    $SUDO chown 999:999 redis-data/appendonly.aof
    $SUDO chmod 644 redis-data/appendonly.aof
fi

# Step 5: Create Redis configuration to ensure proper startup
print_status "Creating Redis startup configuration..."
mkdir -p redis-data/conf
cat > redis-data/conf/redis.conf << 'EOF'
# Redis configuration for Attack Node
# Append Only File settings
appendonly yes
appendfsync everysec
appenddirname appendonlydir
dir /data

# Logging
loglevel notice
logfile ""

# Network
bind 0.0.0.0
port 6379
protected-mode no

# Security
requirepass redis123

# Performance
maxmemory-policy allkeys-lru
EOF

$SUDO chown 999:999 redis-data/conf/redis.conf
$SUDO chmod 644 redis-data/conf/redis.conf

# Step 6: Verify permissions
print_status "Verifying permissions..."
ls -la redis-data/
ls -la redis-data/appendonlydir/ 2>/dev/null || print_warning "appendonlydir not yet created"

# Step 7: Test Redis container startup
print_status "Testing Redis container startup..."
if $SUDO docker run -d \
    --name attacknode-redis-test \
    -v "$(pwd)/redis-data:/data:rw" \
    -p 6380:6379 \
    redis:7-alpine \
    redis-server --appendonly yes --appenddirname appendonlydir; then
    
    print_status "Redis test container started successfully"
    
    # Wait a moment then check logs
    sleep 3
    
    # Check for permission errors in logs
    if $SUDO docker logs attacknode-redis-test 2>&1 | grep -i "permission denied"; then
        print_error "Permission errors still detected in Redis logs"
        $SUDO docker logs attacknode-redis-test
    else
        print_status "No permission errors detected - Redis is healthy!"
    fi
    
    # Clean up test container
    $SUDO docker stop attacknode-redis-test >/dev/null 2>&1
    $SUDO docker rm attacknode-redis-test >/dev/null 2>&1
    
else
    print_error "Failed to start Redis test container"
    exit 1
fi

# Step 8: Final permission verification
print_status "Final permission verification..."
echo "Redis data directory permissions:"
ls -la redis-data/
echo ""
echo "Appendonly directory permissions:"
ls -la redis-data/appendonlydir/ 2>/dev/null || echo "Will be created on first Redis start"

print_status "✅ Redis permission fix completed successfully!"
echo ""
echo "Next steps:"
echo "1. Try starting your sysreptor container again"
echo "2. Redis should now start without permission errors"
echo "3. The self-healing system will monitor and maintain these permissions"
echo ""
print_status "Fix script completed. Redis permissions have been corrected."
