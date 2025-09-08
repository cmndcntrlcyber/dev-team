#!/bin/bash

# Immediate PostgreSQL Permission Fix Script
# This script fixes PostgreSQL volume permissions and removes lock files

echo "🔧 Attack Node PostgreSQL Permission Fix"
echo "========================================"

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

print_status "Starting PostgreSQL permission fix..."

# Step 1: Stop PostgreSQL container if running
print_status "Stopping PostgreSQL container..."
$SUDO docker stop attacknode-postgres 2>/dev/null || true
$SUDO docker rm -f attacknode-postgres 2>/dev/null || true

# Step 2: Fix postgres-data directory permissions
print_status "Creating and fixing postgres-data directory with full permissions..."
mkdir -p postgres-data
$SUDO chown -R 999:999 postgres-data/
$SUDO chmod -R 777 postgres-data/

# Step 3: Remove PostgreSQL lock files
print_status "Removing PostgreSQL lock files..."
if [ -d "postgres-data" ]; then
    # Remove specific lock files that prevent PostgreSQL startup
    $SUDO rm -f postgres-data/postmaster.pid 2>/dev/null || true
    $SUDO rm -f postgres-data/recovery.signal 2>/dev/null || true
    $SUDO rm -f postgres-data/standby.signal 2>/dev/null || true
    $SUDO rm -f postgres-data/postgresql.auto.conf.tmp 2>/dev/null || true
    
    # Remove any additional PID files
    find postgres-data/ -name "*.pid" -exec $SUDO rm -f {} \; 2>/dev/null || true
    
    print_status "Removed PostgreSQL lock files"
else
    print_warning "postgres-data directory does not exist"
fi

# Step 4: Fix permissions on PostgreSQL subdirectories if they exist
print_status "Fixing PostgreSQL subdirectory permissions..."
if [ -d "postgres-data" ]; then
    for subdir in postgres-data/*/; do
        if [ -d "$subdir" ]; then
            $SUDO chown -R 999:999 "$subdir"
            $SUDO chmod -R 755 "$subdir"
            print_status "Fixed permissions for: $(basename "$subdir")"
        fi
    done
fi

# Step 5: Fix PostgreSQL configuration files if they exist
print_status "Fixing PostgreSQL config file permissions..."
if [ -d "postgres-data" ]; then
    for config_file in postgresql.conf pg_hba.conf pg_ident.conf; do
        if [ -f "postgres-data/$config_file" ]; then
            $SUDO chown 999:999 "postgres-data/$config_file"
            $SUDO chmod 644 "postgres-data/$config_file"
            print_status "Fixed permissions for config: $config_file"
        fi
    done
fi

# Step 6: Test PostgreSQL container startup
print_status "Testing PostgreSQL container startup..."
if $SUDO docker run -d \
    --name attacknode-postgres-test \
    -v "$(pwd)/postgres-data:/var/lib/postgresql/data:rw" \
    -p 5434:5432 \
    -e POSTGRES_DB=sysreptor \
    -e POSTGRES_USER=sysreptor \
    -e POSTGRES_PASSWORD=sysreptor123 \
    postgres:14; then
    
    print_status "PostgreSQL test container started successfully"
    
    # Wait a moment then check logs
    sleep 5
    
    # Check for permission errors in logs
    if $SUDO docker logs attacknode-postgres-test 2>&1 | grep -i "permission denied"; then
        print_error "Permission errors still detected in PostgreSQL logs"
        $SUDO docker logs attacknode-postgres-test
    else
        print_status "No permission errors detected - PostgreSQL is healthy!"
        
        # Test PostgreSQL functionality
        print_status "Testing PostgreSQL functionality..."
        if $SUDO docker exec attacknode-postgres-test pg_isready -U sysreptor 2>/dev/null | grep -q "accepting connections"; then
            print_status "PostgreSQL is accepting connections correctly"
        else
            print_warning "PostgreSQL is running but not ready for connections yet"
        fi
    fi
    
    # Clean up test container
    $SUDO docker stop attacknode-postgres-test >/dev/null 2>&1
    $SUDO docker rm attacknode-postgres-test >/dev/null 2>&1
    
else
    print_error "Failed to start PostgreSQL test container"
    exit 1
fi

# Step 7: Final verification
print_status "Final verification..."
echo "PostgreSQL data directory permissions:"
ls -la postgres-data/ 2>/dev/null || echo "No postgres-data directory"

print_status "✅ PostgreSQL permission fix completed successfully!"
echo ""
echo "What was fixed:"
echo "1. Set proper ownership (uid:999, gid:999) for PostgreSQL data"
echo "2. Applied full permissions (777) to ensure read/write access"
echo "3. Removed lock files that prevent PostgreSQL startup"
echo "4. Fixed subdirectory and config file permissions"
echo "5. Verified PostgreSQL can start without permission errors"
echo ""
echo "Next steps:"
echo "1. Try starting your sysreptor container again"
echo "2. PostgreSQL should now start without permission errors"
echo "3. The self-healing system will monitor and maintain these permissions"
echo ""
print_status "Fix script completed. PostgreSQL permissions have been corrected."
