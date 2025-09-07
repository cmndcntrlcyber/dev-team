# Quick Start Guide

Get your Dev Team Platform up and running in 5 minutes! This guide will have you creating AI-generated projects in no time.

## ✅ Prerequisites Check

Before starting, verify you have:

```bash
# Check Docker
docker --version          # Should be v20.0+
docker-compose --version  # Should be v2.0+

# Check Node.js
node --version            # Should be v18.0+
npm --version             # Should be v9.0+

# Check Git
git --version             # Any recent version
```

## 🚀 5-Minute Setup

### Step 1: Navigate to Platform Directory
```bash
cd dev-team-platform
```

### Step 2: Configure API Keys
```bash
# Copy environment template
cp .env.example .env

# Edit with your API keys (required)
nano .env
```

Add your Anthropic Claude API key to the `.env` file:
```env
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
TAVILY_API_KEY=your-tavily-key-here  # Optional for web search
JWT_SECRET=your-secure-jwt-secret-minimum-32-characters
```

> **💡 API Key Help**: Get your [Anthropic Claude API key here](https://console.anthropic.com/). Tavily is optional for web search capabilities.

### Step 3: Start the Platform
```bash
# Build and start all services (this takes 2-3 minutes)
docker-compose up --build -d
```

This starts all 13 services:
- ✅ Infrastructure (PostgreSQL, Redis, NATS)
- ✅ Core Services (API Gateway, Orchestrator, Project, Task, Auth)
- ✅ 6 AI Agents (Architecture, Frontend, Backend, QA, DevOps, MCP)
- ✅ Web Dashboard

### Step 4: Verify Everything Started
```bash
# Check service health (should show "healthy")
curl http://localhost:3001/health  # Orchestrator
curl http://localhost:3000/health  # API Gateway

# View startup logs if needed
docker-compose logs -f --tail=50
```

### Step 5: Access the Dashboard
1. **Open your browser** to: `http://localhost:3080`
2. **Login with default credentials**:
   - Email: `admin@devteam.local`
   - Password: `admin123`

🎉 **Success!** You should see the Dev Team Platform dashboard.

## 🎯 Create Your First Project

### 1. Start a New Project
- Click the **"New Project"** button
- Choose **"React App"** template for your first project
- Give it a name like "My First AI App"

### 2. Watch the Magic
The AI agents will automatically:
- **Architecture Agent**: Analyzes requirements and plans the project
- **Frontend Agent**: Creates React components and styling
- **Backend Agent**: Sets up Express.js API with authentication
- **QA Agent**: Generates comprehensive tests
- **DevOps Agent**: Creates CI/CD pipelines
- **MCP Agent**: Adds any needed integrations

### 3. Monitor Progress
Watch the real-time progress in the dashboard:
- **Project Timeline**: See completion estimates
- **Agent Status**: Monitor which agents are working
- **Task Board**: Visual task progress
- **Quality Gates**: Automated quality checks

### 4. Human Oversight
You'll be prompted for decisions at key points:
- ✋ **Architecture Decisions**: Approve technology choices
- ✋ **Design Reviews**: Review UI/UX designs
- ✋ **Deployment Approval**: Confirm deployment settings

## 🔗 Quick Access URLs

Once running, bookmark these URLs:

| Service | URL | Purpose |
|---------|-----|---------|
| **Dashboard** | http://localhost:3080 | Main web interface |
| **API Gateway** | http://localhost:3000 | API access point |
| **Health Check** | http://localhost:3001/health | System status |
| **Database** | localhost:5432 | PostgreSQL (if needed) |

## 🛠️ Quick Commands

```bash
# Stop all services
docker-compose down

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart a specific service
docker-compose restart orchestrator-service

# Check service status
docker-compose ps
```

## 🚨 Quick Troubleshooting

### Services Won't Start?
```bash
# Check Docker is running
docker info

# Free up ports if needed
docker-compose down
sudo lsof -ti:3000,3001,3080,5432,6379 | xargs kill -9

# Restart Docker if needed
sudo systemctl restart docker
```

### Can't Access Dashboard?
1. **Check the service is running**: `curl http://localhost:3080`
2. **View frontend logs**: `docker-compose logs frontend`
3. **Try incognito mode** in your browser
4. **Check firewall settings** for ports 3000-3080

### API Key Issues?
1. **Verify the key format**: Should start with `sk-ant-api03-`
2. **Check the `.env` file**: `cat .env | grep ANTHROPIC`
3. **Restart after changes**: `docker-compose restart`

### Database Errors?
```bash
# Reset database (will lose data!)
docker-compose down -v
docker-compose up -d postgres
# Wait 30 seconds for DB to initialize
docker-compose up -d
```

## 🎉 What's Next?

Now that you're up and running:

1. **📖 Learn the Dashboard** → [Dashboard Guide](../user-guide/DASHBOARD-GUIDE.md)
2. **🤖 Understand the Agents** → [Agent Overview](../agents/AGENT-OVERVIEW.md)
3. **🔌 Try the API** → [REST API Reference](../api-reference/REST-API.md)
4. **🚀 Deploy to Production** → [Production Setup](../deployment/PRODUCTION-SETUP.md)

## 💬 Need Help?

- **Common Issues**: [Troubleshooting Guide](../troubleshooting/COMMON-ISSUES.md)
- **Detailed Setup**: [Installation Guide](INSTALLATION.md)
- **Community Support**: [Discord](https://discord.gg/dev-team-platform)
- **Bug Reports**: [GitHub Issues](https://github.com/cmndcntrlcyber/dev-team/issues)

---

**🎯 Success Checklist**:
- ✅ All services running (`docker-compose ps`)
- ✅ Dashboard accessible at `localhost:3080`
- ✅ Can login with default credentials
- ✅ Created your first AI-generated project

**Ready for more?** → [Create Your First Project Tutorial](FIRST-PROJECT.md)
