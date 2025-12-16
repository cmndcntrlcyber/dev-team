# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dev Team Platform is an AI-powered SDLC management system that combines project management, sprint planning, task tracking, CI/CD automation, and multi-agent AI development assistance. It supports Agile, Kanban, Lean, and Six Sigma methodologies.

## Architecture

**Main Application** (root level, port 5000):
- Single integrated full-stack application for SDLC management
- Frontend: React 18 + TypeScript + Tailwind CSS + Shadcn/ui
- Backend: Express.js REST API with Drizzle ORM
- Database: PostgreSQL
- Routing: Wouter (client), Express (server)
- Data fetching: TanStack Query

**Microservices Platform** (`dev-team/dev-team-platform/`):
- Alternative deployment with 6 specialized AI agent microservices
- API Gateway (port 3000), Orchestrator (3001), Project Service (3002), Task Service (3003)
- Agent Services: Architecture (3010), Frontend (3011), Backend (3012), QA (3013), DevOps (3014), MCP (3015)
- Infrastructure: PostgreSQL, Redis, NATS messaging

## Common Commands

```bash
# Development (main app)
npm run dev              # Start dev server with hot reload (port 5000)
npm run build            # Production build (Vite + esbuild)
npm start                # Start production server
npm run check            # TypeScript type checking
npm run db:push          # Run Drizzle database migrations

# Docker (main app)
docker compose -f docker-compose.simple.yml up -d    # Start with Docker
docker compose -f docker-compose.simple.yml down     # Stop services
docker compose -f docker-compose.simple.yml logs app # View logs

# Microservices platform (in dev-team/dev-team-platform/)
npm run dev              # Start all services via Docker Compose
npm run dev:build        # Build and start services
npm run dev:logs         # View all service logs
npm run dev:clean        # Remove all containers and volumes
npm run setup            # Install dependencies + build shared packages
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed sample data
```

## Project Structure

```
dev-team/
├── client/src/           # React frontend
│   ├── pages/            # Route components
│   ├── components/       # Reusable UI components (Shadcn/ui based)
│   └── lib/              # Utilities and hooks
├── server/               # Express.js backend
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Database access layer
│   └── services/         # Business logic
├── shared/
│   └── schema.ts         # Drizzle ORM schema (source of truth for DB types)
├── dev-team/dev-team-platform/  # Microservices alternative
│   ├── services/         # Core and agent microservices
│   ├── frontend/         # React dashboard
│   └── shared/           # Shared types across services
├── workflows/            # Cline integration workflows
├── memory-bank/          # Project patterns and learnings
└── .clinerules/          # Workspace rules for Cline AI integration
```

## Database Schema

Tables in `shared/schema.ts`:
- `users` - Team members with Google OAuth
- `projects` - Software projects with methodology selection
- `sprints` - Sprint management with velocity tracking
- `tasks` - Kanban tasks with story points
- `issues` - Bug tracking with severity levels
- `repositories` - Git repository links (GitHub/GitLab/Bitbucket)
- `deployments` - Deployment history
- `releases` - Version management with changelog
- `environments` - Dev/Staging/Production environments
- `aiAgents` - AI development agent configurations

## API Patterns

REST endpoints follow pattern: `/api/{resource}` with standard CRUD operations.

Key endpoints:
- `/api/projects` - Project CRUD
- `/api/tasks?projectId=:id&status=:status` - Task management with filtering
- `/api/sprints?projectId=:id` - Sprint management
- `/api/ai-agents` - AI agent status and configuration
- `/api/dashboard/stats` - Dashboard metrics

## MCP Integration

Three MCP servers are configured:
1. **Tavily** - Web search (`tavily_search` tool)
2. **ProxmoxMCP** - VM management (`get_nodes`, `get_vms`, `execute_vm_command`)
3. **Cloudflare** - Workers, KV, R2, D1, Pages, DNS management

Configuration in: `docs/MCP_CONFIGURATION.md`

## Cline Integration (Task Delegation)

The platform integrates with Cline AI for intelligent task delegation:

**Complexity Scoring**:
- Score = (Files to modify × 2) + (Files to create × 3) + (Components × 5) + (Integrations × 4)
- 0-10: Handle directly
- 11-25: Ask user preference
- 26+: Delegate to dev-team agents

**Workflows** in `workflows/`:
- `dev-team-startup.md` - Service initialization
- `dev-team-task-delegation.md` - Delegation process
- API client: `scripts/dev-team-api.js`

## Environment Variables

Required:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/devteam
SESSION_SECRET=<min-32-characters>
```

Optional:
```bash
ANTHROPIC_API_KEY=sk-ant-xxx    # AI features
OPENAI_API_KEY=sk-xxx           # Alternative AI
GITHUB_TOKEN=ghp_xxx            # Git integration
```

## Tech Stack Summary

- **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn/ui, Wouter, TanStack Query
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **Build**: Vite (frontend), esbuild (server bundle)
- **AI**: Anthropic Claude, OpenAI GPT-4, mem0ai memory layer
- **DevOps**: Docker, Docker Compose
