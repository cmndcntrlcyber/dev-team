# Dev Team Platform Documentation

Welcome to the comprehensive documentation for the **Dev Team Platform** - an AI-powered microservices-based development team that automates software development with intelligent agents.

## 📚 Documentation Structure

### 🚀 Getting Started
- **[Quick Start Guide](getting-started/QUICK-START.md)** - Get up and running in 5 minutes
- **[Installation Guide](getting-started/INSTALLATION.md)** - Detailed setup instructions
- **[First Project Tutorial](getting-started/FIRST-PROJECT.md)** - Create your first AI-generated project

### 👤 User Guide
- **[Dashboard Guide](user-guide/DASHBOARD-GUIDE.md)** - Complete web interface walkthrough
- **[Project Management](user-guide/PROJECT-MANAGEMENT.md)** - Managing projects and workflows
- **[Agent Collaboration](user-guide/AGENT-COLLABORATION.md)** - How AI agents work together
- **[Quality Gates](user-guide/QUALITY-GATES.md)** - Quality assurance and approval processes

### 🔌 API Reference
- **[REST API](api-reference/REST-API.md)** - Complete API endpoint documentation
- **[WebSocket Events](api-reference/WEBSOCKET-EVENTS.md)** - Real-time event reference
- **[Authentication](api-reference/AUTHENTICATION.md)** - Security and authentication methods

### 🤖 AI Agents
- **[Agent Overview](agents/AGENT-OVERVIEW.md)** - All 6 agents explained
- **[Architecture Agent](agents/ARCHITECTURE-AGENT.md)** - Project coordination and decisions
- **[Frontend Agent](agents/FRONTEND-AGENT.md)** - React/Vue/Angular development
- **[Backend Agent](agents/BACKEND-AGENT.md)** - API and database development
- **[QA Agent](agents/QA-AGENT.md)** - Testing and quality assurance
- **[DevOps Agent](agents/DEVOPS-AGENT.md)** - CI/CD and deployment automation
- **[MCP Agent](agents/MCP-AGENT.md)** - Model Context Protocol integration

### 🚀 Deployment & Operations
- **[Production Setup](deployment/PRODUCTION-SETUP.md)** - Deploy to production environments
- **[Scaling Guide](deployment/SCALING.md)** - Horizontal scaling strategies
- **[Monitoring](deployment/MONITORING.md)** - Observability and metrics
- **[Security Hardening](deployment/SECURITY.md)** - Production security checklist

### 🔧 Troubleshooting
- **[Common Issues](troubleshooting/COMMON-ISSUES.md)** - FAQ and solutions
- **[Performance Optimization](troubleshooting/PERFORMANCE.md)** - Speed up your platform
- **[Debugging Guide](troubleshooting/DEBUGGING.md)** - Debug services and agents

## 🏗️ Platform Architecture

The Dev Team Platform consists of:

### Core Services
- **API Gateway** (`:3000`) - Main entry point, authentication, routing
- **Orchestrator Service** (`:3001`) - Central agent coordination hub
- **Project Service** (`:3002`) - Project and file management
- **Task Service** (`:3003`) - Task assignment and dependency tracking
- **Auth Service** (`:3004`) - User authentication and authorization

### AI Agent Services
- **Architecture Agent** (`:3010`) - Project leadership and coordination
- **Frontend Agent** (`:3011`) - UI/UX development
- **Backend Agent** (`:3012`) - Server-side development
- **QA Agent** (`:3013`) - Quality assurance and testing
- **DevOps Agent** (`:3014`) - Deployment and infrastructure
- **MCP Agent** (`:3015`) - External integrations and protocols

### Infrastructure
- **PostgreSQL** (`:5432`) - Primary database
- **Redis** (`:6379`) - Caching and session storage
- **NATS** (`:4222`) - Inter-service messaging
- **Frontend Dashboard** (`:3080`) - React-based web interface

## 🎯 Use Cases

### Web Application Development
- Full-stack React/Vue/Angular applications
- RESTful and GraphQL API development  
- Database design and ORM integration
- Authentication and authorization systems

### MCP Server Development
- Model Context Protocol server creation
- Custom tool and resource development
- External API integration
- AI agent extensibility

### DevOps Automation
- CI/CD pipeline generation
- Container orchestration setup
- Cloud infrastructure deployment
- Monitoring and alerting configuration

## 🚦 Quick Navigation

| I want to... | Go to... |
|--------------|----------|
| **Get started quickly** | [Quick Start Guide](getting-started/QUICK-START.md) |
| **Set up in production** | [Production Setup](deployment/PRODUCTION-SETUP.md) |
| **Use the web dashboard** | [Dashboard Guide](user-guide/DASHBOARD-GUIDE.md) |
| **Integrate via API** | [REST API Reference](api-reference/REST-API.md) |
| **Understand how agents work** | [Agent Overview](agents/AGENT-OVERVIEW.md) |
| **Troubleshoot issues** | [Common Issues](troubleshooting/COMMON-ISSUES.md) |
| **Scale the platform** | [Scaling Guide](deployment/SCALING.md) |

## 🔗 External Resources

- **[GitHub Repository](https://github.com/cmndcntrlcyber/dev-team)** - Source code and issues
- **[Docker Hub](https://hub.docker.com/r/devteam/platform)** - Pre-built container images
- **[Community Discord](https://discord.gg/dev-team-platform)** - Community support and discussions

## 📋 Requirements

- **Docker & Docker Compose** (v2.0+)
- **Node.js** (v18.0+) and **npm** (v9.0+)
- **Git** for version control
- **Anthropic Claude API Key** (required for AI agents)
- **Tavily API Key** (optional for web search capabilities)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../CONTRIBUTING.md) for details on:
- Code contribution guidelines
- Documentation improvements
- Bug reports and feature requests
- Community guidelines

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 📞 Support

- **Documentation Issues**: [Create an issue](https://github.com/cmndcntrlcyber/dev-team/issues/new?template=documentation.md)
- **Bug Reports**: [Report a bug](https://github.com/cmndcntrlcyber/dev-team/issues/new?template=bug_report.md)
- **Feature Requests**: [Request a feature](https://github.com/cmndcntrlcyber/dev-team/issues/new?template=feature_request.md)
- **Community Support**: [Join our Discord](https://discord.gg/dev-team-platform)

---

**Ready to get started?** → [Quick Start Guide](getting-started/QUICK-START.md)
