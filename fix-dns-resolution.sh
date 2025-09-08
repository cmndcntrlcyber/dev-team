#!/bin/bash

# Enhanced DNS Resolution Repair Script
# This script provides comprehensive DNS diagnosis and repair capabilities

set -e

echo "🔧 DNS Resolution Repair & Self-Healing System"
echo "=============================================="
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
DNS_SERVERS=(
    "8.8.8.8"         # Google Primary
    "8.8.4.4"         # Google Secondary
    "1.1.1.1"         # Cloudflare Primary
    "1.0.0.1"         # Cloudflare Secondary
    "9.9.9.9"         # Quad9 Primary
    "149.112.112.112" # Quad9 Secondary
    "208.67.222.222"  # OpenDNS Primary
    "208.67.220.220"  # OpenDNS Secondary
)

TEST_DOMAINS=(
    "google.com"
    "cloudflare.com"
    "github.com"
    "docker.io"
    "registry-1.docker.io"
)

LOG_FILE="logs/dns-repair.log"

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

print_dns() {
    echo -e "${CYAN}[DNS]${NC} $1"
}

print_repair() {
    echo -e "${MAGENTA}[REPAIR]${NC} $1"
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
        "DNS") print_dns "$message" ;;
        "REPAIR") print_repair "$message" ;;
    esac
}

# Test individual DNS server
test_dns_server() {
    local dns_server=$1
    local test_domain=${2:-"google.com"}
    
    if nslookup "$test_domain" "$dns_server" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Test systemd-resolved functionality
test_systemd_resolved() {
    log_message "DNS" "Testing systemd-resolved functionality..."
    
    # Check if systemd-resolved is active
    if ! systemctl is-active systemd-resolved >/dev/null 2>&1; then
        log_message "ERROR" "systemd-resolved service is not active"
        return 1
    fi
    
    # Check if systemd-resolved has upstream DNS servers configured
    if command -v resolvectl >/dev/null 2>&1; then
        local dns_servers=$(resolvectl status | grep "DNS Servers" | head -1)
        if [ -z "$dns_servers" ] || echo "$dns_servers" | grep -q "DNS Servers:$"; then
            log_message "ERROR" "systemd-resolved has no upstream DNS servers configured"
            return 1
        fi
        log_message "SUCCESS" "systemd-resolved has upstream DNS servers: $dns_servers"
    fi
    
    # Test systemd-resolved DNS resolution
    if resolvectl query google.com >/dev/null 2>&1; then
        log_message "SUCCESS" "systemd-resolved DNS resolution working"
        return 0
    else
        log_message "ERROR" "systemd-resolved DNS resolution failed"
        return 1
    fi
}

# Check DNS network connectivity
check_dns_connectivity() {
    log_message "DNS" "Checking DNS network connectivity..."
    
    # Test DNS port connectivity
    local dns_servers=("8.8.8.8" "1.1.1.1" "9.9.9.9")
    local connectivity_ok=false
    
    for dns_server in "${dns_servers[@]}"; do
        # Test UDP port 53
        if timeout 5 nc -u -z "$dns_server" 53 >/dev/null 2>&1; then
            log_message "SUCCESS" "UDP DNS connectivity to $dns_server:53 working"
            connectivity_ok=true
            break
        else
            log_message "WARNING" "UDP DNS connectivity to $dns_server:53 failed"
        fi
    done
    
    if [ "$connectivity_ok" = false ]; then
        log_message "ERROR" "No DNS connectivity detected - possible firewall issue"
        return 1
    fi
    
    return 0
}

# Check if using systemd-resolved
is_using_systemd_resolved() {
    if [ -f /etc/resolv.conf ]; then
        if grep -q "127.0.0.53" /etc/resolv.conf; then
            return 0
        fi
    fi
    return 1
}

# Test DNS resolution with multiple servers
test_dns_resolution() {
    log_message "DNS" "Testing DNS resolution..."
    
    local working_servers=()
    local failed_servers=()
    
    for dns_server in "${DNS_SERVERS[@]}"; do
        log_message "DNS" "Testing DNS server: $dns_server"
        
        if test_dns_server "$dns_server"; then
            working_servers+=("$dns_server")
            log_message "SUCCESS" "DNS server $dns_server is working"
        else
            failed_servers+=("$dns_server")
            log_message "ERROR" "DNS server $dns_server failed"
        fi
    done
    
    if [ ${#working_servers[@]} -eq 0 ]; then
        log_message "ERROR" "No working DNS servers found"
        return 1
    else
        log_message "SUCCESS" "Found ${#working_servers[@]} working DNS servers"
        return 0
    fi
}

# Comprehensive DNS diagnostics
diagnose_dns() {
    log_message "DNS" "Running comprehensive DNS diagnostics..."
    echo ""
    
    # Check current DNS configuration
    print_status "Current DNS Configuration:"
    echo "=========================="
    
    # Check resolv.conf
    if [ -f /etc/resolv.conf ]; then
        echo "resolv.conf contents:"
        cat /etc/resolv.conf | head -10
        echo ""
    else
        print_error "resolv.conf not found"
    fi
    
    # Check systemd-resolved status
    if command -v systemctl &> /dev/null; then
        echo "systemd-resolved status:"
        systemctl status systemd-resolved --no-pager -l | head -10 || echo "systemd-resolved not available"
        echo ""
    fi
    
    # Check NetworkManager DNS
    if command -v nmcli &> /dev/null; then
        echo "NetworkManager DNS settings:"
        nmcli dev show | grep -E "(DNS|DOMAIN)" | head -10 || echo "NetworkManager not available"
        echo ""
    fi
    
    # Test domain resolution
    print_status "Domain Resolution Tests:"
    echo "========================"
    
    for domain in "${TEST_DOMAINS[@]}"; do
        echo -n "Testing $domain... "
        if nslookup "$domain" >/dev/null 2>&1; then
            print_success "OK"
        else
            print_error "FAILED"
        fi
    done
    echo ""
    
    # Test DNS servers individually
    print_status "DNS Server Tests:"
    echo "================="
    
    for dns_server in "${DNS_SERVERS[@]}"; do
        echo -n "Testing $dns_server... "
        if test_dns_server "$dns_server"; then
            print_success "OK"
        else
            print_error "FAILED"
        fi
    done
    echo ""
    
    # Check network connectivity
    print_status "Network Connectivity Tests:"
    echo "==========================="
    
    echo -n "Testing internet connectivity (IP)... "
    if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        print_success "OK"
    else
        print_error "FAILED"
    fi
    
    echo -n "Testing internet connectivity (domain)... "
    if ping -c 1 google.com >/dev/null 2>&1; then
        print_success "OK"
    else
        print_error "FAILED"
    fi
    echo ""
}

# Level 0: systemd-resolved specific repair
repair_systemd_resolved() {
    log_message "REPAIR" "Starting systemd-resolved specific repair..."
    
    # Check if we're using systemd-resolved
    if ! is_using_systemd_resolved; then
        log_message "INFO" "Not using systemd-resolved, skipping..."
        return 1
    fi
    
    # Configure systemd-resolved with upstream DNS servers
    log_message "REPAIR" "Configuring systemd-resolved with upstream DNS servers..."
    
    # Create or update resolved.conf
    sudo tee /etc/systemd/resolved.conf > /dev/null << EOF
[Resolve]
DNS=8.8.8.8 1.1.1.1 9.9.9.9 8.8.4.4
FallbackDNS=1.0.0.1 149.112.112.112
Domains=~.
LLMNR=yes
MulticastDNS=yes
DNSSEC=allow-downgrade
DNSOverTLS=no
Cache=yes
DNSStubListener=yes
ReadEtcHosts=yes
EOF
    
    # Restart systemd-resolved
    log_message "REPAIR" "Restarting systemd-resolved service..."
    sudo systemctl restart systemd-resolved
    
    # Wait for service to stabilize
    sleep 5
    
    # Verify systemd-resolved is working
    if systemctl is-active systemd-resolved >/dev/null 2>&1; then
        log_message "SUCCESS" "systemd-resolved service is active"
        
        # Test DNS resolution through systemd-resolved
        if resolvectl query google.com >/dev/null 2>&1; then
            log_message "SUCCESS" "systemd-resolved DNS resolution working"
            return 0
        else
            log_message "ERROR" "systemd-resolved DNS resolution still failing"
            return 1
        fi
    else
        log_message "ERROR" "systemd-resolved service failed to start"
        return 1
    fi
}

# Level 1: Basic DNS repair
repair_dns_level1() {
    log_message "REPAIR" "Starting Level 1 DNS repair..."
    
    # Backup current resolv.conf
    local backup_file="/etc/resolv.conf.backup.$(date +%s)"
    log_message "REPAIR" "Backing up resolv.conf to $backup_file"
    sudo cp /etc/resolv.conf "$backup_file" 2>/dev/null || true
    
    # Check if using systemd-resolved first
    if is_using_systemd_resolved; then
        log_message "REPAIR" "Detected systemd-resolved, attempting specific repair..."
        if repair_systemd_resolved; then
            return 0
        else
            log_message "WARNING" "systemd-resolved repair failed, trying direct DNS configuration..."
        fi
    fi
    
    # Find working DNS servers
    local working_servers=()
    for dns_server in "${DNS_SERVERS[@]}"; do
        if test_dns_server "$dns_server"; then
            working_servers+=("$dns_server")
        fi
    done
    
    if [ ${#working_servers[@]} -eq 0 ]; then
        log_message "ERROR" "No working DNS servers found for Level 1 repair"
        return 1
    fi
    
    # Add working DNS servers to resolv.conf
    log_message "REPAIR" "Adding working DNS servers to resolv.conf"
    
    # Remove existing nameserver entries
    sudo sed -i '/^nameserver/d' /etc/resolv.conf 2>/dev/null || true
    
    # Add working DNS servers
    for dns_server in "${working_servers[@]:0:3}"; do  # Use first 3 working servers
        echo "nameserver $dns_server" | sudo tee -a /etc/resolv.conf >/dev/null
        log_message "REPAIR" "Added DNS server: $dns_server"
    done
    
    # Verify repair
    sleep 2
    if nslookup google.com >/dev/null 2>&1; then
        log_message "SUCCESS" "Level 1 DNS repair successful"
        return 0
    else
        log_message "ERROR" "Level 1 DNS repair failed"
        return 1
    fi
}

# Level 2: Advanced DNS repair
repair_dns_level2() {
    log_message "REPAIR" "Starting Level 2 DNS repair..."
    
    # Flush DNS caches
    log_message "REPAIR" "Flushing DNS caches..."
    
    # systemd-resolved
    sudo systemctl flush-dns 2>/dev/null || true
    sudo systemctl restart systemd-resolved 2>/dev/null || true
    
    # NetworkManager
    sudo systemctl restart NetworkManager 2>/dev/null || true
    
    # dnsmasq
    sudo systemctl restart dnsmasq 2>/dev/null || true
    
    # Clear nscd cache
    sudo nscd -i hosts 2>/dev/null || true
    
    # Clear systemd-resolved cache
    sudo resolvectl flush-caches 2>/dev/null || true
    
    # Wait for services to stabilize
    sleep 5
    
    # Rebuild resolv.conf completely
    log_message "REPAIR" "Rebuilding resolv.conf..."
    
    # Create new resolv.conf
    sudo tee /etc/resolv.conf > /dev/null << EOF
# Generated by DNS repair system
# $(date)

# Primary DNS servers
nameserver 8.8.8.8
nameserver 1.1.1.1
nameserver 9.9.9.9

# Secondary DNS servers
nameserver 8.8.4.4
nameserver 1.0.0.1

# Search domains
search local

# Options
options timeout:2
options attempts:3
options rotate
options single-request-reopen
EOF
    
    # Verify repair
    sleep 3
    if nslookup google.com >/dev/null 2>&1; then
        log_message "SUCCESS" "Level 2 DNS repair successful"
        return 0
    else
        log_message "ERROR" "Level 2 DNS repair failed"
        return 1
    fi
}

# Level 3: Network interface DNS repair
repair_dns_level3() {
    log_message "REPAIR" "Starting Level 3 DNS repair..."
    
    # Configure DNS at network interface level
    if command -v nmcli &> /dev/null; then
        log_message "REPAIR" "Configuring DNS via NetworkManager..."
        
        # Get active connection
        local active_connection=$(nmcli -t -f NAME connection show --active | head -1)
        
        if [ -n "$active_connection" ]; then
            log_message "REPAIR" "Setting DNS for connection: $active_connection"
            
            # Set DNS servers
            sudo nmcli connection modify "$active_connection" ipv4.dns "8.8.8.8,1.1.1.1,9.9.9.9"
            sudo nmcli connection modify "$active_connection" ipv4.ignore-auto-dns yes
            
            # Restart connection
            sudo nmcli connection down "$active_connection" && sudo nmcli connection up "$active_connection"
            
            sleep 5
        fi
    fi
    
    # Configure systemd-resolved
    if command -v systemctl &> /dev/null && systemctl is-active systemd-resolved >/dev/null 2>&1; then
        log_message "REPAIR" "Configuring systemd-resolved..."
        
        # Create resolved.conf
        sudo tee /etc/systemd/resolved.conf > /dev/null << EOF
[Resolve]
DNS=8.8.8.8 1.1.1.1 9.9.9.9
FallbackDNS=8.8.4.4 1.0.0.1
Domains=~.
LLMNR=yes
MulticastDNS=yes
DNSSEC=allow-downgrade
DNSOverTLS=no
Cache=yes
DNSStubListener=yes
EOF
        
        # Restart systemd-resolved
        sudo systemctl restart systemd-resolved
        
        # Update resolv.conf symlink
        sudo rm -f /etc/resolv.conf
        sudo ln -sf /run/systemd/resolve/resolv.conf /etc/resolv.conf
        
        sleep 3
    fi
    
    # Verify repair
    if nslookup google.com >/dev/null 2>&1; then
        log_message "SUCCESS" "Level 3 DNS repair successful"
        return 0
    else
        log_message "ERROR" "Level 3 DNS repair failed"
        return 1
    fi
}

# Level 4: Alternative DNS methods
repair_dns_level4() {
    log_message "REPAIR" "Starting Level 4 DNS repair (alternative methods)..."
    
    # Try using hosts file for critical domains
    log_message "REPAIR" "Adding critical domains to hosts file..."
    
    # Backup hosts file
    sudo cp /etc/hosts /etc/hosts.backup.$(date +%s)
    
    # Add critical domain entries
    sudo tee -a /etc/hosts > /dev/null << EOF

# DNS repair entries - $(date)
# Docker registry
52.54.232.244 registry-1.docker.io
3.216.34.172 auth.docker.io
52.206.121.41 index.docker.io
35.174.166.213 dseasb33srnds.cloudfront.net

# GitHub
140.82.112.3 github.com
140.82.112.4 api.github.com
185.199.108.153 assets-cdn.github.com

# Common sites
142.250.191.14 google.com
172.67.1.1 cloudflare.com
EOF
    
    # Try DNS over HTTPS as fallback
    log_message "REPAIR" "Attempting DNS over HTTPS fallback..."
    
    # Test with curl using DoH
    if command -v curl &> /dev/null; then
        local doh_response=$(curl -s -H "Accept: application/dns-json" "https://1.1.1.1/dns-query?name=google.com&type=A" 2>/dev/null)
        if [ -n "$doh_response" ]; then
            log_message "SUCCESS" "DNS over HTTPS is working"
        fi
    fi
    
    # Verify repair
    if nslookup google.com >/dev/null 2>&1 || ping -c 1 google.com >/dev/null 2>&1; then
        log_message "SUCCESS" "Level 4 DNS repair successful"
        return 0
    else
        log_message "ERROR" "Level 4 DNS repair failed"
        return 1
    fi
}

# Progressive DNS repair
repair_dns_progressive() {
    log_message "REPAIR" "Starting progressive DNS repair..."
    
    # Try each repair level
    local repair_levels=("repair_dns_level1" "repair_dns_level2" "repair_dns_level3" "repair_dns_level4")
    
    for level_func in "${repair_levels[@]}"; do
        log_message "REPAIR" "Attempting $level_func..."
        
        if $level_func; then
            log_message "SUCCESS" "DNS repair successful with $level_func"
            return 0
        else
            log_message "WARNING" "$level_func failed, trying next level..."
        fi
    done
    
    log_message "ERROR" "All DNS repair levels failed"
    return 1
}

# Verify DNS functionality
verify_dns() {
    log_message "DNS" "Verifying DNS functionality..."
    
    local success_count=0
    local total_tests=${#TEST_DOMAINS[@]}
    
    for domain in "${TEST_DOMAINS[@]}"; do
        if nslookup "$domain" >/dev/null 2>&1; then
            log_message "SUCCESS" "DNS resolution working for $domain"
            ((success_count++))
        else
            log_message "ERROR" "DNS resolution failed for $domain"
        fi
    done
    
    local success_rate=$((success_count * 100 / total_tests))
    log_message "DNS" "DNS success rate: $success_rate% ($success_count/$total_tests)"
    
    if [ $success_rate -ge 80 ]; then
        log_message "SUCCESS" "DNS functionality verified"
        return 0
    else
        log_message "ERROR" "DNS functionality verification failed"
        return 1
    fi
}

# Create DNS monitoring script
create_dns_monitor() {
    log_message "REPAIR" "Creating DNS monitoring script..."
    
    cat > monitor-dns.sh << 'EOF'
#!/bin/bash
# Continuous DNS monitoring script

while true; do
    echo "$(date): Checking DNS..."
    
    if nslookup google.com >/dev/null 2>&1; then
        echo "$(date): DNS OK"
    else
        echo "$(date): DNS FAILED - Attempting repair..."
        ./fix-dns-resolution.sh --auto-repair
    fi
    
    sleep 60
done
EOF
    
    chmod +x monitor-dns.sh
    log_message "SUCCESS" "DNS monitoring script created: monitor-dns.sh"
}

# Display DNS status
display_dns_status() {
    echo ""
    echo "=========================================="
    print_status "DNS Resolution Status"
    echo "=========================================="
    echo ""
    
    # Current DNS configuration
    echo "Current DNS Configuration:"
    echo "========================="
    cat /etc/resolv.conf | grep -E "(nameserver|search|domain)" | head -10
    echo ""
    
    # DNS server tests
    echo "DNS Server Performance:"
    echo "======================"
    printf "%-20s %-10s %-10s\n" "DNS Server" "Status" "Latency"
    printf "%-20s %-10s %-10s\n" "----------" "------" "-------"
    
    for dns_server in "${DNS_SERVERS[@]:0:6}"; do
        if test_dns_server "$dns_server"; then
            local start_time=$(date +%s%N)
            nslookup google.com "$dns_server" >/dev/null 2>&1
            local end_time=$(date +%s%N)
            local latency=$(( (end_time - start_time) / 1000000 ))
            printf "%-20s %-10s %-10s\n" "$dns_server" "OK" "${latency}ms"
        else
            printf "%-20s %-10s %-10s\n" "$dns_server" "FAILED" "N/A"
        fi
    done
    echo ""
    
    # Domain resolution tests
    echo "Domain Resolution Tests:"
    echo "======================="
    for domain in "${TEST_DOMAINS[@]}"; do
        printf "%-25s " "$domain"
        if nslookup "$domain" >/dev/null 2>&1; then
            print_success "OK"
        else
            print_error "FAILED"
        fi
    done
    echo ""
}

# Main function
main() {
    case "${1:-}" in
        --diagnose|-d)
            diagnose_dns
            ;;
        --repair|-r)
            repair_dns_progressive
            verify_dns
            ;;
        --auto-repair|-a)
            log_message "REPAIR" "Starting automatic DNS repair..."
            if ! test_dns_resolution; then
                repair_dns_progressive
                verify_dns
            else
                log_message "SUCCESS" "DNS is already working"
            fi
            ;;
        --monitor|-m)
            create_dns_monitor
            ;;
        --status|-s)
            display_dns_status
            ;;
        --help|-h)
            echo "DNS Resolution Repair & Self-Healing System"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --diagnose, -d     Run comprehensive DNS diagnostics"
            echo "  --repair, -r       Perform progressive DNS repair"
            echo "  --auto-repair, -a  Automatic repair if DNS is not working"
            echo "  --monitor, -m      Create DNS monitoring script"
            echo "  --status, -s       Display current DNS status"
            echo "  --help, -h         Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --diagnose     # Run full diagnostics"
            echo "  $0 --repair       # Repair DNS issues"
            echo "  $0 --auto-repair  # Auto-repair if needed"
            echo "  $0 --status       # Show DNS status"
            echo ""
            exit 0
            ;;
        "")
            # Default: run diagnostics and repair if needed
            echo "Running DNS diagnostics and repair..."
            echo ""
            
            # Clear log file
            > "$LOG_FILE"
            
            # Run diagnostics
            diagnose_dns
            
            # Check if repair is needed
            if ! test_dns_resolution; then
                echo ""
                print_warning "DNS issues detected. Attempting repair..."
                repair_dns_progressive
                verify_dns
            else
                print_success "DNS is working properly"
            fi
            
            # Display final status
            display_dns_status
            
            # Create monitoring script
            create_dns_monitor
            
            echo ""
            log_message "SUCCESS" "DNS repair process completed"
            echo "Log file: $LOG_FILE"
            echo "Monitoring script: monitor-dns.sh"
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
