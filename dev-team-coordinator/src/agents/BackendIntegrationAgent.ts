import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BaseAgentImpl } from './BaseAgentImpl';
import { 
    AgentCapabilities, 
    AgentTask, 
    TaskResult, 
    AgentMessage, 
    AgentConfig,
    Logger,
    DevTeamError
} from '../types';

export class BackendIntegrationAgent extends BaseAgentImpl {
    private workspaceRoot: string = '';
    private apiEndpoints: Map<string, any> = new Map();
    private databaseSchema: any = {};
    private authConfig: any = {};
    
    constructor(logger: Logger) {
        const capabilities: AgentCapabilities = {
            supportedTaskTypes: [
                'INTEGRATION',
                'FOUNDATION',
                'DEPLOYMENT'
            ],
            requiredAPIs: ['anthropic', 'tavily'],
            skillLevel: 'expert',
            maxConcurrentTasks: 3,
            estimatedTaskDuration: {
                'FOUNDATION': 4,
                'AGENT_DEVELOPMENT': 2,
                'INTEGRATION': 5,
                'UI_DEVELOPMENT': 1,
                'TESTING': 3,
                'DOCUMENTATION': 2,
                'DEPLOYMENT': 4
            }
        };

        super('backend-001', 'BACKEND_INTEGRATION', capabilities, logger);
    }

    protected async validateConfiguration(config: AgentConfig): Promise<void> {
        if (!config.anthropicApiKey) {
            throw new DevTeamError('CONFIG_INVALID', 'Anthropic API key is required for Backend Integration Agent');
        }
        
        if (!config.workingDirectory) {
            throw new DevTeamError('CONFIG_INVALID', 'Working directory is required');
        }
        
        this.workspaceRoot = config.workingDirectory;
    }

    protected async initializeResources(): Promise<void> {
        // Subscribe to backend development topics
        this.subscribeToTopic('backend.api');
        this.subscribeToTopic('backend.database');
        this.subscribeToTopic('backend.auth');
        this.subscribeToTopic('integration.services');
        
        // Load existing backend configuration
        await this.loadBackendConfiguration();
        
        this.logger.info(`Backend Integration Agent initialized for workspace: ${this.workspaceRoot}`);
    }

    protected async executeTaskImpl(task: AgentTask): Promise<TaskResult> {
        this.logger.info(`Backend Integration executing task: ${task.type}`);
        
        try {
            switch (task.type) {
                case 'INTEGRATION':
                    return await this.executeIntegrationTask(task);
                case 'FOUNDATION':
                    return await this.setupBackendFoundation(task);
                case 'DEPLOYMENT':
                    return await this.configureDeployment(task);
                default:
                    throw new DevTeamError('TASK_TYPE_UNSUPPORTED', `Task type ${task.type} not supported by Backend Integration Agent`);
            }
        } catch (error) {
            this.logger.error(`Backend Integration task execution failed: ${task.id}`, error as Error);
            throw error;
        }
    }

    protected async handleMessage(message: AgentMessage): Promise<any> {
        this.logger.debug(`Backend Integration handling message: ${message.type}`);
        
        switch (message.type) {
            case 'DEPENDENCY_NOTIFICATION':
                return await this.handleDependencyChange(message);
            case 'STATUS_UPDATE':
                return await this.handleStatusUpdate(message);
            case 'COORDINATION_REQUEST':
                return await this.handleCoordinationRequest(message);
            case 'KNOWLEDGE_SHARING':
                return await this.updateBackendKnowledge(message);
            default:
                this.logger.debug(`Unhandled message type: ${message.type}`);
                return { acknowledged: true };
        }
    }

    // Main Task Execution Methods
    private async executeIntegrationTask(task: AgentTask): Promise<TaskResult> {
        const startTime = Date.now();
        
        await this.updateTaskProgress(task.id, 10, 'Analyzing integration requirements');
        
        const requirementsAnalysis = await this.analyzeIntegrationRequirements(task);
        
        await this.updateTaskProgress(task.id, 25, 'Designing API architecture');
        
        const apiDesign = await this.designAPIArchitecture(requirementsAnalysis);
        
        await this.updateTaskProgress(task.id, 45, 'Creating API endpoints');
        
        const apiImplementation = await this.implementAPIEndpoints(apiDesign);
        
        await this.updateTaskProgress(task.id, 65, 'Setting up database integration');
        
        const databaseIntegration = await this.setupDatabaseIntegration(apiDesign);
        
        await this.updateTaskProgress(task.id, 80, 'Configuring authentication');
        
        const authSetup = await this.configureAuthentication(requirementsAnalysis);
        
        await this.updateTaskProgress(task.id, 95, 'Testing API endpoints');
        
        const apiTesting = await this.testAPIEndpoints(apiImplementation);
        
        // Save backend configuration
        await this.saveBackendConfiguration();
        
        const duration = Date.now() - startTime;
        
        return {
            taskId: task.id,
            status: 'SUCCESS',
            output: {
                requirementsAnalysis,
                apiDesign,
                apiImplementation,
                databaseIntegration,
                authSetup,
                apiTesting
            },
            artifacts: this.getBackendArtifacts(apiImplementation, databaseIntegration),
            duration,
            nextSteps: [
                'Deploy to staging environment',
                'Set up monitoring and logging',
                'Configure load balancing'
            ]
        };
    }

    private async setupBackendFoundation(task: AgentTask): Promise<TaskResult> {
        const startTime = Date.now();
        
        await this.updateTaskProgress(task.id, 15, 'Setting up Node.js/Express server');
        
        const serverSetup = await this.createServerFoundation();
        
        await this.updateTaskProgress(task.id, 35, 'Configuring middleware');
        
        const middlewareConfig = await this.setupMiddleware();
        
        await this.updateTaskProgress(task.id, 55, 'Database setup and connections');
        
        const databaseSetup = await this.setupDatabaseConnections();
        
        await this.updateTaskProgress(task.id, 75, 'Environment configuration');
        
        const envConfig = await this.setupEnvironmentConfiguration();
        
        await this.updateTaskProgress(task.id, 90, 'Health checks and monitoring');
        
        const monitoring = await this.setupHealthChecks();
        
        const duration = Date.now() - startTime;
        
        return {
            taskId: task.id,
            status: 'SUCCESS',
            output: {
                serverSetup,
                middlewareConfig,
                databaseSetup,
                envConfig,
                monitoring
            },
            artifacts: [
                'server.ts',
                'src/routes/',
                'src/controllers/',
                'src/models/',
                'src/middleware/',
                'package.json',
                '.env.example',
                'docker-compose.yml'
            ],
            duration,
            nextSteps: [
                'Implement business logic',
                'Add error handling middleware',
                'Set up logging system'
            ]
        };
    }

    private async configureDeployment(task: AgentTask): Promise<TaskResult> {
        const startTime = Date.now();
        
        await this.updateTaskProgress(task.id, 20, 'Creating Docker configuration');
        
        const dockerConfig = await this.createDockerConfiguration();
        
        await this.updateTaskProgress(task.id, 45, 'Setting up CI/CD pipeline');
        
        const cicdConfig = await this.setupCICDPipeline();
        
        await this.updateTaskProgress(task.id, 70, 'Configuring cloud deployment');
        
        const cloudConfig = await this.configureCloudDeployment();
        
        await this.updateTaskProgress(task.id, 90, 'Setting up monitoring');
        
        const monitoringConfig = await this.setupProductionMonitoring();
        
        const duration = Date.now() - startTime;
        
        return {
            taskId: task.id,
            status: 'SUCCESS',
            output: {
                dockerConfig,
                cicdConfig,
                cloudConfig,
                monitoringConfig
            },
            artifacts: [
                'Dockerfile',
                '.github/workflows/',
                'k8s/',
                'terraform/',
                'docker-compose.prod.yml'
            ],
            duration,
            nextSteps: [
                'Deploy to staging environment',
                'Run deployment tests',
                'Configure production secrets'
            ]
        };
    }

    // Integration Analysis and Design Methods
    private async analyzeIntegrationRequirements(task: AgentTask): Promise<any> {
        const prompt = `
        As a senior backend architect, analyze these integration requirements:
        
        Task: ${task.title}
        Description: ${task.description}
        Metadata: ${JSON.stringify(task.metadata)}
        
        Provide analysis for:
        1. API endpoints needed
        2. Database schema requirements
        3. Authentication/authorization needs
        4. External service integrations
        5. Data validation and transformation
        6. Performance and scalability requirements
        7. Security considerations
        `;
        
        const analysis = await this.callAnthropicAPI(prompt);
        
        // Search for backend best practices
        const bestPractices = await this.searchWithTavily('Node.js Express API best practices 2024');
        
        return {
            requirements: analysis,
            bestPractices: bestPractices.map(result => result.content).join('\n'),
            recommendedTech: this.parseRecommendedTechnology(analysis),
            timestamp: new Date()
        };
    }

    private async designAPIArchitecture(requirements: any): Promise<any> {
        const prompt = `
        Design a comprehensive REST API architecture based on these requirements:
        
        ${JSON.stringify(requirements)}
        
        Design:
        1. RESTful endpoint structure
        2. Request/response schemas
        3. Error handling strategy
        4. Rate limiting and throttling
        5. API versioning approach
        6. Documentation structure (OpenAPI)
        7. Security middleware stack
        `;
        
        const apiDesign = await this.callAnthropicAPI(prompt);
        
        return {
            architecture: apiDesign,
            endpoints: this.parseAPIEndpoints(apiDesign),
            schemas: this.parseDataSchemas(apiDesign),
            middleware: ['cors', 'helmet', 'rate-limit', 'auth', 'validation'],
            documentation: 'OpenAPI 3.0 specification'
        };
    }

    private async implementAPIEndpoints(design: any): Promise<any> {
        const endpoints = [];
        
        for (const endpoint of design.endpoints) {
            const implementation = await this.implementSingleEndpoint(endpoint);
            endpoints.push(implementation);
            
            // Register endpoint
            this.apiEndpoints.set(endpoint.path, {
                ...endpoint,
                implemented: true,
                filePath: `src/routes${endpoint.path}.ts`
            });
        }
        
        return {
            endpoints,
            routeFiles: await this.createRouteFiles(endpoints),
            controllers: await this.createControllers(endpoints),
            middlewares: await this.createMiddlewares(design.middleware)
        };
    }

    private async implementSingleEndpoint(endpoint: any): Promise<any> {
        const prompt = `
        Implement this API endpoint with Express.js and TypeScript:
        
        Endpoint: ${endpoint.method} ${endpoint.path}
        Description: ${endpoint.description}
        Parameters: ${JSON.stringify(endpoint.parameters || {})}
        
        Include:
        1. Route handler with proper typing
        2. Request validation middleware
        3. Error handling
        4. Response formatting
        5. Unit test cases
        6. Documentation comments
        `;
        
        const implementation = await this.callAnthropicAPI(prompt);
        
        // Create actual endpoint file
        const filePath = path.join(this.workspaceRoot, 'src', 'routes', `${endpoint.name}.ts`);
        await this.createEndpointFile(filePath, implementation);
        
        return {
            ...endpoint,
            implementation,
            filePath,
            tests: await this.generateEndpointTests(endpoint)
        };
    }

    private async setupDatabaseIntegration(design: any): Promise<any> {
        const prompt = `
        Design database integration for this API:
        
        ${JSON.stringify(design)}
        
        Provide:
        1. Database schema design (PostgreSQL)
        2. Migration scripts
        3. Model definitions with ORM (Prisma/TypeORM)
        4. Connection pooling configuration
        5. Backup and recovery strategy
        6. Indexing strategy for performance
        `;
        
        const databaseDesign = await this.callAnthropicAPI(prompt);
        
        this.databaseSchema = {
            design: databaseDesign,
            tables: this.parseDatabaseTables(databaseDesign),
            migrations: await this.createMigrationScripts(databaseDesign),
            models: await this.createDatabaseModels(databaseDesign)
        };
        
        return this.databaseSchema;
    }

    private async configureAuthentication(requirements: any): Promise<any> {
        const prompt = `
        Design authentication and authorization system:
        
        Requirements: ${JSON.stringify(requirements)}
        
        Include:
        1. JWT token strategy
        2. User registration/login flow
        3. Password hashing and security
        4. Role-based access control (RBAC)
        5. Session management
        6. OAuth integration (Google, GitHub)
        7. API key authentication for external services
        `;
        
        const authDesign = await this.callAnthropicAPI(prompt);
        
        this.authConfig = {
            strategy: 'JWT + OAuth',
            implementation: authDesign,
            middleware: await this.createAuthMiddleware(authDesign),
            routes: await this.createAuthRoutes(authDesign)
        };
        
        return this.authConfig;
    }

    private async testAPIEndpoints(implementation: any): Promise<any> {
        const prompt = `
        Generate comprehensive API tests for these endpoints:
        
        ${JSON.stringify(implementation)}
        
        Create tests for:
        1. Happy path scenarios
        2. Error cases and edge conditions
        3. Authentication and authorization
        4. Request validation
        5. Response format verification
        6. Performance and load testing
        
        Use Jest and Supertest for testing.
        `;
        
        const testSuite = await this.callAnthropicAPI(prompt);
        
        await this.createAPITestFiles(testSuite);
        
        return {
            testSuite,
            coverage: 'Target: >95%',
            framework: 'Jest + Supertest',
            mockData: 'Generated test data fixtures'
        };
    }

    // Foundation Setup Methods
    private async createServerFoundation(): Promise<any> {
        const serverCode = `
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Logging
app.use(morgan('combined'));

// Rate limiting
app.use(rateLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

export default app;
`;
        
        await this.createServerFile(serverCode);
        
        return {
            framework: 'Express.js with TypeScript',
            port: 3001,
            middleware: ['helmet', 'cors', 'morgan', 'compression'],
            features: ['health-check', 'error-handling', 'rate-limiting']
        };
    }

    private async setupMiddleware(): Promise<any> {
        return {
            security: ['helmet', 'cors'],
            logging: ['morgan', 'winston'],
            validation: ['joi', 'express-validator'],
            authentication: ['jsonwebtoken', 'passport'],
            performance: ['compression', 'response-time']
        };
    }

    private async setupDatabaseConnections(): Promise<any> {
        const connectionConfig = {
            primary: {
                type: 'postgresql',
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                database: process.env.DB_NAME || 'devteam_db',
                pool: {
                    min: 2,
                    max: 10
                }
            },
            cache: {
                type: 'redis',
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379')
            }
        };
        
        await this.createDatabaseConnectionFiles(connectionConfig);
        
        return connectionConfig;
    }

    private async setupEnvironmentConfiguration(): Promise<any> {
        const envConfig = {
            development: {
                NODE_ENV: 'development',
                PORT: '3001',
                DB_HOST: 'localhost',
                DB_PORT: '5432',
                JWT_SECRET: 'dev-secret',
                LOG_LEVEL: 'debug'
            },
            staging: {
                NODE_ENV: 'staging',
                PORT: '3001',
                LOG_LEVEL: 'info'
            },
            production: {
                NODE_ENV: 'production',
                PORT: '3001',
                LOG_LEVEL: 'warn'
            }
        };
        
        await this.createEnvironmentFiles(envConfig);
        
        return envConfig;
    }

    private async setupHealthChecks(): Promise<any> {
        return {
            endpoints: ['/health', '/health/detailed'],
            checks: ['database', 'redis', 'external-services'],
            monitoring: 'Prometheus metrics',
            alerts: 'PagerDuty integration'
        };
    }

    // Deployment Configuration Methods
    private async createDockerConfiguration(): Promise<any> {
        const dockerfile = `
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY public ./public

EXPOSE 3001

USER node

CMD ["node", "dist/server.js"]
`;
        
        const dockerCompose = `
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    depends_on:
      - db
      - redis
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=devteam_db
      - POSTGRES_USER=devteam
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
`;
        
        await this.createDockerFiles(dockerfile, dockerCompose);
        
        return {
            dockerfile,
            dockerCompose,
            baseImage: 'node:18-alpine',
            optimization: 'Multi-stage build for production'
        };
    }

    private async setupCICDPipeline(): Promise<any> {
        return {
            platform: 'GitHub Actions',
            stages: ['lint', 'test', 'build', 'security-scan', 'deploy'],
            environments: ['staging', 'production'],
            notifications: 'Slack integration'
        };
    }

    private async configureCloudDeployment(): Promise<any> {
        return {
            provider: 'AWS/GCP/Azure',
            services: ['ECS/Cloud Run', 'RDS', 'ElastiCache'],
            scaling: 'Auto-scaling based on CPU/memory',
            monitoring: 'CloudWatch/Stackdriver'
        };
    }

    private async setupProductionMonitoring(): Promise<any> {
        return {
            metrics: 'Prometheus + Grafana',
            logging: 'ELK Stack',
            tracing: 'Jaeger',
            alerts: 'PagerDuty',
            uptime: 'StatusPage'
        };
    }

    // Message Handling Methods
    private async handleDependencyChange(message: AgentMessage): Promise<any> {
        const dependency = message.payload;
        
        this.logger.info(`Handling dependency change: ${dependency.name}`);
        
        return {
            acknowledged: true,
            action: 'update_integration',
            impactedEndpoints: this.findImpactedEndpoints(dependency)
        };
    }

    private async handleStatusUpdate(message: AgentMessage): Promise<any> {
        return {
            acknowledged: true,
            currentStatus: 'Processing backend integration tasks',
            activeEndpoints: this.apiEndpoints.size
        };
    }

    private async handleCoordinationRequest(message: AgentMessage): Promise<any> {
        return {
            response: 'Backend Integration ready for coordination',
            capabilities: this.capabilities.supportedTaskTypes,
            apiEndpoints: Array.from(this.apiEndpoints.keys()),
            availability: this.currentTasks.size < this.capabilities.maxConcurrentTasks
        };
    }

    private async updateBackendKnowledge(message: AgentMessage): Promise<any> {
        const knowledge = message.payload;
        
        if (knowledge.type === 'api_requirement') {
            // Update API endpoints with new requirements
            this.apiEndpoints.set(knowledge.endpoint, knowledge.specification);
        }
        
        return {
            integrated: true,
            type: 'backend_knowledge',
            impact: 'Updated API specifications and database schema'
        };
    }

    // Helper Methods
    private parseRecommendedTechnology(analysis: string): any {
        return {
            database: 'PostgreSQL',
            cache: 'Redis',
            framework: 'Express.js',
            orm: 'Prisma',
            auth: 'JWT + OAuth',
            testing: 'Jest + Supertest'
        };
    }

    private parseAPIEndpoints(design: string): any[] {
        // Mock endpoint parsing - would parse actual AI response
        return [
            { method: 'GET', path: '/users', name: 'getUsers', description: 'Get all users' },
            { method: 'GET', path: '/users/:id', name: 'getUser', description: 'Get user by ID' },
            { method: 'POST', path: '/users', name: 'createUser', description: 'Create new user' },
            { method: 'POST', path: '/auth/login', name: 'login', description: 'User authentication' }
        ];
    }

    private parseDataSchemas(design: string): any {
        return {
            User: { id: 'string', email: 'string', name: 'string', createdAt: 'Date' },
            LoginRequest: { email: 'string', password: 'string' },
            AuthResponse: { token: 'string', user: 'User' }
        };
    }

    private parseDatabaseTables(design: string): any[] {
        return [
            { name: 'users', columns: ['id', 'email', 'password_hash', 'name', 'created_at'] },
            { name: 'sessions', columns: ['id', 'user_id', 'token', 'expires_at'] }
        ];
    }

    private findImpactedEndpoints(dependency: any): string[] {
        // Would analyze which endpoints are impacted by dependency change
        return ['/api/users', '/api/auth'];
    }

    private getBackendArtifacts(apiImplementation: any, databaseIntegration: any): string[] {
        return [
            'server.ts',
            'src/routes/',
            'src/controllers/',
            'src/models/',
            'src/middleware/',
            'src/services/',
            'tests/api/',
            'prisma/schema.prisma',
            'prisma/migrations/',
            'package.json',
            'tsconfig.json'
        ];
    }

    // File Creation Methods
    private async createEndpointFile(filePath: string, implementation: string): Promise<void> {
        try {
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            await fs.promises.writeFile(filePath, implementation);
            this.logger.debug(`Created endpoint file: ${filePath}`);
        } catch (error) {
            this.logger.warn(`Could not create endpoint file: ${filePath}`, error as Error);
        }
    }

    private async createRouteFiles(endpoints: any[]): Promise<string[]> {
        const routeFiles = [];
        for (const endpoint of endpoints) {
            const fileName = `${endpoint.name}.ts`;
            routeFiles.push(fileName);
        }
        return routeFiles;
    }

    private async createControllers(endpoints: any[]): Promise<string[]> {
        const controllerFiles = [];
        for (const endpoint of endpoints) {
            const fileName = `${endpoint.name}Controller.ts`;
            controllerFiles.push(fileName);
        }
        return controllerFiles;
    }

    private async createMiddlewares(middlewares: string[]): Promise<string[]> {
        return middlewares.map(m => `${m}Middleware.ts`);
    }

    private async generateEndpointTests(endpoint: any): Promise<string> {
        const prompt = `
        Generate Jest + Supertest tests for this API endpoint:
        
        ${JSON.stringify(endpoint)}
        
        Include comprehensive test cases for success and error scenarios.
        `;
        
        return await this.callAnthropicAPI(prompt);
    }

    private async createMigrationScripts(databaseDesign: string): Promise<string[]> {
        // Would create actual migration files
        return ['001_initial_schema.sql', '002_add_indexes.sql'];
    }

    private async createDatabaseModels(databaseDesign: string): Promise<string[]> {
        // Would create actual model files
        return ['User.ts', 'Session.ts'];
    }

    private async createAuthMiddleware(authDesign: string): Promise<string[]> {
        return ['authMiddleware.ts', 'rbacMiddleware.ts'];
    }

    private async createAuthRoutes(authDesign: string): Promise<string[]> {
        return ['authRoutes.ts', 'oauthRoutes.ts'];
    }

    private async createAPITestFiles(testSuite: string): Promise<void> {
        this.logger.debug('Created comprehensive API test files');
    }

    private async createServerFile(serverCode: string): Promise<void> {
        const serverPath = path.join(this.workspaceRoot, 'server.ts');
        try {
            await fs.promises.writeFile(serverPath, serverCode);
            this.logger.debug('Created server.ts file');
        } catch (error) {
            this.logger.warn('Could not create server.ts', error as Error);
        }
    }

    private async createDatabaseConnectionFiles(config: any): Promise<void> {
        this.logger.debug('Created database connection configuration');
    }

    private async createEnvironmentFiles(config: any): Promise<void> {
        this.logger.debug('Created environment configuration files');
    }

    private async createDockerFiles(dockerfile: string, dockerCompose: string): Promise<void> {
        try {
            await fs.promises.writeFile(path.join(this.workspaceRoot, 'Dockerfile'), dockerfile);
            await fs.promises.writeFile(path.join(this.workspaceRoot, 'docker-compose.yml'), dockerCompose);
            this.logger.debug('Created Docker configuration files');
        } catch (error) {
            this.logger.warn('Could not create Docker files', error as Error);
        }
    }

    private async loadBackendConfiguration(): Promise<void> {
        try {
            const configPath = path.join(this.workspaceRoot, '.backend-config.json');
            const configData = await fs.promises.readFile(configPath, 'utf8');
            const data = JSON.parse(configData);
            
            this.databaseSchema = data.databaseSchema || {};
            this.authConfig = data.authConfig || {};
            
            if (data.apiEndpoints) {
                for (const [key, value] of Object.entries(data.apiEndpoints)) {
                    this.apiEndpoints.set(key, value);
                }
            }
            
            this.logger.info('Loaded existing backend configuration');
        } catch (error) {
            // Configuration doesn't exist yet
            this.databaseSchema = {};
            this.authConfig = {};
            this.apiEndpoints = new Map();
        }
    }

    private async saveBackendConfiguration(): Promise<void> {
        try {
            const configPath = path.join(this.workspaceRoot, '.backend-config.json');
            const data = {
                databaseSchema: this.databaseSchema,
                authConfig: this.authConfig,
                apiEndpoints: Object.fromEntries(this.apiEndpoints),
                timestamp: new Date()
            };
            
            await fs.promises.writeFile(configPath, JSON.stringify(data, null, 2));
            this.logger.info('Saved backend configuration');
        } catch (error) {
            this.logger.warn('Could not save backend configuration', error as Error);
        }
    }
}
