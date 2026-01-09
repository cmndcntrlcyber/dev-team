#!/bin/bash

###############################################################################
# Chrome DevTools Remote Debugging Launcher
# 
# Automatically launches Chrome/Chromium with remote debugging enabled
# for use with Chrome DevTools MCP server.
#
# Usage: ./chrome-launcher.sh [start|stop|status|restart]
###############################################################################

set -e

# Configuration
DEBUG_PORT=9222
PROFILE_DIR="/tmp/chrome-debug-profile"
PID_FILE="/tmp/chrome-debug.pid"
LOG_FILE="/tmp/chrome-debug.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Find Chrome binary
find_chrome() {
    local chrome_binary=""
    
    # Try common Chrome/Chromium locations
    if command -v google-chrome &> /dev/null; then
        chrome_binary="google-chrome"
    elif command -v chromium-browser &> /dev/null; then
        chrome_binary="chromium-browser"
    elif command -v chromium &> /dev/null; then
        chrome_binary="chromium"
    elif command -v chrome &> /dev/null; then
        chrome_binary="chrome"
    elif [ -f "/usr/bin/google-chrome" ]; then
        chrome_binary="/usr/bin/google-chrome"
    elif [ -f "/usr/bin/chromium-browser" ]; then
        chrome_binary="/usr/bin/chromium-browser"
    fi
    
    echo "$chrome_binary"
}

# Check if Chrome is already running on debug port
is_chrome_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            # PID file exists but process is dead
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    
    # Check if port is in use
    if lsof -Pi :$DEBUG_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "Chrome appears to be running on port $DEBUG_PORT (no PID file)"
        return 0
    fi
    
    return 1
}

# Get Chrome status
get_status() {
    if is_chrome_running; then
        log_success "Chrome is running with remote debugging on port $DEBUG_PORT"
        
        if [ -f "$PID_FILE" ]; then
            local pid=$(cat "$PID_FILE")
            log_info "PID: $pid"
        fi
        
        log_info "Debug URL: http://localhost:$DEBUG_PORT"
        log_info "Profile: $PROFILE_DIR"
        
        # Test connection
        if curl -s "http://localhost:$DEBUG_PORT/json/version" > /dev/null 2>&1; then
            log_success "Debug endpoint is responding"
            echo ""
            echo "Browser Info:"
            curl -s "http://localhost:$DEBUG_PORT/json/version" | jq '.' 2>/dev/null || echo "  (jq not installed for pretty output)"
        else
            log_warning "Debug endpoint is not responding yet"
        fi
        
        return 0
    else
        log_info "Chrome is not running"
        return 1
    fi
}

# Start Chrome with remote debugging
start_chrome() {
    if is_chrome_running; then
        log_warning "Chrome is already running on port $DEBUG_PORT"
        get_status
        return 0
    fi
    
    log_info "Starting Chrome with remote debugging..."
    
    # Find Chrome binary
    local chrome_bin=$(find_chrome)
    if [ -z "$chrome_bin" ]; then
        log_error "Chrome/Chromium not found!"
        log_info "Please install Chrome or Chromium:"
        echo "  Ubuntu/Debian: sudo apt install chromium-browser"
        echo "  Or download from: https://www.google.com/chrome/"
        return 1
    fi
    
    log_info "Using: $chrome_bin"
    
    # Create profile directory
    mkdir -p "$PROFILE_DIR"
    
    # Launch Chrome with remote debugging
    log_info "Launching Chrome..."
    
    # Chrome flags for debugging
    local chrome_flags=(
        --remote-debugging-port=$DEBUG_PORT
        --user-data-dir="$PROFILE_DIR"
        --no-first-run
        --no-default-browser-check
        --disable-popup-blocking
        --disable-background-timer-throttling
        --disable-backgrounding-occluded-windows
        --disable-renderer-backgrounding
    )
    
    # Start Chrome in background
    nohup "$chrome_bin" "${chrome_flags[@]}" > "$LOG_FILE" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid" > "$PID_FILE"
    
    log_info "Chrome PID: $pid"
    log_info "Waiting for Chrome to start..."
    
    # Wait for Chrome to be ready (max 10 seconds)
    local timeout=10
    local elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if curl -s "http://localhost:$DEBUG_PORT/json/version" > /dev/null 2>&1; then
            log_success "Chrome is ready!"
            log_success "Debug endpoint: http://localhost:$DEBUG_PORT"
            log_info "Profile directory: $PROFILE_DIR"
            log_info "Log file: $LOG_FILE"
            echo ""
            log_success "Chrome DevTools MCP can now connect!"
            return 0
        fi
        sleep 1
        elapsed=$((elapsed + 1))
    done
    
    log_error "Chrome started but debug endpoint not responding after ${timeout}s"
    log_info "Check log file: $LOG_FILE"
    return 1
}

# Stop Chrome
stop_chrome() {
    if ! is_chrome_running; then
        log_info "Chrome is not running"
        return 0
    fi
    
    log_info "Stopping Chrome..."
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        log_info "Killing process $pid..."
        
        if kill "$pid" 2>/dev/null; then
            # Wait for process to end
            local timeout=5
            local elapsed=0
            while [ $elapsed -lt $timeout ]; do
                if ! ps -p "$pid" > /dev/null 2>&1; then
                    break
                fi
                sleep 1
                elapsed=$((elapsed + 1))
            done
            
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                log_warning "Process didn't stop gracefully, forcing..."
                kill -9 "$pid" 2>/dev/null || true
            fi
            
            rm -f "$PID_FILE"
            log_success "Chrome stopped"
        else
            log_warning "Process $pid not found (already stopped?)"
            rm -f "$PID_FILE"
        fi
    else
        # Try to kill by port
        log_info "No PID file, trying to find process by port..."
        local pid=$(lsof -ti:$DEBUG_PORT)
        if [ -n "$pid" ]; then
            log_info "Found process $pid on port $DEBUG_PORT"
            kill "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
            log_success "Chrome stopped"
        fi
    fi
    
    return 0
}

# Restart Chrome
restart_chrome() {
    log_info "Restarting Chrome..."
    stop_chrome
    sleep 2
    start_chrome
}

# Main command handler
case "${1:-start}" in
    start)
        start_chrome
        ;;
    stop)
        stop_chrome
        ;;
    status)
        get_status
        ;;
    restart)
        restart_chrome
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart}"
        echo ""
        echo "Commands:"
        echo "  start   - Start Chrome with remote debugging"
        echo "  stop    - Stop Chrome debug instance"
        echo "  status  - Check Chrome debug status"
        echo "  restart - Restart Chrome debug instance"
        echo ""
        echo "Configuration:"
        echo "  Debug Port: $DEBUG_PORT"
        echo "  Profile Dir: $PROFILE_DIR"
        echo "  PID File: $PID_FILE"
        echo "  Log File: $LOG_FILE"
        exit 1
        ;;
esac

exit $?
