# Installation Guide

Complete installation instructions for the Dev Team Platform microservices system. This guide covers development, staging, and production deployments.

## 📋 System Requirements

### Minimum Requirements
- **CPU**: 4 cores (8 recommended)
- **Memory**: 8GB RAM (16GB recommended)  
- **Storage**: 50GB available space
- **OS**: Linux, macOS, or Windows with WSL2

### Software Prerequisites
- **Docker**: 20.10+ with Docker Compose 2.0+
- **Node.js**: 18.0+ (for development)
- **Git**: Any recent version
- **API Keys**: Anthropic Claude API key (required)

### Network Requirements
- **Ports**: 3000-3080, 4222, 5432, 6379 must be available
- **Internet**: Access to Docker Hub, Anthropic API, GitHub
- **Firewall**: Allow inbound connections on required ports

## 🚀 Installation Methods

### Method 1: Quick Setup (Recommended for Development)

#### Step 1: Clone Repository
```bash
git clone https://github.com/cmndcntrlcyber/dev-team.git
cd dev-team/dev-team-platform
```

#### Step 2: Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

**Required Environment Variables:**
```env
# AI API Keys (Required)
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
TAVILY_API_KEY=your-tavily-key-here  # Optional for web search

# Security (Required)
JWT_SECRET=your-secure-random-string-minimum-32-characters
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Database (Auto-configured for development)
DATABASE_URL=postgresql://devteam:devteam_secure_password@postgres:5432/dev_team_platform

# Service Configuration
NODE_ENV=development
LOG_LEVEL=info
MAX_CONCURRENT_TASKS=3
AGENT_TIMEOUT=30000

# Optional OAuth (for GitHub/Google login)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### Step 3: Start Platform
```bash
# Build and start all services
docker-compose up --build -d

# Verify installation
curl http://localhost:3001/health
curl http://localhost:3000/health
```

#### Step 4: Access Dashboard
1. Open browser to `http://localhost:3080`
2. Login with: `admin@devteam.local` / `admin123`
3. Change password in Profile → Settings

### Method 2: Production Deployment

#### Step 1: Prepare Production Server
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply docker group
```

#### Step 2: Security Configuration
```bash
# Create production user
sudo useradd -m -s /bin/bash devteam
sudo usermod -aG docker devteam
sudo su - devteam

# Set up SSH keys (recommended)
mkdir -p ~/.ssh
# Add your public key to ~/.ssh/authorized_keys
```

#### Step 3: SSL/TLS Setup (Optional but Recommended)
```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot

# Generate certificates (replace with your domain)
sudo certbot certonly --standalone -d yourdomain.com

# Or use existing certificates
sudo mkdir -p /etc/ssl/dev-team
sudo cp your-cert.pem /etc/ssl/dev-team/
sudo cp your-key.pem /etc/ssl/dev-team/
```

#### Step 4: Production Environment File
```env
# Production environment
NODE_ENV=production
LOG_LEVEL=warn

# Security - Use strong secrets!
JWT_SECRET=your-very-secure-random-string-64-characters-minimum
DATABASE_PASSWORD=your-secure-database-password

# Production URLs
BASE_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com

# Resource Limits
MAX_CONCURRENT_TASKS=6
AGENT_TIMEOUT=60000
RATE_LIMIT_MAX=200

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

#### Step 5: Production Docker Compose
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'
services:
  # Extend base configuration
  api-gateway:
    ports:
      - "443:3000"  # HTTPS
      - "80:3000"   # HTTP redirect
    environment:
      - SSL_ENABLED=true
      - SSL_CERT_PATH=/etc/ssl/dev-team/cert.pem
      - SSL_KEY_PATH=/etc/ssl/dev-team/key.pem
    volumes:
      - /etc/ssl/dev-team:/etc/ssl/dev-team:ro

  frontend:
    ports:
      - "8080:3080"
    environment:
      - NODE_ENV=production

  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - /opt/dev-team/backups:/backups
    environment:
      - POSTGRES_PASSWORD=${DATABASE_PASSWORD}

  # Add monitoring services
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  grafana_data:
    driver: local
```

#### Step 6: Start Production Services
```bash
# Start with production configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Set up log rotation
sudo logrotate -d /etc/logrotate.d/docker
```

## 🔧 Advanced Configuration

### Custom Domain Setup

#### DNS Configuration
```bash
# A records for your domain
yourdomain.com.        IN A    your-server-ip
api.yourdomain.com.    IN A    your-server-ip
dashboard.yourdomain.com. IN A your-server-ip
```

#### Reverse Proxy (Nginx)
```nginx
# /etc/nginx/sites-available/dev-team-platform
server {
    listen 80;
    server_name yourdomain.com api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/ssl/dev-team/cert.pem;
    ssl_certificate_key /etc/ssl/dev-team/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/ssl/dev-team/cert.pem;
    ssl_certificate_key /etc/ssl/dev-team/key.pem;
    
    location / {
        proxy_pass http://localhost:3080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Database Configuration

#### External PostgreSQL
```env
# Use external PostgreSQL server
DATABASE_URL=postgresql://username:password@external-db-host:5432/dev_team_platform

# Remove postgres service from docker-compose.yml
```

#### Database Backup Setup
```bash
#!/bin/bash
# Create backup script
cat > /opt/dev-team/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/dev-team/backups"
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U devteam dev_team_platform | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql.gz"
EOF

chmod +x /opt/dev-team/backup.sh

# Add to crontab for daily backups
echo "0 2 * * * /opt/dev-team/backup.sh" | sudo crontab -
```

### Monitoring Setup

#### Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'dev-team-platform'
    static_configs:
      - targets: 
        - 'orchestrator-service:3001'
        - 'api-gateway:3000'
        - 'project-service:3002'
        - 'task-service:3003'
        - 'auth-service:3004'

  - job_name: 'agents'
    static_configs:
      - targets:
        - 'agent-architecture:3010'
        - 'agent-frontend:3011'
        - 'agent-backend:3012'
        - 'agent-qa:3013'
        - 'agent-devops:3014'
        - 'agent-mcp:3015'
```

#### Grafana Dashboards
Import pre-built dashboards for:
- System metrics
- Agent performance
- Project analytics
- API response times

### Scaling Configuration

#### Horizontal Scaling
```bash
# Scale specific services
docker-compose up --scale agent-frontend=3 --scale agent-backend=2 -d

# Load balancer configuration needed for multiple instances
```

#### Resource Limits
```yaml
# Add to docker-compose.yml services
services:
  orchestrator-service:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
    restart: unless-stopped
```

## 🔐 Security Hardening

### Production Security Checklist

#### Environment Security
- [ ] Strong, unique passwords for all services
- [ ] API keys stored securely (not in version control)
- [ ] JWT secrets are cryptographically random (64+ characters)
- [ ] Database encryption at rest enabled
- [ ] TLS/SSL certificates properly configured
- [ ] Firewall configured to restrict unnecessary access

#### Application Security
```bash
# Disable debug features
sed -i 's/LOG_LEVEL=debug/LOG_LEVEL=warn/' .env
sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env

# Enable security headers
echo "SECURITY_HEADERS=true" >> .env
echo "CORS_ORIGINS=https://yourdomain.com" >> .env
```

#### Network Security
```bash
# Configure firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable

# Restrict Docker network access
# Add to /etc/docker/daemon.json
{
  "bridge": "none",
  "iptables": false
}
```

## 📦 Development Setup

### Local Development Environment

#### Prerequisites
```bash
# Install Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Install global tools
npm install -g typescript ts-node nodemon
```

#### Workspace Setup
```bash
# Clone and setup workspace
git clone https://github.com/cmndcntrlcyber/dev-team.git
cd dev-team

# Install root dependencies
npm install

# Install service dependencies
cd dev-team-platform
npm run setup  # Installs all workspace dependencies

# Build shared packages
npm run build:shared
```

#### Development Services
```bash
# Start only infrastructure services
docker-compose up -d postgres redis nats

# Run services locally for development
cd services/orchestrator-service
npm run dev

# In separate terminals:
cd services/api-gateway && npm run dev
cd services/project-service && npm run dev
cd frontend && npm run dev
```

### VS Code Development Setup

#### Recommended Extensions
- Docker
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- GitLens
- Thunder Client (API testing)

#### Workspace Settings
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "docker.containers.label": "dev-team-platform"
}
```

## 🧪 Testing Installation

### Verification Scripts

#### Health Check Script
```bash
#!/bin/bash
echo "=== Dev Team Platform Installation Verification ==="

# Function to check URL
check_url() {
  local url=$1
  local name=$2
  if curl -s "$url" > /dev/null; then
    echo "✅ $name is accessible"
    return 0
  else
    echo "❌ $name is not accessible"
    return 1
  fi
}

# Check services
echo "Checking core services..."
check_url "http://localhost:3001/health" "Orchestrator Service"
check_url "http://localhost:3000/health" "API Gateway"
check_url "http://localhost:3002/health" "Project Service"
check_url "http://localhost:3003/health" "Task Service"
check_url "http://localhost:3004/health" "Auth Service"

echo -e "\nChecking agents..."
for port in {3010..3015}; do
  agent_name="Agent on port $port"
  check_url "http://localhost:$port/health" "$agent_name"
done

echo -e "\nChecking frontend..."
check_url "http://localhost:3080" "Frontend Dashboard"

echo -e "\nChecking infrastructure..."
docker-compose ps | grep -E "(postgres|redis|nats)" | while read line; do
  if echo "$line" | grep -q "Up"; then
    echo "✅ $(echo $line | awk '{print $1}') is running"
  else
    echo "❌ $(echo $line | awk '{print $1}') is not running"
  fi
done

echo -e "\n=== Verification Complete ==="
```

### Load Testing

#### Basic Load Test
```bash
# Install artillery for load testing
npm install -g artillery

# Create test configuration
cat > load-test.yml << 'EOF'
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
  headers:
    Authorization: 'Bearer YOUR_TOKEN_HERE'

scenarios:
  - name: "API Load Test"
    requests:
      - get:
          url: "/api/v1/projects"
      - get:
          url: "/api/v1/agents"
      - get:
          url: "/health"
EOF

# Run load test
artillery run load-test.yml
```

## 🔄 Updates and Maintenance

### Update Process
```bash
# Backup current installation
docker-compose exec postgres pg_dump -U devteam dev_team_platform > backup_before_update.sql

# Pull latest changes
git pull origin main

# Update containers
docker-compose pull
docker-compose up --build -d

# Run database migrations if needed
docker-compose exec orchestrator-service npm run migrate
```

### Maintenance Tasks
```bash
# Weekly maintenance script
#!/bin/bash
echo "=== Weekly Maintenance ==="

# Clean up Docker
docker system prune -f
docker volume prune -f

# Backup database
/opt/dev-team/backup.sh

# Rotate logs
docker-compose logs --tail=0 > /dev/null

# Update system packages
sudo apt update && sudo apt upgrade -y

echo "Maintenance complete!"
```

## 📞 Support and Next Steps

### Post-Installation
1. **Change Default Passwords**: Update admin password and JWT secrets
2. **Configure Backups**: Set up automated database backups
3. **Monitor Resources**: Keep an eye on CPU, memory, and disk usage
4. **Test Functionality**: Create a test project to verify everything works
5. **Set Up Monitoring**: Configure alerts for critical issues

### Getting Help
- **Quick Start**: [5-minute setup guide](QUICK-START.md)
- **Troubleshooting**: [Common issues and solutions](../troubleshooting/COMMON-ISSUES.md)
- **API Documentation**: [Complete API reference](../api-reference/REST-API.md)
- **Community Support**: [Discord community](https://discord.gg/dev-team-platform)

### What's Next?
- **Dashboard Tour**: [Learn the web interface](../user-guide/DASHBOARD-GUIDE.md)
- **Agent Deep Dive**: [Understand AI agent capabilities](../agents/AGENT-OVERVIEW.md)
- **Production Deployment**: Scale up for team use
- **Custom Development**: Extend the platform for your needs

---

**Installation Complete!** 🎉

Your Dev Team Platform is now ready to create AI-powered development projects. Start with the [Quick Start Guide](QUICK-START.md) to create your first project.
