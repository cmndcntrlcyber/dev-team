# Dev Team Platform

**AI-Powered Multi-Agent Development Platform - Unified Monorepo**

A comprehensive platform that coordinates specialized AI agents to build, test, and deploy your projects with intelligent collaboration and human oversight. Choose between **Simple Mode** for quick deployment or **Platform Mode** for enterprise-scale microservices architecture.

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node.js](https://img.shields.io/badge/runtime-node.js-green)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://docker.com)

## 🌟 Overview

The Dev Team Platform transforms AI-powered development collaboration into a scalable, intelligent system that adapts to your needs - from solo development to enterprise teams.

### 🚀 **Two Deployment Models**

**🔹 Simple Mode** - Perfect for getting started
- Single integrated application (Port 5000)
- React frontend + Express backend + integrated agents
- Mock mode for development without API keys
- Quick Docker deployment with PostgreSQL
- **Ideal for**: Solo developers, small teams, rapid prototyping

**🔹 Platform Mode** - Enterprise-ready microservices
- Full microservices architecture with 15+ services
- 6 specialized AI agents as individual microservices
- Production infrastructure (PostgreSQL, Redis, NATS)
- Real-time monitoring and health checks
- **Ideal for**: Production deployments, large teams, scalable systems

## 🚀 Quick Start

### 🔹 **Simple Mode (Recommended for New Users)**

Get started in under 5 minutes:

```bash
# Clone the repository
git clone https://github.com/cmndcntrlcyber/dev-team.git
cd dev-team

# Option 1: Docker (Recommended)
docker compose -f docker-compose.simple.yml up

# Option 2: Local Development
npm run setup
npm run dev:app

# Access the application
open http://localhost:5000
```

**Environment Setup (Optional):**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys (optional - runs in mock mode without them)
ANTHROPIC_API_KEY=your-key-here
SESSION_SECRET=your-session-secret
```

### 🔹 **Platform Mode (Full Microservices)**

For production-ready deployments:

```bash
# Clone the repository
git clone https://github.com/cmndcntrlcyber/dev-team.git
cd dev-team

# Configure environment (required for platform mode)
cp .env.example .env
# Edit .env with your configuration

# Deploy all services
docker compose -f docker-compose.microservices.yml up

# Access the dashboard
open http://localhost:3000
```

**Required Environment Variables for Platform Mode:**
```bash
ANTHROPIC_API_KEY=your-anthropic-key
JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://user:password@postgres:5432/dev_team_platform
```

## 📋 **Choosing Your Deployment Model**

| Feature | Simple Mode | Platform Mode |
|---------|-------------|---------------|
| **Setup Time** | 5 minutes | 15-30 minutes |
| **Resource Usage** | Low (1-2 GB RAM) | High (4-8 GB RAM) |
| **Scalability** | Single server | Horizontally scalable |
| **Development** | Integrated agents | Distributed agents |
| **Monitoring** | Basic logging | Full observability |
| **Team Size** | 1-5 developers | 5-50+ developers |
| **Production Ready** | ✅ Small-scale | ✅ Enterprise-scale |

### **Migration Path**

Start with Simple Mode and upgrade to Platform Mode as you grow:

1. **Develop** with Simple Mode for rapid iteration
2. **Export** your projects and configurations
3. **Deploy** Platform Mode for production
4. **Import** your work into the distributed system

## 🤖 **AI Agent Capabilities**

Both deployment modes include 6 specialized AI agents:

### **🏗️ Architecture Agent**
- Project coordination and technical leadership
- Technology stack analysis and recommendations
- System architecture design and validation
- Code review and quality oversight

### **🎨 Frontend Agent** 
- Modern UI/UX development (React/Vue/Angular)
- Responsive design with Tailwind CSS/Material-UI
- State management and API integration
- Performance optimization and accessibility

### **⚙️ Backend Agent**
- Server-side development (Express/FastAPI/NestJS)
- Database schema design and migrations
- Authentication systems (JWT, OAuth, RBAC)
- API documentation and testing

### **🔍 QA Agent**
- Unit, integration, and E2E test generation
- Code quality analysis and standards enforcement
- Security vulnerability scanning
- Performance testing and benchmarking

### **🚀 DevOps Agent**
- CI/CD pipeline creation and management
- Docker containerization and optimization
- Infrastructure as code and cloud deployment
- Monitoring, logging, and alerting setup

### **🔌 MCP Agent**
- Model Context Protocol server development
- External API integration and custom tools
- Plugin architecture development
- Documentation generation

## ⚡ **Simple Mode Features**

- **Integrated Experience**: All agents run within single application
- **Mock Development**: Full functionality without external dependencies
- **Real-time Dashboard**: Live agent status and project management
- **One-Command Deployment**: Docker or local development
- **Auto-Recovery**: Automatic agent reconnection and error handling

```bash
# Simple Mode Commands
npm run dev:app              # Start development server
npm run docker:simple        # Docker deployment
npm run build               # Build for production
```

## 🏢 **Platform Mode Features**

- **Microservices Architecture**: Each agent as independent service
- **Production Infrastructure**: PostgreSQL, Redis, NATS messaging
- **Health Monitoring**: Comprehensive health checks and metrics
- **Horizontal Scaling**: Scale individual services based on load
- **Team Collaboration**: Multi-user support with role-based access

```bash
# Platform Mode Commands
npm run dev:platform         # Start all services in development
npm run docker:platform      # Full platform deployment
npm run build --workspaces   # Build all services
npm run test --workspaces    # Run all tests
```

### **Platform Mode Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway (Port 3000)             │
├─────────────────────────────────────────────────────────┤
│  Core Services          │  Agent Services              │
│  ├── Orchestrator       │  ├── Architecture (3010)     │
│  ├── Project Service    │  ├── Frontend (3011)         │
│  ├── Task Service       │  ├── Backend (3012)          │
│  └── Auth Service       │  ├── QA (3013)               │
│                         │  ├── DevOps (3014)           │
│                         │  └── MCP (3015)              │
├─────────────────────────────────────────────────────────┤
│  Infrastructure                                         │
│  ├── PostgreSQL (5432)  ├── Redis (6379)               │
│  └── NATS (4222)        └── Monitoring (9090)          │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ **Development**

### **Workspace Structure**

```
dev-team/
├── README.md                          # This file
├── package.json                       # Workspace configuration
├── docker-compose.simple.yml          # Simple mode deployment
├── docker-compose.microservices.yml   # Platform mode deployment
├── .env.example                       # Environment template
├── app/                              # Simple mode application
│   ├── client/                       # React frontend
│   ├── server/                       # Express backend
│   └── shared/                       # Shared schemas
├── services/                         # Platform mode services
│   ├── api-gateway/                  # Main entry point
│   ├── orchestrator-service/         # Agent coordination
│   ├── project-service/              # Project management
│   ├── task-service/                 # Task assignment
│   ├── auth-service/                 # Authentication
│   └── agents/                       # AI agent services
│       ├── architecture/
│       ├── frontend/
│       ├── backend/
│       ├── qa/
│       ├── devops/
│       └── mcp/
├── shared/                           # Shared packages
│   ├── types/                        # TypeScript definitions
│   └── utils/                        # Common utilities
├── deployment/                       # Deployment configurations
│   ├── single-app/                   # Simple mode Docker
│   └── microservices/                # Platform mode configs
├── infrastructure/                   # Database and monitoring
└── docs/                            # Comprehensive documentation
```

### **Development Commands**

```bash
# Install all dependencies
npm run setup

# Development
npm run dev:app                 # Simple mode development
npm run dev:platform            # Platform mode development

# Testing
npm run test                    # Run all tests
npm run lint                    # Lint all code
npm run check                   # Type checking

# Building
npm run build                   # Build all workspaces
npm run build:shared            # Build shared packages only

# Docker
npm run docker:simple           # Simple mode Docker
npm run docker:platform         # Platform mode Docker  
npm run docker:clean            # Clean all containers and volumes
```

## ⚙️ **Configuration**

### **Environment Variables**

```bash
# =================================
# DEPLOYMENT MODE
# =================================
DEPLOYMENT_MODE=simple          # or "platform"

# =================================
# SIMPLE MODE
# =================================
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/devteam
SESSION_SECRET=your-session-secret-min-32-chars

# =================================
# PLATFORM MODE
# =================================
# JWT & Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Infrastructure
DATABASE_URL=postgresql://devteam:password@postgres:5432/dev_team_platform
REDIS_URL=redis://redis:6379
NATS_URL=nats://nats:4222

# =================================
# AI SERVICES (BOTH MODES)
# =================================
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key-optional
TAVILY_API_KEY=your-tavily-key-optional

# =================================
# OPTIONAL INTEGRATIONS
# =================================
GITHUB_CLIENT_ID=your-github-id
GITHUB_CLIENT_SECRET=your-github-secret
GOOGLE_CLIENT_ID=your-google-id
GOOGLE_CLIENT_SECRET=your-google-secret

# =================================
# DEVELOPMENT
# =================================
NODE_ENV=development
LOG_LEVEL=info
```

### **Agent Configuration**

Both modes support agent customization:

```json
{
  "agents": {
    "architecture": { "enabled": true, "maxConcurrentTasks": 2 },
    "frontend": { "enabled": true, "maxConcurrentTasks": 3 },
    "backend": { "enabled": true, "maxConcurrentTasks": 3 },
    "qa": { "enabled": true, "maxConcurrentTasks": 4 },
    "devops": { "enabled": true, "maxConcurrentTasks": 2 },
    "mcp": { "enabled": true, "maxConcurrentTasks": 2 }
  },
  "qualityGates": {
    "testCoverage": 85,
    "codeQuality": 8.0,
    "securityScan": true,
    "performanceCheck": true
  }
}
```

## 📈 **Performance & Scaling**

### **Simple Mode Performance**
- **Startup Time**: <30 seconds
- **Memory Usage**: 1-2 GB RAM
- **Concurrent Users**: 10-50
- **Agent Response**: <3 seconds average
- **Database**: Single PostgreSQL instance

### **Platform Mode Performance**
- **Startup Time**: 60-120 seconds (all services)
- **Memory Usage**: 4-8 GB RAM (distributed)
- **Concurrent Users**: 100-1000+
- **Agent Response**: <2 seconds average (dedicated resources)
- **Database**: Optimized with Redis caching and connection pooling

### **Scaling Strategies**

**Vertical Scaling** (Simple Mode):
- Increase server resources (CPU, RAM)
- Optimize database queries and caching
- Use CDN for static assets

**Horizontal Scaling** (Platform Mode):
- Scale individual services based on load
- Load balance API gateway
- Database read replicas
- Redis cluster for session storage

## 🔒 **Security & Privacy**

### **Data Protection**
- All data stored in your own database
- API keys secured in environment variables
- Session encryption with configurable secrets
- CSRF protection on all endpoints

### **Security Features**
- Input validation and sanitization
- Rate limiting and DDoS protection
- Role-based access control (RBAC)
- Container security with minimal attack surface

### **Privacy Controls**
- Self-hosted deployment options
- No data sent to third parties (except AI APIs)
- Audit logging and compliance reporting
- GDPR and data retention controls

## 📚 **Documentation**

### **Getting Started Guides**
- [🚀 Quick Start - Simple Mode](docs/getting-started/simple-deployment.md)
- [🏢 Platform Mode Deployment](docs/getting-started/platform-deployment.md)
- [🤔 Choosing Your Deployment](docs/getting-started/choosing-deployment.md)

### **Architecture & Development**
- [🏗️ System Architecture](docs/architecture/overview.md)
- [🔧 Development Setup](docs/development/local-setup.md)
- [🤝 Contributing Guide](docs/development/contributing.md)

### **Deployment & Operations**
- [🐳 Docker Deployment](docs/deployment/docker.md)
- [☸️ Kubernetes Guide](docs/deployment/kubernetes.md)
- [☁️ Cloud Providers](docs/deployment/cloud-providers.md)

### **Agent Development**
- [🤖 Agent Overview](docs/agents/overview.md)
- [🔌 Custom Agent Development](docs/agents/custom-development.md)
- [📋 Agent API Reference](docs/agents/api-reference.md)

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](docs/development/contributing.md) for details.

### **Development Setup**
```bash
git clone https://github.com/cmndcntrlcyber/dev-team.git
cd dev-team
npm run setup
npm run dev:app  # or npm run dev:platform
```

### **Testing**
```bash
npm run test          # All tests
npm run test:app      # Simple mode tests
npm run test:services # Platform mode tests
npm run lint          # Code quality
npm run check         # Type checking
```

## 📝 **Changelog**

### **Version 2.0.0** - Unified Architecture (Current)
- ✅ Unified monorepo with dual deployment models
- ✅ Simple Mode: Integrated single application
- ✅ Platform Mode: Full microservices architecture  
- ✅ Comprehensive documentation and migration guides
- ✅ Optimized Docker deployments for both modes
- ✅ Enhanced agent capabilities and monitoring

### **Version 1.0.0** - Original Implementation
- ✅ VS Code extension with embedded agents
- ✅ Single-user local development workflow

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ **Support & Community**

### **Getting Help**
- [📚 Documentation](docs/)
- [💬 GitHub Discussions](https://github.com/cmndcntrlcyber/dev-team/discussions)
- [🐛 Issue Tracker](https://github.com/cmndcntrlcyber/dev-team/issues)
- [📧 Email Support](mailto:support@dev-team-platform.com)

### **Community**
- [Discord Community](https://discord.gg/dev-team-platform)
- [Twitter Updates](https://twitter.com/devteamplatform)
- [Development Blog](https://blog.dev-team-platform.com)

## 🌟 **Acknowledgments**

Built with modern technologies:
- [React](https://reactjs.org) - Frontend framework
- [Express.js](https://expressjs.com) - Backend framework
- [TypeScript](https://typescriptlang.org) - Type safety
- [Docker](https://docker.com) - Containerization
- [PostgreSQL](https://postgresql.org) - Database
- [Redis](https://redis.io) - Caching and sessions
- [NATS](https://nats.io) - Microservices messaging
- [Anthropic Claude](https://www.anthropic.com) - AI intelligence
- [Tailwind CSS](https://tailwindcss.com) - Styling

---

**Built with ❤️ by the Dev Team Platform community**

*Choose your deployment model and start building with AI-powered development today!*
