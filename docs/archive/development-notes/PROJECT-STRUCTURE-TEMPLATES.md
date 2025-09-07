# Dev Team Platform - Project Structure Templates

## Overview
This document provides standardized project structures for all services in the Dev Team Platform, ensuring consistency and maintainability across the microservices architecture.

## Common Service Structure

### Base Service Template
```
services/[service-name]/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── routes/                  # API route handlers
│   │   ├── index.ts
│   │   └── [entity]Routes.ts
│   ├── controllers/             # Business logic controllers
│   │   └── [Entity]Controller.ts
│   ├── services/                # Core business services
│   │   └── [Entity]Service.ts
│   ├── models/                  # Data models and schemas
│   │   └── [Entity]Model.ts
│   ├── middleware/              # Custom middleware
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── errorHandler.ts
│   ├── utils/                   # Utility functions
│   │   ├── logger.ts
│   │   ├── config.ts
│   │   └── database.ts
│   └── types/                   # Service-specific types
│       └── index.ts
├── tests/                       # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── docker-compose.test.yml
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── .dockerignore
├── jest.config.js
└── README.md
```

## Service-Specific Templates

### 1. API Gateway Service
```
services/api-gateway/
├── src/
│   ├── index.ts
│   ├── gateway/
│   │   ├── routeConfig.ts       # Service routing configuration
│   │   ├── loadBalancer.ts      # Load balancing logic
│   │   ├── serviceDiscovery.ts  # Service discovery
│   │   └── circuitBreaker.ts    # Circuit breaker pattern
│   ├── middleware/
│   │   ├── authentication.ts    # JWT auth middleware
│   │   ├── authorization.ts     # RBAC middleware
│   │   ├── rateLimit.ts         # Rate limiting
│   │   ├── cors.ts              # CORS configuration
│   │   ├── logging.ts           # Request/response logging
│   │   └── metrics.ts           # Prometheus metrics
│   ├── proxy/
│   │   ├── httpProxy.ts         # HTTP request proxying
│   │   ├── websocketProxy.ts    # WebSocket proxying
│   │   └── grpcProxy.ts         # gRPC proxying (if needed)
│   ├── health/
│   │   ├── healthCheck.ts       # Service health monitoring
│   │   └── serviceRegistry.ts   # Service registration
│   ├── config/
│   │   ├── services.json        # Service endpoints
│   │   └── routes.json          # Route definitions
│   └── types/
│       ├── gateway.ts
│       └── services.ts
├── config/
│   ├── nginx.conf               # Nginx configuration (if used)
│   └── haproxy.cfg              # HAProxy configuration (if used)
└── monitoring/
    ├── prometheus.yml
    └── alerts.yml
```

**Key Files:**

`src/gateway/routeConfig.ts`:
```typescript
export interface ServiceRoute {
  path: string;
  service: string;
  method: string[];
  auth: boolean;
  rateLimit?: number;
  timeout?: number;
}

export const SERVICE_ROUTES: ServiceRoute[] = [
  {
    path: '/api/projects/*',
    service: 'project-service',
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    auth: true,
    rateLimit: 100,
    timeout: 5000
  },
  {
    path: '/api/tasks/*',
    service: 'task-service',
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    auth: true,
    rateLimit: 200,
    timeout: 5000
  },
  {
    path: '/api/agents/*',
    service: 'orchestrator-service',
    method: ['GET', 'POST'],
    auth: true,
    rateLimit: 50,
    timeout: 10000
  }
];
```

### 2. Project Service
```
services/project-service/
├── src/
│   ├── index.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── projectRoutes.ts
│   │   ├── templateRoutes.ts
│   │   └── fileRoutes.ts
│   ├── controllers/
│   │   ├── ProjectController.ts
│   │   ├── TemplateController.ts
│   │   └── FileController.ts
│   ├── services/
│   │   ├── ProjectService.ts
│   │   ├── TemplateService.ts
│   │   ├── FileService.ts
│   │   └── GitService.ts
│   ├── models/
│   │   ├── Project.ts
│   │   ├── ProjectTemplate.ts
│   │   ├── ProjectMember.ts
│   │   └── ProjectFile.ts
│   ├── repositories/
│   │   ├── ProjectRepository.ts
│   │   ├── TemplateRepository.ts
│   │   └── FileRepository.ts
│   ├── validators/
│   │   ├── projectValidator.ts
│   │   └── templateValidator.ts
│   ├── storage/
│   │   ├── fileStorage.ts       # File system operations
│   │   ├── gitStorage.ts        # Git operations
│   │   └── s3Storage.ts         # Cloud storage (optional)
│   └── events/
│       ├── projectEvents.ts
│       └── eventPublisher.ts
├── migrations/
│   ├── 001_create_projects.sql
│   ├── 002_create_templates.sql
│   └── 003_create_project_files.sql
└── templates/
    ├── react-app/
    ├── express-api/
    ├── mcp-server/
    └── full-stack/
```

### 3. Task Service
```
services/task-service/
├── src/
│   ├── index.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── taskRoutes.ts
│   │   ├── dependencyRoutes.ts
│   │   └── progressRoutes.ts
│   ├── controllers/
│   │   ├── TaskController.ts
│   │   ├── DependencyController.ts
│   │   └── ProgressController.ts
│   ├── services/
│   │   ├── TaskService.ts
│   │   ├── DependencyService.ts
│   │   ├── AssignmentService.ts
│   │   ├── ProgressService.ts
│   │   └── SchedulingService.ts
│   ├── models/
│   │   ├── Task.ts
│   │   ├── TaskDependency.ts
│   │   ├── TaskProgress.ts
│   │   └── TaskComment.ts
│   ├── algorithms/
│   │   ├── dependencyGraph.ts   # Dependency resolution
│   │   ├── taskScheduler.ts     # Task scheduling
│   │   ├── loadBalancer.ts      # Agent load balancing
│   │   └── priorityQueue.ts     # Task prioritization
│   ├── validators/
│   │   └── taskValidator.ts
│   └── events/
│       ├── taskEvents.ts
│       └── dependencyEvents.ts
├── migrations/
│   ├── 001_create_tasks.sql
│   ├── 002_create_dependencies.sql
│   └── 003_create_task_progress.sql
└── algorithms/
    └── dependency-graph.md      # Algorithm documentation
```

### 4. Agent Service Template
```
services/agents/[agent-type]/
├── src/
│   ├── index.ts
│   ├── agent/
│   │   ├── [AgentType]Agent.ts  # Main agent implementation
│   │   ├── capabilities.ts      # Agent capabilities
│   │   ├── taskHandlers.ts      # Task-specific handlers
│   │   └── coordination.ts      # Inter-agent coordination
│   ├── ai/
│   │   ├── anthropicClient.ts   # Claude API client
│   │   ├── promptTemplates.ts   # AI prompt templates
│   │   ├── contextBuilder.ts    # Context preparation
│   │   └── responseParser.ts    # AI response parsing
│   ├── tools/
│   │   ├── fileOperations.ts    # File system operations
│   │   ├── codeAnalysis.ts      # Code analysis tools
│   │   ├── gitOperations.ts     # Git operations
│   │   └── packageManager.ts    # Package management
│   ├── templates/
│   │   ├── codeTemplates.ts     # Code generation templates
│   │   └── configTemplates.ts   # Configuration templates
│   ├── validators/
│   │   ├── codeValidator.ts     # Code quality validation
│   │   └── outputValidator.ts   # Output validation
│   ├── metrics/
│   │   ├── performanceMetrics.ts
│   │   └── qualityMetrics.ts
│   └── types/
│       ├── agentTypes.ts
│       └── taskTypes.ts
├── prompts/
│   ├── system/                  # System prompts
│   ├── task-specific/           # Task-specific prompts
│   └── examples/                # Example prompts and responses
├── tests/
│   ├── unit/
│   │   ├── agent.test.ts
│   │   └── tools.test.ts
│   ├── integration/
│   │   └── taskExecution.test.ts
│   └── fixtures/
│       └── sampleProjects/
└── config/
    ├── capabilities.json        # Agent capabilities config
    └── prompts.json            # Prompt configuration
```

**Agent-Specific Examples:**

**Architecture Lead Agent:**
```
services/agents/architecture/
├── src/
│   ├── agent/
│   │   ├── ArchitectureLeadAgent.ts
│   │   └── capabilities.ts
│   ├── analyzers/
│   │   ├── projectAnalyzer.ts
│   │   ├── dependencyAnalyzer.ts
│   │   ├── securityAnalyzer.ts
│   │   └── performanceAnalyzer.ts
│   ├── generators/
│   │   ├── architectureDiagram.ts
│   │   ├── techStackRecommender.ts
│   │   └── documentationGenerator.ts
│   └── reviewers/
│       ├── codeReviewer.ts
│       ├── architectureReviewer.ts
│       └── designReviewer.ts
```

**Frontend Core Agent:**
```
services/agents/frontend/
├── src/
│   ├── agent/
│   │   ├── FrontendCoreAgent.ts
│   │   └── capabilities.ts
│   ├── generators/
│   │   ├── componentGenerator.ts
│   │   ├── pageGenerator.ts
│   │   ├── hookGenerator.ts
│   │   └── testGenerator.ts
│   ├── frameworks/
│   │   ├── react/
│   │   ├── vue/
│   │   ├── angular/
│   │   └── svelte/
│   ├── styling/
│   │   ├── cssGenerator.ts
│   │   ├── tailwindGenerator.ts
│   │   └── styledComponentsGenerator.ts
│   └── state/
│       ├── reduxGenerator.ts
│       ├── zustandGenerator.ts
│       └── contextGenerator.ts
```

### 5. Frontend Application
```
frontend/
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── favicon.ico
│   └── icons/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   └── components/
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   ├── new/
│   │   │   └── components/
│   │   ├── tasks/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   └── components/
│   │   ├── agents/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   └── components/
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   └── api/                 # API routes (if needed)
│   ├── components/              # Reusable UI components
│   │   ├── ui/                  # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── index.ts
│   │   ├── forms/               # Form components
│   │   ├── charts/              # Chart components
│   │   ├── layout/              # Layout components
│   │   └── domain/              # Domain-specific components
│   ├── hooks/                   # Custom React hooks
│   │   ├── useApi.ts
│   │   ├── useWebSocket.ts
│   │   ├── useLocalStorage.ts
│   │   └── useAuth.ts
│   ├── lib/                     # Utilities and clients
│   │   ├── api/
│   │   │   ├── client.ts        # API client
│   │   │   ├── endpoints.ts     # API endpoints
│   │   │   └── types.ts         # API types
│   │   ├── auth/
│   │   │   ├── authClient.ts
│   │   │   └── tokenManager.ts
│   │   ├── websocket/
│   │   │   ├── socketClient.ts
│   │   │   └── eventHandlers.ts
│   │   ├── utils/
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   └── constants.ts
│   │   └── stores/              # Zustand stores
│   │       ├── authStore.ts
│   │       ├── projectStore.ts
│   │       ├── taskStore.ts
│   │       └── agentStore.ts
│   ├── styles/                  # Global styles
│   │   ├── globals.css
│   │   ├── components.css
│   │   └── tailwind.css
│   └── types/                   # TypeScript types
│       ├── api.ts
│       ├── domain.ts
│       └── ui.ts
├── tests/                       # Test files
│   ├── __mocks__/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   └── utils/
├── .env.example
├── .env.local
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── jest.config.js
├── playwright.config.ts         # E2E testing
└── package.json
```

## Configuration Files

### Package.json Template (Backend Services)
```json
{
  "name": "@dev-team-platform/[service-name]",
  "version": "1.0.0",
  "description": "Dev Team Platform - [Service Description]",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "nodemon --exec ts-node src/index.ts",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "type-check": "tsc --noEmit",
    "docker:build": "docker build -t dev-team-[service-name] .",
    "docker:run": "docker run -p 3000:3000 dev-team-[service-name]",
    "migrate": "node dist/migrations/migrate.js",
    "seed": "node dist/migrations/seed.js"
  },
  "dependencies": {
    "fastify": "^4.24.0",
    "@fastify/cors": "^8.4.0",
    "@fastify/helmet": "^11.1.0",
    "@fastify/rate-limit": "^8.0.0",
    "@fastify/jwt": "^7.2.0",
    "@fastify/websocket": "^8.3.0",
    "pg": "^8.11.0",
    "redis": "^4.6.0",
    "nats": "^2.16.0",
    "zod": "^3.22.0",
    "pino": "^8.15.0",
    "uuid": "^9.0.0",
    "@anthropic-ai/sdk": "^0.9.0",
    "@dev-team-platform/types": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.8.0",
    "@types/pg": "^8.10.0",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.2.0",
    "nodemon": "^3.0.0",
    "ts-node": "^10.9.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "eslint": "^8.51.0",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0"
  },
  "keywords": ["microservices", "ai", "agents", "development"],
  "author": "Dev Team Platform",
  "license": "MIT"
}
```

### TypeScript Config Template
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/types": ["types"],
      "@/utils": ["utils"],
      "@/controllers": ["controllers"],
      "@/services": ["services"],
      "@/models": ["models"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Dockerfile Template
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache git

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S service -u 1001

# Copy built application
COPY --from=deps --chown=service:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=service:nodejs /app/dist ./dist
COPY --from=build --chown=service:nodejs /app/package.json ./package.json

USER service

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Docker Compose Service Template
```yaml
  [service-name]:
    build:
      context: ./services/[service-name]
      dockerfile: Dockerfile
    container_name: dev-team-[service-name]
    ports:
      - "[external-port]:[internal-port]"
    environment:
      NODE_ENV: development
      PORT: [internal-port]
      DATABASE_URL: postgresql://devteam:devteam_secure_password@postgres:5432/dev_team_platform
      REDIS_URL: redis://redis:6379
      NATS_URL: nats://nats:4222
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      LOG_LEVEL: info
    depends_on:
      - postgres
      - redis
      - nats
    volumes:
      - ./services/[service-name]/src:/app/src
      - /app/node_modules
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:[internal-port]/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Development Workflow Files

### .env.example Template
```bash
# Database
DATABASE_URL=postgresql://devteam:devteam_secure_password@localhost:5432/dev_team_platform

# Redis
REDIS_URL=redis://localhost:6379

# Message Broker
NATS_URL=nats://localhost:4222

# AI Services
ANTHROPIC_API_KEY=your_anthropic_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Service Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# File Storage
STORAGE_TYPE=local
STORAGE_PATH=/app/data
```

### Jest Config Template
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

This structured approach ensures consistency across all services and provides a solid foundation for rapid development and maintenance of the Dev Team Platform.
