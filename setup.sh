#!/bin/bash
# Attack Node - Ubuntu 22.04 Setup Script

set -e  # Exit on error

echo "======================================"
echo "Attack Node - Local Setup Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if running on Ubuntu 22.04
print_info "Checking system requirements..."
if ! grep -q "Ubuntu 22.04" /etc/os-release; then
    print_error "This script is designed for Ubuntu 22.04. Your system:"
    cat /etc/os-release | grep PRETTY_NAME
    echo "Continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
print_success "System check completed"

# Update system packages
print_info "Updating system packages..."
sudo apt update > /dev/null 2>&1
print_success "System packages updated"

# Check for Node.js
print_info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_info "Installing Node.js v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
    sudo apt install -y nodejs > /dev/null 2>&1
    print_success "Node.js installed"
else
    NODE_VERSION=$(node --version)
    print_success "Node.js already installed: $NODE_VERSION"
fi

# Check for PostgreSQL
print_info "Checking PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    print_info "Installing PostgreSQL..."
    sudo apt install -y postgresql postgresql-contrib > /dev/null 2>&1
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    print_success "PostgreSQL installed"
else
    print_success "PostgreSQL already installed"
fi

# Check for Git
print_info "Checking Git installation..."
if ! command -v git &> /dev/null; then
    sudo apt install -y git > /dev/null 2>&1
    print_success "Git installed"
else
    print_success "Git already installed"
fi

# Install build tools
print_info "Installing build tools..."
sudo apt install -y build-essential python3 > /dev/null 2>&1
print_success "Build tools installed"

# Database setup
print_info "Setting up PostgreSQL database..."
echo ""
echo "Enter a password for the Attack Node database user:"
read -s DB_PASSWORD
echo ""

# Create database and user
sudo -u postgres psql <<EOF > /dev/null 2>&1
CREATE DATABASE attacknode;
CREATE USER attacknode_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE attacknode TO attacknode_user;
ALTER DATABASE attacknode OWNER TO attacknode_user;
EOF

print_success "Database created"

# Update pg_hba.conf for password authentication
print_info "Configuring PostgreSQL authentication..."
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1 | cut -d. -f1)
PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

if [ -f "$PG_HBA" ]; then
    sudo cp "$PG_HBA" "$PG_HBA.backup"
    sudo sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' "$PG_HBA"
    sudo systemctl restart postgresql
    print_success "PostgreSQL authentication configured"
else
    print_error "Could not find pg_hba.conf at $PG_HBA"
fi

# Install project dependencies
print_info "Installing project dependencies..."
npm install > /dev/null 2>&1
print_success "Dependencies installed"

# Create uploads directories
print_info "Creating upload directories..."
mkdir -p uploads/docker uploads/certificates
chmod 755 uploads uploads/docker uploads/certificates
print_success "Upload directories created"

# Setup environment file
print_info "Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    
    # Generate session secret
    SESSION_SECRET=$(openssl rand -base64 32)
    
    # Update .env file
    sed -i "s|postgresql://attacknode_user:your_secure_password@localhost:5432/attacknode|postgresql://attacknode_user:$DB_PASSWORD@localhost:5432/attacknode|" .env
    sed -i "s|change_this_to_a_random_string_at_least_32_characters_long|$SESSION_SECRET|" .env
    
    print_success "Environment file created"
else
    print_info "Environment file already exists"
fi

# Initialize database schema
print_info "Initializing database schema..."
npm run db:push > /dev/null 2>&1
print_success "Database schema initialized"

# Optional: Docker setup
echo ""
echo "Would you like to install Docker for advanced features? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    print_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh > /dev/null 2>&1
    sudo sh get-docker.sh > /dev/null 2>&1
    sudo usermod -aG docker $USER
    sudo apt install -y docker-compose > /dev/null 2>&1
    rm get-docker.sh
    print_success "Docker installed (logout and login required for group changes)"
fi

echo ""
echo "======================================"
echo -e "${GREEN}Setup completed successfully!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Edit .env file to add your API keys (optional):"
echo "   nano .env"
echo ""
echo "2. Start the application:"
echo "   npm run dev"
echo ""
echo "3. Open your browser to:"
echo "   http://localhost:5000"
echo ""
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "Note: Log out and back in for Docker permissions to take effect"
fi
echo ""
print_success "Happy hacking with Attack Node!"