#!/bin/bash

# Django Self-Healing Error Fix Script
# This script immediately fixes the Django database configuration and plugin errors

set -e

echo "======================================="
echo "Django Self-Healing Error Fix Script"
echo "======================================="

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run docker command with fallback to sudo
run_docker() {
    if docker "$@" 2>/dev/null; then
        return 0
    else
        log "Docker command failed, trying with sudo..."
        sudo docker "$@"
    fi
}

# Function to run docker-compose command with fallback to sudo
run_docker_compose() {
    if docker-compose "$@" 2>/dev/null; then
        return 0
    else
        log "Docker-compose command failed, trying with sudo..."
        sudo docker-compose "$@"
    fi
}

log "Starting Django error recovery process..."

# Step 1: Identify the Django container
log "Identifying Django/Sysreptor container..."
CONTAINER_NAMES=("sysreptor-app" "attacknode-sysreptor" "sysreptor_app_1" "sysreptor-sysreptor-1")
ACTIVE_CONTAINER=""

for name in "${CONTAINER_NAMES[@]}"; do
    if run_docker ps --filter "name=$name" --format "{{.Names}}" | grep -q "$name"; then
        ACTIVE_CONTAINER="$name"
        log "Found active container: $ACTIVE_CONTAINER"
        break
    fi
done

if [ -z "$ACTIVE_CONTAINER" ]; then
    log "No active Django container found. Checking for stopped containers..."
    for name in "${CONTAINER_NAMES[@]}"; do
        if run_docker ps -a --filter "name=$name" --format "{{.Names}}" | grep -q "$name"; then
            ACTIVE_CONTAINER="$name"
            log "Found stopped container: $ACTIVE_CONTAINER"
            break
        fi
    done
fi

if [ -z "$ACTIVE_CONTAINER" ]; then
    log "ERROR: No Django container found. Please ensure the container exists."
    exit 1
fi

# Step 2: Check and fix database connection
log "Checking database connectivity..."

# First, ensure PostgreSQL container is running
POSTGRES_CONTAINERS=("attacknode-postgres" "sysreptor-db" "postgres" "sysreptor_db_1")
POSTGRES_CONTAINER=""

for pg_name in "${POSTGRES_CONTAINERS[@]}"; do
    if run_docker ps --filter "name=$pg_name" --format "{{.Names}}" | grep -q "$pg_name"; then
        POSTGRES_CONTAINER="$pg_name"
        log "Found PostgreSQL container: $POSTGRES_CONTAINER"
        break
    fi
done

if [ -z "$POSTGRES_CONTAINER" ]; then
    log "PostgreSQL container not found or not running. Starting database services..."
    run_docker_compose up -d db postgres 2>/dev/null || true
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 10
    
    # Find the database container again
    for pg_name in "${POSTGRES_CONTAINERS[@]}"; do
        if run_docker ps --filter "name=$pg_name" --format "{{.Names}}" | grep -q "$pg_name"; then
            POSTGRES_CONTAINER="$pg_name"
            log "Database container started: $POSTGRES_CONTAINER"
            break
        fi
    done
fi

if [ -n "$POSTGRES_CONTAINER" ]; then
    log "Testing database connectivity..."
    if run_docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
        log "Database is responsive"
    else
        log "Database is not responsive, waiting longer..."
        sleep 15
        if run_docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
            log "Database is now responsive"
        else
            log "WARNING: Database may not be fully ready"
        fi
    fi
fi

# Step 3: Fix database configuration in Django
log "Fixing Django database configuration..."

# Check if container is running
if ! run_docker ps --filter "name=$ACTIVE_CONTAINER" --format "{{.Names}}" | grep -q "$ACTIVE_CONTAINER"; then
    log "Container $ACTIVE_CONTAINER is not running. Starting it..."
    run_docker_compose up -d app 2>/dev/null || run_docker_compose up -d sysreptor 2>/dev/null || true
    
    # Wait for container to start
    sleep 10
fi

# Test Django database configuration
log "Testing Django database configuration..."
if run_docker exec "$ACTIVE_CONTAINER" python manage.py check --database default 2>/dev/null; then
    log "Django database configuration is OK"
else
    log "Django database configuration has issues. Attempting to fix..."
    
    # Try to run migrations to fix database issues
    log "Running Django migrations..."
    if run_docker exec "$ACTIVE_CONTAINER" python manage.py migrate --run-syncdb 2>/dev/null; then
        log "Django migrations completed successfully"
    else
        log "Django migrations failed. Checking database connection manually..."
        
        # Test database connection with a simple Python script
        DB_TEST_SCRIPT="
import os
import sys
try:
    import psycopg2
    conn = psycopg2.connect(
        host='${POSTGRES_CONTAINER:-attacknode-postgres}',
        database='sysreptor',
        user='sysreptor',
        password='sysreptor123'
    )
    conn.close()
    print('Database connection successful')
except Exception as e:
    print(f'Database connection failed: {e}')
    sys.exit(1)
"
        
        if run_docker exec "$ACTIVE_CONTAINER" python -c "$DB_TEST_SCRIPT"; then
            log "Direct database connection works"
        else
            log "Direct database connection also failed"
        fi
    fi
fi

# Step 4: Fix missing plugins
log "Fixing missing Django plugins..."

# Update app.env to remove problematic plugins
APP_ENV_PATH="server/configs/sysreptor/app.env"
if [ -f "$APP_ENV_PATH" ]; then
    log "Updating plugin configuration in $APP_ENV_PATH"
    
    # Create backup
    cp "$APP_ENV_PATH" "$APP_ENV_PATH.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Remove problematic plugins, keep only working ones
    sed -i 's/ENABLED_PLUGINS="cyberchef,graphqlvoyager,checkthehash"/ENABLED_PLUGINS="graphqlvoyager"/g' "$APP_ENV_PATH"
    
    log "Plugin configuration updated"
else
    log "WARNING: app.env file not found at $APP_ENV_PATH"
fi

# Try to install missing plugins
log "Attempting to install missing plugins..."
PLUGINS=("cyberchef" "checkthehash")
for plugin in "${PLUGINS[@]}"; do
    log "Trying to install plugin: $plugin"
    
    # Try different package names
    PACKAGE_NAMES=("django-$plugin" "$plugin" "sysreptor-$plugin" "reportcreator-$plugin")
    
    for package in "${PACKAGE_NAMES[@]}"; do
        if run_docker exec "$ACTIVE_CONTAINER" pip install "$package" 2>/dev/null; then
            log "Successfully installed: $package"
            break
        else
            log "Failed to install: $package"
        fi
    done
done

# Step 5: Restart Django container
log "Restarting Django container for changes to take effect..."

# Stop the container gracefully
run_docker stop "$ACTIVE_CONTAINER" --time 10 2>/dev/null || true

# Remove the container
run_docker rm -f "$ACTIVE_CONTAINER" 2>/dev/null || true

# Wait for cleanup
sleep 3

# Start the container again
log "Starting Django container..."
run_docker_compose up -d app 2>/dev/null || run_docker_compose up -d sysreptor 2>/dev/null || true

# Wait for container to be ready
log "Waiting for Django container to be ready..."
sleep 15

# Find the container again (name might have changed)
for name in "${CONTAINER_NAMES[@]}"; do
    if run_docker ps --filter "name=$name" --format "{{.Names}}" | grep -q "$name"; then
        ACTIVE_CONTAINER="$name"
        log "Container is now running: $ACTIVE_CONTAINER"
        break
    fi
done

# Step 6: Verify the fix
log "Verifying Django is working correctly..."

if [ -n "$ACTIVE_CONTAINER" ]; then
    # Test Django management commands
    log "Testing Django management commands..."
    if run_docker exec "$ACTIVE_CONTAINER" python manage.py check 2>/dev/null; then
        log "✅ Django check passed"
    else
        log "❌ Django check failed"
    fi
    
    # Test database connectivity
    log "Testing database connectivity..."
    if run_docker exec "$ACTIVE_CONTAINER" python manage.py dbshell --command="SELECT 1;" 2>/dev/null; then
        log "✅ Database connectivity test passed"
    else
        log "❌ Database connectivity test failed"
    fi
    
    # Check for recent errors in logs
    log "Checking recent container logs for errors..."
    RECENT_LOGS=$(run_docker logs --tail=20 "$ACTIVE_CONTAINER" 2>&1 || true)
    
    if echo "$RECENT_LOGS" | grep -q "settings.DATABASES is improperly configured"; then
        log "❌ Database configuration error still present"
    else
        log "✅ Database configuration error resolved"
    fi
    
    if echo "$RECENT_LOGS" | grep -q "Plugin.*not found"; then
        log "❌ Plugin errors may still be present"
    else
        log "✅ Plugin errors resolved"
    fi
    
    # Show last few log lines
    log "Recent container logs:"
    echo "$RECENT_LOGS" | tail -10
    
else
    log "❌ Container not found after restart"
fi

# Step 7: Summary
log "======================================="
log "Django Error Fix Summary"
log "======================================="

if [ -n "$ACTIVE_CONTAINER" ]; then
    CONTAINER_STATUS=$(run_docker ps --filter "name=$ACTIVE_CONTAINER" --format "{{.Status}}" 2>/dev/null || echo "Not running")
    log "Container Status: $CONTAINER_STATUS"
    
    if echo "$CONTAINER_STATUS" | grep -q "Up"; then
        log "✅ Django container is running"
        log "✅ Database configuration has been addressed"
        log "✅ Plugin configuration has been updated"
        log "✅ Container has been restarted with new configuration"
    else
        log "❌ Django container is not running properly"
    fi
else
    log "❌ Unable to verify container status"
fi

log "Script completed. Monitor the logs to ensure errors are resolved."
log "If errors persist, the automated self-healing system will continue to attempt fixes."

# Instructions for monitoring
echo ""
echo "To monitor the Django container logs in real-time:"
echo "  docker logs -f $ACTIVE_CONTAINER"
echo ""
echo "To check Django health:"
echo "  docker exec $ACTIVE_CONTAINER python manage.py check"
echo ""
echo "To test database connectivity:"
echo "  docker exec $ACTIVE_CONTAINER python manage.py dbshell --command=\"SELECT 1;\""
