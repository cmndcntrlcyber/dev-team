# Dev Team Platform

**AI-Powered Multi-Agent Development Platform**

A comprehensive platform that coordinates specialized AI agents to build, test, and deploy your projects with intelligent collaboration and human oversight. Built as a modern single-application architecture with integrated agent orchestration.

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node.js](https://img.shields.io/badge/runtime-node.js-green)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://docker.com)

## 🌟 Overview

The Dev Team Platform is an AI-powered development assistant that coordinates specialized agents to help teams build applications efficiently. The platform features a modern React-based dashboard with real-time agent monitoring and intelligent task distribution.

### 🏗️ **Architecture**

- **Single Application**: Integrated Express.js server on port 5000
- **Frontend**: React 18 with TypeScript and Tailwind CSS
- **Backend**: Express.js with REST API endpoints
- **Database**: PostgreSQL for data persistence
- **Agent System**: 6 specialized AI agents with health monitoring and mock mode

## ✨ Features

### 🤖 **6 Specialized AI Agents**
- **Architecture Lead**: Project coordination, technology decisions, system design
- **Frontend Core**: React/Vue/Angular components, UI/UX development
- **Backend Integration**: APIs, databases, authentication, server-side logic
- **Quality Assurance**: Testing strategies, code quality, security validation
- **DevOps Engineer**: CI/CD pipelines, containerization, deployment automation
- **MCP Integration**: Model Context Protocol servers, external integrations

### 🧠 **Intelligent Coordination**
- **Real-time Monitoring**: Live agent status and health checks
- **Mock Development Mode**: Full functionality without external dependencies
- **Task Distribution**: AI-powered assignment based on agent capabilities
- **Web Dashboard**: Intuitive interface for project and agent management
- **Performance Metrics**: CPU, memory, and response time monitoring

### 🚀 **Production Ready**
- **Single Port Deployment**: Everything runs on port 5000
- **Database Agnostic**: Connect to any PostgreSQL instance
- **Session Management**: Secure authentication and user sessions
- **Real-time Updates**: Live agent status and task progress
- **Auto-Recovery**: Automatic agent reconnection and error handling

## 📦 Deployment Options

### 🐳 **Docker Deployment**

Deploy using Docker for any container orchestration platform:

```bash
# Clone the repository
git clone https://github.com/your-username/dev-team-platform.git
cd dev-team-platform

# Build Docker image
docker build -t dev-team-platform .

# Run container with environment variables
docker run -d \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:password@host:port/database" \
  -e ANTHROPIC_API_KEY="your-anthropic-key" \
  -e SESSION_SECRET="your-secure-session-secret" \
  --name dev-team \
  dev-team-platform

# Access the platform
open http://localhost:5000
```

#### Docker Compose Example:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/devteam
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      SESSION_SECRET: ${SESSION_SECRET}
    depends_on:
      - postgres
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: devteam
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 💻 **Local Development**

Run locally for development and testing:

```bash
# Clone the repository
git clone https://github.com/your-username/dev-team-platform.git
cd dev-team-platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server with hot reload
npm run dev

# Access the platform
open http://localhost:5000
```

#### Development Features:
- Hot module replacement for instant updates
- Mock agent mode for testing without API keys
- Detailed logging and debugging output
- Automatic TypeScript compilation

### 🖥️ **Self-Hosted Deployment**

Deploy on VPS, dedicated servers, or bare metal:

```bash
# On your server
# Clone the repository
git clone https://github.com/your-username/dev-team-platform.git
cd dev-team-platform

# Install production dependencies only
npm install --production

# Build the application
npm run build

# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/devteam"
export ANTHROPIC_API_KEY="your-anthropic-key"
export SESSION_SECRET="your-secure-session-secret"
export NODE_ENV="production"
export PORT=5000

# Start the production server
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start npm --name "dev-team" -- start
pm2 save
pm2 startup
```

#### System Requirements:
- Node.js 18.0 or higher
- PostgreSQL 13 or higher
- 2GB RAM minimum (4GB recommended)
- 10GB disk space

#### Nginx Reverse Proxy Configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## ⚙️ Configuration

### **Environment Variables**

Create a `.env` file with the following configuration:

```bash
# Database Configuration (Required)
DATABASE_URL=postgresql://user:password@localhost:5432/devteam

# AI Integration (Optional - runs in mock mode without these)
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key

# Server Configuration
PORT=5000
NODE_ENV=production
SESSION_SECRET=your-secure-session-secret-min-32-chars

# Authentication (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Agent Configuration (Optional)
AGENT_HEALTH_CHECK_INTERVAL=10000  # milliseconds
AGENT_MAX_RECONNECT_ATTEMPTS=5
AGENT_RECONNECT_DELAY=5000         # milliseconds
AGENT_TIMEOUT=60000                 # milliseconds

# Custom Agent Endpoints (Optional - for external agent containers)
ARCHITECTURE_AGENT_URL=http://localhost:3010
FRONTEND_AGENT_URL=http://localhost:3011
BACKEND_AGENT_URL=http://localhost:3012
QA_AGENT_URL=http://localhost:3013
DEVOPS_AGENT_URL=http://localhost:3014
MCP_AGENT_URL=http://localhost:3015
```

### **Database Setup**

```sql
-- Create database
CREATE DATABASE devteam;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE devteam TO your_user;
```

The application will automatically run migrations on startup.

## 🏗️ System Architecture

### **Application Structure**
```
┌────────────────────────────────────┐
│      Dev Team Platform             │
│         (Port 5000)                │
├────────────────────────────────────┤
│    Express.js Server               │
│    ├── REST API                    │
│    ├── Static File Serving         │
│    └── WebSocket Support           │
├────────────────────────────────────┤
│    React Frontend (SPA)            │
│    ├── Dashboard UI                │
│    ├── Agent Monitoring            │
│    └── Project Management          │
├────────────────────────────────────┤
│    Agent Connector Service         │
│    ├── 6 AI Agents                 │
│    ├── Health Monitoring           │
│    └── Mock/Real Mode Toggle       │
├────────────────────────────────────┤
│    PostgreSQL Database             │
│    ├── User Management             │
│    ├── Project Storage             │
│    └── Session Store               │
└────────────────────────────────────┘
```

### **Agent System Architecture**
- **Integrated Connector**: Single service managing all agents
- **Health Monitoring**: Automatic health checks every 10 seconds
- **Mock Mode**: Development mode without external dependencies
- **Real Mode**: Production mode with AI service connections
- **Auto-Recovery**: Automatic reconnection on failure

## 🤖 Agent Capabilities

### **Architecture Lead**
- Project planning and technical coordination
- Technology stack analysis and recommendations
- System architecture design and validation
- Code review and quality oversight
- Integration coordination between agents

### **Frontend Core**
- Modern UI/UX development with React/Vue/Angular
- Responsive design with Tailwind CSS/Material-UI
- State management (Redux, Zustand, Context API)
- API integration and data fetching
- Performance optimization and accessibility

### **Backend Integration**
- Server-side development with Express/FastAPI/NestJS
- Database schema design and migrations
- Authentication systems (JWT, OAuth, RBAC)
- API documentation and testing
- Microservices architecture when needed

### **Quality Assurance**
- Unit, integration, and E2E test generation
- Code quality analysis and standards enforcement
- Security vulnerability scanning
- Performance testing and benchmarking
- Accessibility validation

### **DevOps Engineer**
- CI/CD pipeline creation and management
- Docker containerization
- Infrastructure as code
- Monitoring and logging setup
- Deployment automation

### **MCP Integration**
- Model Context Protocol server development
- External API integration
- Custom tool creation
- Plugin architecture
- Documentation generation

## 📊 Dashboard Features

### **Agent Monitoring**
- Real-time agent status (Ready/Mock/Offline)
- Performance metrics visualization
- Health check history
- Task assignment tracking
- Error logs and debugging

### **Project Management**
- Create and organize projects
- File upload and management
- Task creation and assignment
- Progress tracking
- Team collaboration

### **System Administration**
- User authentication management
- System configuration
- API key management
- Performance monitoring
- Activity logs

## 🔄 Development Workflow

### **Getting Started**
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables
4. Set up PostgreSQL database
5. Run development server: `npm run dev`

### **Agent Development Mode**
The platform automatically handles agent connectivity:

- **Mock Mode**: Simulates agent responses when API keys are not configured
- **Real Mode**: Connects to actual AI services when configured
- **Hybrid Mode**: Mix of real and mock agents based on availability
- **Auto-Recovery**: Automatic mode switching on service availability

### **Building for Production**
```bash
# Build the application
npm run build

# Run production build
npm start
```

## 🔒 Security & Privacy

### **Data Protection**
- All data stored in your own PostgreSQL database
- API keys secured in environment variables
- Session encryption with configurable secrets
- CSRF protection on all endpoints

### **Authentication**
- Mock authentication for development
- Google OAuth for production
- Session-based authentication
- Role-based access control ready

### **Best Practices**
- Regular security updates
- Input validation on all endpoints
- SQL injection prevention with parameterized queries
- XSS protection with React's built-in escaping

## 📈 Performance

### **Optimization Features**
- Production build optimization with Vite
- Lazy loading for React components
- Database connection pooling
- Efficient agent health checking
- Response caching where appropriate

### **Monitoring**
- Built-in performance metrics
- Agent response time tracking
- Database query performance
- Memory usage monitoring
- Request/response logging

## 🛠️ Maintenance

### **Database Migrations**
```bash
# Run migrations
npm run db:migrate

# Rollback migrations
npm run db:rollback

# Generate new migration
npm run db:generate
```

### **Logs and Debugging**
- Application logs in `logs/` directory
- Agent communication logs
- Error tracking and reporting
- Debug mode with verbose output

### **Backup and Recovery**
```bash
# Backup database
pg_dump -U user -h localhost devteam > backup.sql

# Restore database
psql -U user -h localhost devteam < backup.sql
```

## 📚 API Reference

### **Core Endpoints**
```typescript
// Agent Management
GET  /api/ai-agents              // List all agents with status
GET  /api/ai-agents/:id          // Get specific agent details
POST /api/ai-agents/:id/tasks    // Assign task to agent

// Project Management
GET  /api/projects               // List all projects
POST /api/projects               // Create new project
PUT  /api/projects/:id           // Update project
DELETE /api/projects/:id         // Delete project

// Authentication
POST /api/auth/login            // User login
POST /api/auth/logout           // User logout
GET  /api/auth/user             // Current user info

// System
GET  /api/dashboard/stats       // System statistics
GET  /api/health                // Health check
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Setup**
```bash
# Fork and clone the repository
git clone https://github.com/your-username/dev-team-platform.git
cd dev-team-platform

# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint
```

## 📝 Changelog

### **Version 2.0.0** - Current
- ✅ Single application architecture
- ✅ Integrated agent system with mock mode
- ✅ Platform-agnostic deployment
- ✅ Real-time health monitoring
- ✅ Modern React dashboard
- ✅ PostgreSQL database integration

### **Version 1.0.0** - Legacy
- Initial microservices architecture
- Multiple container deployment
- Complex service orchestration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

### **Documentation**
- [Installation Guide](docs/INSTALLATION.md)
- [Configuration Reference](docs/CONFIGURATION.md)
- [API Documentation](docs/API.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

### **Community**
- [GitHub Issues](https://github.com/your-username/dev-team-platform/issues)
- [Discussions](https://github.com/your-username/dev-team-platform/discussions)

---

**Built with ❤️ for development teams everywhere**

*Empowering developers with intelligent AI collaboration*