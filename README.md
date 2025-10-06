# Dev Team Platform

**AI-Powered SDLC Project Management Platform**

A comprehensive Software Development Lifecycle (SDLC) platform that combines intelligent AI agents with modern project management tools. Supports Agile, Kanban, Lean, and Six Sigma methodologies with integrated CI/CD pipeline management.

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node.js](https://img.shields.io/badge/runtime-node.js-green)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://docker.com)

## 🌟 Overview

The Dev Team Platform is an all-in-one SDLC management system that combines project management, sprint planning, task tracking, CI/CD automation, and AI-powered development assistance. Built for modern development teams using Agile, Kanban, Lean, or Six Sigma methodologies.

### 🏗️ Architecture

- **Single Application**: Integrated full-stack application on port 5000
- **Frontend**: React 18 with TypeScript and Tailwind CSS
- **Backend**: Express.js REST API with comprehensive SDLC endpoints
- **Database**: PostgreSQL with complete SDLC schema
- **AI Agents**: 6 specialized development agents (Architecture, Frontend, Backend, QA, DevOps, MCP)

## ✨ Core Features

### 📊 **Project Management**
- **Software Projects**: Create and manage development projects
- **Team Management**: Team size configuration, member assignment, tech stack tracking
- **Methodology Support**: Agile, Kanban, Lean, Six Sigma, Waterfall
- **Project Dashboard**: Real-time project health, progress tracking, team velocity
- **Objectives & Goals**: Track project objectives and milestones

### 🏃 **Sprint & Agile Management**
- **Sprint Planning**: Create and manage sprints with goals and objectives
- **Velocity Tracking**: Story points, planned vs completed metrics
- **Burndown Charts**: Real-time sprint progress visualization
- **Sprint Retrospectives**: Notes and learnings from each sprint
- **Active Sprint View**: Dedicated view for current sprint activities

### ✅ **Task Management (Kanban Board)**
- **Task Types**: Feature, Bug, Refactor, Documentation, Test, Chore
- **Kanban Workflow**: Backlog → To Do → In Progress → Review → Done → Blocked
- **Story Points**: Estimate and track effort
- **Time Tracking**: Estimated vs actual hours
- **Dependencies**: Track task dependencies and blockers
- **Assignment**: Assign tasks to team members
- **Labels & Tags**: Organize tasks with custom labels

### 🐛 **Issue & Bug Tracking**
- **Issue Types**: Bug, Enhancement, Task, Question
- **Severity Levels**: Critical, High, Medium, Low
- **Workflow**: New → Assigned → In Progress → Resolved → Closed → Reopened
- **Reproduction Steps**: Document how to reproduce bugs
- **Environment Tracking**: Link issues to specific environments
- **Related Tasks**: Connect issues to development tasks

### 🔀 **Git Repository Integration**
- **Multi-Provider Support**: GitHub, GitLab, Bitbucket
- **Repository Linking**: Connect project repositories
- **Commit Tracking**: Monitor last commits, authors, messages
- **Branch Management**: Track default branches and branch status
- **Webhook Configuration**: Automated event handling
- **Sync Status**: Real-time repository synchronization

### 🚀 **CI/CD & Deployment**
- **Environment Management**: Dev, Staging, Production, Testing
- **Deployment History**: Complete audit trail of all deployments
- **Deployment Pipeline**: Track deployment progress and status
- **Rollback Capability**: One-click rollback to previous versions
- **Health Monitoring**: Environment health checks and status
- **Deployment Logs**: Detailed logging for troubleshooting

### 📦 **Release Management**
- **Version Control**: Semantic versioning support
- **Release Notes**: AI-assisted release note generation
- **Changelog**: Automated changelog generation
- **Breaking Changes**: Track and warn about breaking changes
- **Migration Guides**: Documentation for version upgrades
- **Git Tags**: Automatic git tag association
- **Deployment Status**: Track release deployment across environments

### 🤖 **AI Development Agents**
- **Architecture Lead**: System design, technology decisions, code architecture
- **Frontend Core**: React/Vue/Angular development, UI/UX, state management
- **Backend Integration**: API development, database design, authentication
- **Quality Assurance**: Test generation, code quality, security validation
- **DevOps Engineer**: CI/CD pipelines, containerization, infrastructure
- **MCP Integration**: External integrations, API coordination

### 🧠 **Cline Workspace Integration**
The platform includes a powerful Cline workspace integration that enables intelligent task delegation to specialized AI agents:

**Features:**
- **Automatic Initialization**: Services start automatically when VS Code opens
- **Smart Task Analysis**: Analyzes task complexity to determine best approach
- **Intelligent Delegation**: Routes complex tasks to specialized agents
- **Quality Checkpoints**: Systematic verification at each stage
- **Learning System**: Improves over time by tracking successful patterns

**How It Works:**
1. Cline analyzes each programming task and calculates a complexity score
2. Based on the score, decides to handle directly or delegate to dev-team agents
3. If delegating, breaks down the task and assigns to appropriate agents
4. Monitors progress and verifies quality at each checkpoint
5. Delivers final result with comprehensive testing and documentation

**Decision Matrix:**
- **Simple Tasks (Score 0-10)**: Cline handles directly (e.g., fix typo, update config)
- **Medium Tasks (Score 11-25)**: Ask user preference (e.g., add auth, create components)
- **Complex Tasks (Score 26+)**: Delegate to agents (e.g., full-stack apps, MCP servers)

**Documentation:**
- Complete integration guide: `DEV-TEAM-INTEGRATION-SUMMARY.md`
- Workflows: `workflows/README.md`
- API client: `scripts/dev-team-api.js`
- Memory bank: `memory-bank/dev-team-integration/`

**Getting Started:**
The integration is automatic - just ask Cline to work on a programming task. Cline will:
1. Analyze the task complexity
2. Inform you of the delegation decision
3. Coordinate with agents if delegating
4. Verify quality and deliver results

See [DEV-TEAM-INTEGRATION-SUMMARY.md](./DEV-TEAM-INTEGRATION-SUMMARY.md) for complete details.

### ☁️ **Cloudflare MCP Integration**
The platform integrates with Cloudflare's Model Context Protocol (MCP) servers, enabling AI agents to directly interact with Cloudflare services:

**Available MCP Servers:**
- **Workers Bindings** - Manage KV, R2, D1, Durable Objects, and Workers AI
- **Browser Rendering** - Web testing, screenshots, visual regression
- **Documentation** - Reference Cloudflare documentation
- **Observability** - Logs, analytics, debugging
- **Workers Builds** - CI/CD insights and deployment tracking

**Agent Integration:**
- Architecture Lead uses Workers Bindings for infrastructure design
- Frontend/QA agents use Browser Rendering for automated testing
- DevOps agent monitors deployments via Observability server
- All agents reference Documentation for best practices

**Setup:**
```bash
# Configuration is in .env file
MCP_PORTAL_URL=https://mcp.c3s.nexus
CF_ACCOUNT_ID=your-account-id
CF_API_TOKEN=your-api-token

# Test connection
node scripts/test-mcp-connection.js
```

See [docs/MCP_CONFIGURATION.md](docs/MCP_CONFIGURATION.md) for complete setup instructions and usage examples.

### 📈 **Analytics & Metrics**
- **Project Metrics**: Active projects, completion rates, team velocity
- **Sprint Analytics**: Burndown charts, velocity trends, sprint health
- **Task Metrics**: Completion rates, cycle time, lead time
- **Issue Analytics**: Resolution time, severity distribution
- **Deployment Frequency**: Deployment success rate, MTTR
- **Code Quality**: Coverage trends, test pass rates

### 🔗 **Integrations**
- **GitHub**: Repository hosting, pull requests, issues
- **Jenkins**: CI/CD automation, pipeline management
- **Cloudflare**: CDN, DNS management
- **OpenTofu**: Infrastructure as Code
- **OpenAI**: AI-powered code assistance
- **Anthropic**: Claude AI for multi-agent workflows

## 📦 Quick Start

### 🐳 **Docker Deployment** (Recommended)

The easiest way to get started:

```bash
# Clone the repository
git clone https://github.com/cmndcntrlcyber/dev-team.git
cd dev-team

# Copy environment example
cp .env.example .env
# Edit .env with your configuration (at minimum, set SESSION_SECRET)

# Start with Docker Compose
docker compose -f docker-compose.simple.yml up -d

# Access the platform
open http://localhost:5000
```

The platform will automatically:
- Set up PostgreSQL database
- Run database migrations
- Start the application
- Create default dev user (if Google OAuth not configured)

### 💻 **Local Development**

For development with hot reload:

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env file

# Start PostgreSQL (if not using Docker)
# Create database 'devteam'

# Run database migrations
npm run db:push

# Start development server
npm run dev

# Access at http://localhost:5000
```

## 🎯 Using the Platform

### **1. Initial Setup**
1. Navigate to http://localhost:5000
2. Log in (auto-created dev user in development mode)
3. Go to Settings → API & Integrations
4. Configure API keys (GitHub, OpenAI, Anthropic, etc.)

### **2. Create Your First Project**
1. Navigate to **Projects** page
2. Click "Add Project"
3. Fill in project details:
   - Name and description
   - Select methodology (Agile/Kanban/Lean/Six Sigma)
   - Set team size
   - Add tech stack
   - Link GitHub repository
4. Save project

### **3. Set Up Environments**
1. Open your project
2. Navigate to **Deployments** → Environments
3. Create environments:
   - Development
   - Staging
   - Production
4. Configure environment URLs and settings

### **4. Link Repositories**
1. Navigate to **Repositories** page
2. Click "Link Repository"
3. Enter repository URL
4. Select provider (GitHub/GitLab/Bitbucket)
5. Configure webhooks (optional)

### **5. Sprint Planning** (For Agile/Scrum)
1. Navigate to project
2. Create new sprint
3. Set sprint goals and dates
4. Plan story points
5. Start sprint

### **6. Task Management**
1. Navigate to **Tasks** page
2. Create tasks (Features, Bugs, Refactors, etc.)
3. Assign to team members
4. Set story points and estimates
5. Move through Kanban workflow:
   - Backlog → To Do → In Progress → Review → Done

### **7. Issue Tracking**
1. Navigate to **Issues** page (or use Tasks page)
2. Report bugs/issues
3. Set severity level
4. Add reproduction steps
5. Assign to team members
6. Track through resolution

### **8. CI/CD Pipeline**
1. Configure Jenkins in Settings
2. Link your pipeline
3. Track deployments in **Deployments** page
4. View deployment history
5. Rollback if needed

### **9. Release Management**
1. Navigate to **Releases** page
2. Create new release
3. Set version number
4. Generate changelog (AI-assisted)
5. Document breaking changes
6. Deploy release

### **10. AI Agent Utilization**
1. Navigate to **Dev Agents** page
2. View agent status
3. Agents automatically assist with:
   - Code generation (Frontend/Backend)
   - Architecture decisions (Architecture Lead)
   - Test generation (QA)
   - CI/CD setup (DevOps)
   - Code review and quality checks

## 🔧 Configuration

### **Environment Variables**

```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@postgres:5432/devteam

# Session Security (Required)
SESSION_SECRET=your-secure-random-string-min-32-characters

# AI Services (Optional - for AI-powered features)
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# Git Integration (Optional)
GITHUB_TOKEN=ghp_xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# CI/CD Integration (Optional)
JENKINS_ENDPOINT=http://localhost:8080
JENKINS_API_KEY=xxx

# Cloud Services (Optional)
CLOUDFLARE_TOKEN=xxx
CLOUDFLARE_ZONE_ID=xxx

# Agent Containers (Optional - for external agents)
ENABLE_AGENT_CONTAINERS=false  # true for microservices mode
```

### **Methodology Selection**

Choose your preferred methodology per project:

- **Agile/Scrum**: Sprint-based development with story points
- **Kanban**: Continuous flow with WIP limits
- **Lean**: Focus on eliminating waste, continuous improvement
- **Six Sigma**: Data-driven quality focus
- **Waterfall**: Sequential phase-based approach

### **Team Size Configuration**

Configure per project:
- **Small (1-5 members)**: Startup or small team projects
- **Medium (6-15 members)**: Standard development teams
- **Large (16+ members)**: Enterprise or multi-team projects

## 📊 Dashboard & Analytics

### **Main Dashboard**
- Active projects count
- Sprint progress (current sprint)
- Tasks completed this week
- Open issues by severity
- Recent deployments
- AI agent status

### **Analytics Page**
- Project velocity trends
- Sprint burndown charts
- Task completion rates
- Issue resolution time
- Deployment frequency
- Code quality metrics

## 🔐 Security

### **Authentication**
- Mock user for development (auto-created)
- Google OAuth for production
- Session-based authentication
- Secure API key storage

### **Data Security**
- All data encrypted at rest
- HTTPS recommended for production
- SQL injection prevention
- XSS protection
- CSRF tokens

## 🚀 Deployment Options

### **Single Container (Recommended)**
```bash
docker compose -f docker-compose.simple.yml up -d
```

### **VPS/Cloud Deployment**
1. Provision server with Node.js 18+ and PostgreSQL 13+
2. Clone repository
3. Configure environment variables
4. Run `npm run build`
5. Start with `npm start` or PM2
6. Configure Nginx reverse proxy

### **Platform Support**
- ✅ Docker/Docker Compose
- ✅ AWS (EC2, ECS, Fargate)
- ✅ Google Cloud (Compute Engine, Cloud Run)
- ✅ Azure (Container Instances, App Service)
- ✅ DigitalOcean (Droplets, App Platform)
- ✅ Heroku
- ✅ Railway
- ✅ Fly.io
- ✅ Vercel (serverless)

## 🛠️ Tech Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS for styling
- Wouter for routing
- TanStack Query for data fetching
- Shadcn/ui components

**Backend:**
- Express.js
- Drizzle ORM
- PostgreSQL database
- Session authentication
- RESTful API

**AI Integration:**
- OpenAI GPT-4
- Anthropic Claude
- Custom agent framework

**DevOps:**
- Docker & Docker Compose
- GitHub Actions ready
- Jenkins integration
- OpenTofu support

## 📝 API Endpoints

### **SDLC Endpoints**
```typescript
// Projects
GET    /api/projects              // List all projects
GET    /api/projects/:id          // Get project details
POST   /api/projects              // Create project
PUT    /api/projects/:id          // Update project  
DELETE /api/projects/:id          // Delete project

// Sprints
GET    /api/sprints?projectId=:id           // List sprints
GET    /api/sprints/active/:projectId       // Get active sprint
POST   /api/sprints                         // Create sprint
PUT    /api/sprints/:id                     // Update sprint

// Tasks (Kanban)
GET    /api/tasks?projectId=:id&status=:status  // List tasks
POST   /api/tasks                               // Create task
PUT    /api/tasks/:id                           // Update task
DELETE /api/tasks/:id                           // Delete task

// Issues (Bug Tracking)
GET    /api/issues?severity=:level&status=:status  // List issues
POST   /api/issues                                  // Create issue
PUT    /api/issues/:id                              // Update issue

// Repositories
GET    /api/repositories?projectId=:id    // List repositories
POST   /api/repositories                  // Link repository

// Deployments
GET    /api/deployments?projectId=:id&environmentId=:id  // List deployments
POST   /api/deployments                                  // Create deployment

// Releases
GET    /api/releases?projectId=:id    // List releases
POST   /api/releases                  // Create release

// Environments
GET    /api/environments?projectId=:id  // List environments
POST   /api/environments                // Create environment

// AI Agents
GET    /api/ai-agents              // List development agents
GET    /api/ai-agents/:id          // Get agent details
```

## 🎨 Platform Pages

### **Dashboard**
- Project overview and metrics
- Sprint progress
- Task completion statistics
- Deployment status
- AI agent monitoring

### **Projects**
- Project grid/list view
- Create/edit projects
- Tech stack management
- Team assignment
- Repository linking

### **Tasks**
- Kanban board view
- Sprint filtering
- Drag & drop task management
- Story point tracking
- Time estimates

### **Repositories**
- Linked Git repositories
- Commit history
- Branch management
- Webhook configuration
- Sync status

### **Deployments**
- Deployment pipeline view
- Environment status (Dev/Staging/Prod)
- Deployment history
- Rollback functionality
- Logs and metrics

### **Releases**
- Release timeline
- Version management
- Changelog generation
- Breaking changes tracking
- Migration guides

### **Analytics**
- Velocity charts
- Burndown visualization
- Cycle time metrics
- Deployment frequency
- Quality trends

### **Dev Agents**
- AI agent status monitoring
- Task assignment to agents
- Agent performance metrics
- Configuration management

## 🔗 Integration Setup

### **GitHub Integration**
1. Generate GitHub Personal Access Token
2. Add to Settings → API & Integrations
3. Token needs `repo` scope
4. Link repositories in Repositories page

### **Jenkins Integration**
1. Configure Jenkins endpoint in Settings
2. Set up API token
3. Create pipeline for your project
4. View builds in Deployments page

### **Cloudflare Integration**
1. Get Cloudflare API token
2. Add to Settings
3. Configure zone settings
4. Manage DNS and CDN

### **OpenTofu Integration**
1. Install OpenTofu locally or in pipeline
2. Define infrastructure as code
3. Track deployments through platform
4. View infrastructure status

## 📊 SDLC Workflows

### **Agile/Scrum Workflow**
1. Create Project → Set methodology to "Agile"
2. Create Sprint → Set dates and goals
3. Add Tasks to Sprint → Story points estimation
4. Daily standups → Update task status
5. Sprint Review → Complete sprint
6. Retrospective → Document learnings
7. Deploy Release → Track in Releases page

### **Kanban Workflow**
1. Create Project → Set methodology to "Kanban"
2. Create continuous Tasks → No sprint needed
3. Move tasks through board: Backlog → To Do → In Progress → Review → Done
4. Track cycle time and throughput
5. Deploy when ready
6. Continuous improvement

### **CI/CD Workflow**
1. Link Repository → Configure webhooks
2. Set up Jenkins pipeline → Configure in Settings
3. Push code → Triggers build
4. Tests pass → Auto-deploy to Dev
5. Manual promotion → Deploy to Staging
6. Release approval → Deploy to Production
7. Track all deployments → Deployments page

## 🎯 Best Practices

### **Project Setup**
- Link repository immediately after project creation
- Set up all environments (Dev/Staging/Prod)
- Configure CI/CD pipeline early
- Define team members and roles
- Set clear objectives

### **Sprint Planning**
- Plan 2-week sprints (recommended)
- Don't overcommit story points
- Include bug fixes in sprint
- Reserve 20% capacity for unexpected work
- Set clear sprint goals

### **Task Management**
- Keep tasks small (< 3 days)
- Use story points consistently
- Track dependencies early
- Update status daily
- Add detailed descriptions

### **Release Management**
- Use semantic versioning (major.minor.patch)
- Document breaking changes clearly
- Provide migration guides
- Test in staging before production
- Keep changelog updated

## 🔒 Security & Privacy

### **Data Protection**
- All data stored in your PostgreSQL database
- API keys encrypted and secured
- Session encryption with secure secrets
- HTTPS recommended for production

### **Access Control**
- User authentication required
- Google OAuth support
- Role-based access (coming soon)
- Audit logging

## 📈 Performance

### **Optimization**
- Production build with Vite
- React lazy loading
- Database connection pooling
- Efficient querying with Drizzle ORM
- Response caching

### **Scalability**
- Horizontal scaling ready
- Database indexing optimized
- Stateless application design
- CDN-friendly static assets

## 🛠️ Development

### **Project Structure**
```
dev-team/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Application pages
│   │   ├── components/    # Reusable components
│   │   └── lib/           # Utilities
├── server/                # Express.js backend
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database layer
│   └── services/          # Business logic
├── shared/                # Shared types
│   └── schema.ts          # Database schema
└── docker-compose.simple.yml  # Docker deployment
```

### **Database Schema**
- `users` - Team members
- `projects` - Software projects
- `environments` - Deployment environments
- `sprints` - Sprint management
- `tasks` - Kanban tasks
- `issues` - Bug tracking
- `repositories` - Git repos
- `deployments` - Deployment history
- `releases` - Software releases
- `pullRequests` - PR tracking
- `aiAgents` - AI development agents

### **Scripts**
```bash
npm run dev        # Development server with hot reload
npm run build      # Production build
npm start          # Start production server
npm run db:push    # Run database migrations
npm run check      # TypeScript type checking
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🙋 Support

- **Issues**: [GitHub Issues](https://github.com/cmndcntrlcyber/dev-team/issues)
- **Documentation**: See `TRANSFORMATION_PLAN.md` for detailed architecture

---

**Built for modern development teams**

*Combining AI intelligence with proven SDLC methodologies*
