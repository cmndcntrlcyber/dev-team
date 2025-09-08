# Attack Node - Local Deployment Guide for Ubuntu 22.04

This guide provides step-by-step instructions for deploying Attack Node on Ubuntu 22.04 desktop.

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Prerequisites Installation](#prerequisites-installation)
3. [Project Setup](#project-setup)
4. [Database Configuration](#database-configuration)
5. [Environment Configuration](#environment-configuration)
6. [Running the Application](#running-the-application)
7. [Optional: Docker Setup](#optional-docker-setup)
8. [Troubleshooting](#troubleshooting)

## System Requirements

- Ubuntu 22.04 LTS Desktop
- Minimum 4GB RAM (8GB recommended)
- 10GB free disk space
- Internet connection for downloading dependencies

## Prerequisites Installation

### 1. Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js (v20 LTS)

```bash
# Install Node.js repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 3. Install PostgreSQL 15

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo -u postgres psql -c "SELECT version();"
```

### 4. Install Git

```bash
sudo apt install -y git
```

### 5. Install Build Tools (Optional but recommended)

```bash
sudo apt install -y build-essential python3
```

## Project Setup

### 1. Clone the Repository

```bash
# Clone the repository (replace with your actual repository URL)
git clone https://github.com/yourusername/attack-node.git
cd attack-node
```

### 2. Install Project Dependencies

```bash
# Install all dependencies
npm install

# This will install both server and client dependencies
```

## Database Configuration

### 1. Create PostgreSQL Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE attacknode;
CREATE USER attacknode_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE attacknode TO attacknode_user;

# Exit PostgreSQL
\q
```

### 2. Configure PostgreSQL Authentication

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Find the line for local connections and change 'peer' to 'md5':
# FROM: local   all             all                                     peer
# TO:   local   all             all                                     md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Environment Configuration

### 1. Create Environment File

```bash
# Create .env file in project root
cp .env.example .env || touch .env

# Edit the .env file
nano .env
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# Database Configuration
DATABASE_URL=postgresql://attacknode_user:your_secure_password@localhost:5432/attacknode

# Server Configuration
NODE_ENV=development
PORT=5000

# Session Secret (generate a random string)
SESSION_SECRET=your_random_session_secret_at_least_32_characters_long

# AI Integration (Optional - Add your keys if you have them)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google OAuth (Optional - for production authentication)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. Generate Session Secret

```bash
# Generate a secure session secret
openssl rand -base64 32
```

## Running the Application

### 1. Initialize Database Schema

```bash
# Push database schema
npm run db:push

# This will create all necessary tables
```

### 2. Start the Application

```bash
# Start in development mode
npm run dev

# The application will start on http://localhost:5000
```

### 3. Access the Application

Open your web browser and navigate to:
```
http://localhost:5000
```

**Default Development User:**
- The application automatically creates a development user when Google OAuth is not configured
- Username: `developer`
- Email: `dev@example.com`

## Optional: Docker Setup

If you want to use the Docker integration features (Burp Suite, Kali Linux):

### 1. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

### 2. Install Docker Compose

```bash
sudo apt install -y docker-compose-plugin
```

### 3. Verify Docker Installation

```bash
docker --version
docker compose version
```

### 4. Docker Integration Features

#### Kali Linux Environment

**Access Information:**
- **URL**: `https://localhost:6902` (HTTPS required)
- **Username**: `kasm_user`
- **Password**: `password`
- **User Privileges**: Root access enabled for full system control
- **SSL Certificate**: Self-signed (accept browser security warning)

**Key Features:**
- **Persistent Storage**: All files and configurations automatically saved between sessions
- **Root Access**: Full administrative privileges for advanced penetration testing
- **Shared Directory**: Host file system access via `/home/kasm-user/shared`
- **Pre-installed Arsenal**: Complete Kali Linux toolset ready for use

**Usage Steps:**
1. Navigate to the Integrations tab or Kali Environment page in Attack Node
2. Click "Start Environment" to launch the Kali Linux container
3. Wait for container initialization (1-2 minutes for full setup with persistent storage)
4. Open your browser and go to `https://localhost:6902`
5. Accept the SSL certificate warning (click "Advanced" → "Proceed to localhost")
6. Login with username `kasm_user` and password `password`
7. Access the full Kali Linux desktop with root privileges and persistent storage

**Data Persistence Configuration:**
- **Storage Location**: `attack-node/uploads/kasm_profiles/kali-root/`
- **Persistent Data**: User files, tool configurations, downloads, custom scripts
- **Shared Access**: Files in `/home/kasm-user/shared` accessible from host system
- **Automatic Backup**: All changes automatically saved to host filesystem

**Advanced Configuration:**
```bash
# Container runs with these settings:
# - Root user access (UID 0, GID 0)
# - Privileged mode for full system access
# - Persistent volume mapping for data retention
# - Shared memory allocation for GUI performance
# - Hostname set to 'kasm' for consistency
```

**Troubleshooting Docker Issues:**
- **HTTP 401 Unauthorized**: Ensure you're using `https://` (not `http://`) and correct credentials
- **Container won't start**: Check Docker daemon is running with `sudo systemctl status docker`
- **Port conflicts**: Verify port 6902 is not already in use with `sudo lsof -i :6902`
- **SSL certificate errors**: Accept the self-signed certificate to proceed
- **Connection refused**: Wait for container to fully initialize (2-3 minutes with persistence)
- **Permission errors**: Container runs with root privileges for full access
- **Storage issues**: Check `uploads/kasm_profiles/kali-root/` directory permissions

#### Burp Suite Professional

**Setup Requirements:**
- Burp Suite Professional .jar file (not included)
- Optional: Burp Suite license file for full functionality
- Choose between GUI mode (VNC) or headless mode (API)

**Access Methods:**
- **GUI Mode**: Web-based VNC interface for full Burp Suite desktop access
- **Headless Mode**: REST API integration for automated scanning workflows

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Error

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test database connection
psql -U attacknode_user -d attacknode -h localhost

# Check database exists
sudo -u postgres psql -l
```

#### 2. Port Already in Use

```bash
# Check what's using port 5000
sudo lsof -i :5000

# Kill the process if needed
kill -9 <PID>
```

#### 3. Permission Denied Errors

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/lib/node_modules
```

#### 4. Database Schema Issues

```bash
# Reset database (WARNING: This will delete all data)
npm run db:push -- --force
```

#### 5. File Upload Directory

```bash
# Create uploads directory if it doesn't exist
mkdir -p uploads/docker uploads/certificates
chmod 755 uploads uploads/docker uploads/certificates
```

### Development Tips

1. **Logs**: Check server logs in the terminal where you ran `npm run dev`
2. **Database GUI**: Install pgAdmin or DBeaver for easier database management
3. **API Testing**: Use tools like Postman or curl to test API endpoints
4. **Browser DevTools**: Use F12 to check for client-side errors

### Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up proper Google OAuth credentials
4. Use a reverse proxy (Nginx/Apache)
5. Enable HTTPS with SSL certificates
6. Configure firewall rules
7. Set up regular database backups

## Support

If you encounter issues not covered in this guide:

1. Check the application logs
2. Review the `replit.md` file for architecture details
3. Ensure all environment variables are correctly set
4. Verify database connectivity and permissions

## Security Notes

- Always use strong passwords for database users
- Keep your API keys secure and never commit them to version control
- Regularly update dependencies with `npm update`
- Use environment-specific configurations
- Enable firewall and limit database access to localhost only

---

*Last updated: July 2025*
