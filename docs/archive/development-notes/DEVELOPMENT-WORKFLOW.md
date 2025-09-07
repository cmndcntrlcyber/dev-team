# Dev Team Platform - Development Workflow

## Overview
This document outlines the development workflow, processes, and best practices for implementing the transition from VS Code extension to standalone platform.

## Development Environment Setup

### Prerequisites
- **Node.js**: Version 18.x or higher
- **Docker**: Latest stable version
- **Docker Compose**: Version 2.x
- **Git**: Latest version
- **VS Code**: With recommended extensions
- **API Keys**: Anthropic Claude, Tavily (optional)

### Local Development Setup
```bash
# Clone the repository
git clone https://github.com/cmndcntrlcyber/dev-team.git
cd dev-team

# Install dependencies for all services
npm install

# Copy environment variables
cp .env.example .env

# Start infrastructure services
docker-compose up -d postgres redis nats

# Start all services in development mode
npm run dev

# Or start individual services
npm run dev:orchestrator
npm run dev:project-service
npm run dev:task-service
```

### IDE Configuration

#### VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode-remote.remote-containers",
    "ms-azuretools.vscode-docker",
    "humao.rest-client",
    "ms-vscode.test-adapter-converter"
  ]
}
```

#### VS Code Settings
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  }
}
```

## Git Workflow

### Branch Strategy (GitFlow)
```
main                    # Production-ready code
├── develop            # Integration branch
├── feature/           # Feature development
│   ├── feature/api-gateway
│   ├── feature/project-service
│   └── feature/frontend-dashboard
├── release/           # Release preparation
│   └── release/v1.0.0
├── hotfix/           # Critical bug fixes
│   └── hotfix/auth-fix
└── support/          # Maintenance branches
    └── support/v1.x
```

### Commit Message Convention
```bash
# Format: <type>(<scope>): <description>
# 
# Types: feat, fix, docs, style, refactor, test, chore
# Scope: service name or component (optional)
# Description: imperative mood, no period

# Examples:
feat(api-gateway): add JWT authentication middleware
fix(task-service): resolve dependency graph circular reference
docs(migration): update user migration guide
test(orchestrator): add integration tests for agent coordination
```

### Pull Request Process
1. **Feature Branch**: Create from `develop`
2. **Implementation**: Follow coding standards and write tests
3. **Code Review**: At least 2 reviewers required
4. **CI/CD Checks**: All tests and quality checks must pass
5. **Integration**: Merge to `develop` via squash merge
6. **Release**: Merge `develop` to `main` for deployment

## Development Workflow

### Service Development Lifecycle
1. **Planning**
   - Create GitHub issue with user story
   - Define acceptance criteria and technical requirements
   - Estimate effort and assign to sprint

2. **Design**
   - Create API specification (OpenAPI)
   - Design database schema if needed
   - Review with team for feedback

3. **Implementation**
   - Create feature branch from `develop`
   - Implement service following structure templates
   - Write unit tests (minimum 80% coverage)
   - Update documentation

4. **Testing**
   - Run unit tests locally
   - Test integration with other services
   - Verify API endpoints with REST client
   - Test with Docker Compose setup

5. **Code Review**
   - Create pull request with description
   - Address reviewer feedback
   - Ensure all CI checks pass
   - Merge after approval

### Coding Standards

#### TypeScript Best Practices
```typescript
// Use strict typing, avoid 'any'
interface UserRequest {
  name: string;
  email: string;
  role: UserRole;
}

// Use enums for constants
enum UserRole {
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER',
  VIEWER = 'VIEWER'
}

// Use proper error handling
async function createUser(data: UserRequest): Promise<User> {
  try {
    const user = await userService.create(data);
    logger.info('User created successfully', { userId: user.id });
    return user;
  } catch (error) {
    logger.error('Failed to create user', error as Error);
    throw new ValidationError('User creation failed');
  }
}

// Use dependency injection
class UserController {
  constructor(
    private userService: UserService,
    private logger: Logger
  ) {}
}
```

#### API Design Standards
```typescript
// RESTful URL patterns
GET    /api/projects                # List projects
POST   /api/projects                # Create project
GET    /api/projects/{id}           # Get specific project
PUT    /api/projects/{id}           # Update project
DELETE /api/projects/{id}           # Delete project
GET    /api/projects/{id}/tasks     # Get project tasks

// Consistent response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    pagination?: PaginationInfo;
  };
}
```

#### Database Design Standards
```sql
-- Table naming: snake_case, plural
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL CHECK (status IN ('PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_projects_status (status),
  INDEX idx_projects_created_at (created_at)
);

-- Foreign keys with proper constraints
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Testing Strategy

### Test Pyramid
```
                    /\
                   /  \
                  / E2E\ (Few, Expensive)
                 /______\
                /        \
               /Integration\ (Some, Moderate)
              /__________\
             /              \
            /   Unit Tests   \ (Many, Fast)
           /________________\
```

### Testing Levels

#### Unit Tests (Jest + Supertest)
```typescript
// Service unit test example
describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockRepository: jest.Mocked<ProjectRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    projectService = new ProjectService(mockRepository, mockLogger);
  });

  describe('createProject', () => {
    it('should create project with valid data', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'Test Description',
        templateId: 'template-123'
      };

      mockRepository.create.mockResolvedValue(mockProject);

      const result = await projectService.create(projectData);

      expect(result).toEqual(mockProject);
      expect(mockRepository.create).toHaveBeenCalledWith(projectData);
    });

    it('should throw validation error for invalid data', async () => {
      const invalidData = { name: '' };

      await expect(projectService.create(invalidData))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
```

#### Integration Tests
```typescript
// API integration test example
describe('Project API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await app.close();
  });

  describe('POST /api/projects', () => {
    it('should create project successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: {
          authorization: `Bearer ${validToken}`
        },
        payload: {
          name: 'Integration Test Project',
          description: 'Test project for integration testing'
        }
      });

      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data.name).toBe('Integration Test Project');
    });
  });
});
```

#### End-to-End Tests (Playwright)
```typescript
// E2E test example
import { test, expect } from '@playwright/test';

test('complete project creation workflow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[data-testid=email]', 'test@example.com');
  await page.fill('[data-testid=password]', 'password123');
  await page.click('[data-testid=login-button]');

  // Navigate to projects
  await page.click('[data-testid=nav-projects]');
  await expect(page).toHaveURL('/projects');

  // Create new project
  await page.click('[data-testid=new-project-button]');
  await page.fill('[data-testid=project-name]', 'E2E Test Project');
  await page.fill('[data-testid=project-description]', 'Created via E2E test');
  await page.selectOption('[data-testid=project-template]', 'react-app');
  await page.click('[data-testid=create-project-button]');

  // Verify creation
  await expect(page.locator('[data-testid=success-message]')).toBeVisible();
  await expect(page.locator('[data-testid=project-list]')).toContainText('E2E Test Project');
});
```

### Test Data Management
```typescript
// Test fixtures
export const testUsers = {
  admin: {
    id: 'user-admin-001',
    email: 'admin@test.com',
    role: 'ADMIN',
    name: 'Test Admin'
  },
  developer: {
    id: 'user-dev-001',
    email: 'dev@test.com',
    role: 'DEVELOPER',
    name: 'Test Developer'
  }
};

export const testProjects = {
  activeProject: {
    id: 'project-001',
    name: 'Test Active Project',
    status: 'IN_PROGRESS',
    ownerId: testUsers.admin.id
  }
};

// Test database seeder
export async function seedTestDatabase() {
  await database.users.createMany(Object.values(testUsers));
  await database.projects.createMany(Object.values(testProjects));
}
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: Continuous Integration

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Build services
        run: docker-compose build
      
      - name: Test Docker setup
        run: docker-compose up -d && sleep 30 && docker-compose down

  security:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run security audit
        run: npm audit --audit-level=moderate
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Deployment Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Build and push Docker images
        run: |
          docker-compose build
          docker-compose push
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster dev-team-platform \
            --service orchestrator-service \
            --force-new-deployment
      
      - name: Run smoke tests
        run: |
          sleep 60  # Wait for deployment
          npm run test:smoke
```

## Quality Assurance

### Code Quality Metrics
- **Test Coverage**: Minimum 80% for all services
- **Code Complexity**: Cyclomatic complexity < 10
- **TypeScript Strict**: All strict mode checks enabled
- **ESLint**: Zero warnings/errors
- **Security**: No high/critical vulnerabilities

### Quality Gates
```typescript
// Quality gate configuration
export const qualityGates = {
  testCoverage: {
    minimum: 80,
    target: 90
  },
  codeQuality: {
    maintainabilityIndex: 70,
    cyclomaticComplexity: 10
  },
  security: {
    allowedVulnerabilities: {
      critical: 0,
      high: 0,
      medium: 5,
      low: 10
    }
  },
  performance: {
    apiResponseTime: 200, // ms
    buildTime: 300, // seconds
    bundleSize: 1024 // KB
  }
};
```

### Code Review Checklist
- [ ] **Functionality**: Code works as expected
- [ ] **Tests**: Adequate test coverage with meaningful tests
- [ ] **Security**: No security vulnerabilities introduced
- [ ] **Performance**: No performance regressions
- [ ] **Documentation**: Code is self-documenting with proper comments
- [ ] **Standards**: Follows project coding standards
- [ ] **Dependencies**: No unnecessary dependencies added
- [ ] **Error Handling**: Proper error handling and logging
- [ ] **Database**: Database migrations are reversible
- [ ] **API**: API changes are backward compatible

## Monitoring and Observability

### Logging Strategy
```typescript
// Structured logging
import { Logger } from 'pino';

export class ServiceLogger {
  constructor(private logger: Logger) {}

  logRequest(req: FastifyRequest) {
    this.logger.info({
      type: 'request',
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      requestId: req.id
    }, 'Incoming request');
  }

  logError(error: Error, context?: Record<string, any>) {
    this.logger.error({
      type: 'error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    }, 'Application error');
  }

  logMetric(name: string, value: number, labels?: Record<string, string>) {
    this.logger.info({
      type: 'metric',
      name,
      value,
      labels,
      timestamp: new Date().toISOString()
    }, 'Performance metric');
  }
}
```

### Metrics Collection
```typescript
// Prometheus metrics
import { register, Counter, Histogram, Gauge } from 'prom-client';

export const metrics = {
  httpRequests: new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status']
  }),

  httpDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status']
  }),

  activeAgents: new Gauge({
    name: 'active_agents_total',
    help: 'Number of active agents',
    labelNames: ['type', 'status']
  }),

  taskQueue: new Gauge({
    name: 'task_queue_size',
    help: 'Size of task queue',
    labelNames: ['priority', 'type']
  })
};

// Middleware to collect metrics
export function metricsMiddleware(req: FastifyRequest, res: FastifyReply, done: Function) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.routerPath || req.url;
    
    metrics.httpRequests.inc({
      method: req.method,
      route,
      status: res.statusCode.toString()
    });
    
    metrics.httpDuration.observe({
      method: req.method,
      route,
      status: res.statusCode.toString()
    }, duration);
  });
  
  done();
}
```

## Documentation Standards

### API Documentation
- **OpenAPI 3.0**: Complete API specifications
- **Code Examples**: Request/response examples for all endpoints
- **Authentication**: Clear authentication requirements
- **Error Codes**: Comprehensive error code documentation

### Code Documentation
```typescript
/**
 * Creates a new project with the specified configuration
 * 
 * @param projectData - The project data including name, description, and template
 * @param userId - The ID of the user creating the project
 * @returns Promise that resolves to the created project
 * 
 * @throws {ValidationError} When project data is invalid
 * @throws {AuthorizationError} When user lacks permission
 * @throws {ConflictError} When project name already exists
 * 
 * @example
 * ```typescript
 * const project = await projectService.createProject({
 *   name: 'My App',
 *   description: 'A new application',
 *   templateId: 'react-template'
 * }, 'user-123');
 * ```
 */
async createProject(
  projectData: CreateProjectRequest,
  userId: string
): Promise<Project> {
  // Implementation
}
```

## Release Management

### Semantic Versioning
```
MAJOR.MINOR.PATCH
  |     |     |
  |     |     +-- Bug fixes, patches
  |     +-------- New features, backward compatible
  +-------------- Breaking changes, major updates

Examples:
v1.0.0 - Initial release
v1.1.0 - Added new agent service
v1.1.1 - Fixed authentication bug
v2.0.0 - Breaking API changes
```

### Release Process
1. **Feature Freeze**: Stop new feature development
2. **Release Branch**: Create release branch from develop
3. **Testing**: Run comprehensive test suite
4. **Bug Fixes**: Fix any critical issues found
5. **Documentation**: Update changelog and documentation
6. **Tag**: Create version tag
7. **Deploy**: Deploy to production
8. **Monitor**: Monitor system health post-deployment

This development workflow ensures high code quality, reliable deployments, and efficient collaboration throughout the transition implementation process.
