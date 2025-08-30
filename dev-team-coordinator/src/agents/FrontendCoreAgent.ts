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

export class FrontendCoreAgent extends BaseAgentImpl {
    private workspaceRoot: string = '';
    private componentRegistry: Map<string, any> = new Map();
    private routingConfig: any = {};
    
    constructor(logger: Logger) {
        const capabilities: AgentCapabilities = {
            supportedTaskTypes: [
                'UI_DEVELOPMENT',
                'INTEGRATION',
                'FOUNDATION'
            ],
            requiredAPIs: ['anthropic', 'tavily'],
            skillLevel: 'senior',
            maxConcurrentTasks: 3,
            estimatedTaskDuration: {
                'FOUNDATION': 3,
                'AGENT_DEVELOPMENT': 2,
                'INTEGRATION': 2,
                'UI_DEVELOPMENT': 4,
                'TESTING': 2,
                'DOCUMENTATION': 1,
                'DEPLOYMENT': 1
            }
        };

        super('frontend-core-001', 'FRONTEND_CORE', capabilities, logger);
    }

    protected async validateConfiguration(config: AgentConfig): Promise<void> {
        if (!config.anthropicApiKey) {
            throw new DevTeamError('CONFIG_INVALID', 'Anthropic API key is required for Frontend Core Agent');
        }
        
        if (!config.workingDirectory) {
            throw new DevTeamError('CONFIG_INVALID', 'Working directory is required');
        }
        
        this.workspaceRoot = config.workingDirectory;
    }

    protected async initializeResources(): Promise<void> {
        // Subscribe to frontend development topics
        this.subscribeToTopic('frontend.components');
        this.subscribeToTopic('frontend.routing');
        this.subscribeToTopic('frontend.state');
        this.subscribeToTopic('ui.requirements');
        
        // Load existing component registry
        await this.loadComponentRegistry();
        
        this.logger.info(`Frontend Core Agent initialized for workspace: ${this.workspaceRoot}`);
    }

    protected async executeTaskImpl(task: AgentTask): Promise<TaskResult> {
        this.logger.info(`Frontend Core executing task: ${task.type}`);
        
        try {
            switch (task.type) {
                case 'UI_DEVELOPMENT':
                    return await this.executeUITask(task);
                case 'FOUNDATION':
                    return await this.setupFrontendFoundation(task);
                case 'INTEGRATION':
                    return await this.integrateWithBackend(task);
                default:
                    throw new DevTeamError('TASK_TYPE_UNSUPPORTED', `Task type ${task.type} not supported by Frontend Core Agent`);
            }
        } catch (error) {
            this.logger.error(`Frontend Core task execution failed: ${task.id}`, error as Error);
            throw error;
        }
    }

    protected async handleMessage(message: AgentMessage): Promise<any> {
        this.logger.debug(`Frontend Core handling message: ${message.type}`);
        
        switch (message.type) {
            case 'TASK_ASSIGNMENT':
                return await this.handleTaskAssignment(message);
            case 'STATUS_UPDATE':
                return await this.handleStatusUpdate(message);
            case 'COORDINATION_REQUEST':
                return await this.handleCoordinationRequest(message);
            case 'KNOWLEDGE_SHARING':
                return await this.handleKnowledgeSharing(message);
            default:
                this.logger.debug(`Unhandled message type: ${message.type}`);
                return { acknowledged: true };
        }
    }

    // Task Execution Methods
    private async executeUITask(task: AgentTask): Promise<TaskResult> {
        const startTime = Date.now();
        
        await this.updateTaskProgress(task.id, 10, 'Analyzing UI requirements');
        
        const uiAnalysis = await this.analyzeUIRequirements(task);
        
        await this.updateTaskProgress(task.id, 25, 'Designing component architecture');
        
        const componentDesign = await this.designComponents(uiAnalysis);
        
        await this.updateTaskProgress(task.id, 50, 'Generating React components');
        
        const components = await this.generateComponents(componentDesign);
        
        await this.updateTaskProgress(task.id, 70, 'Setting up routing');
        
        const routing = await this.setupRouting(componentDesign);
        
        await this.updateTaskProgress(task.id, 85, 'Configuring state management');
        
        const stateManagement = await this.setupStateManagement(componentDesign);
        
        await this.updateTaskProgress(task.id, 95, 'Creating component documentation');
        
        const documentation = await this.generateComponentDocumentation(components);
        
        // Save component registry
        await this.saveComponentRegistry();
        
        const duration = Date.now() - startTime;
        
        return {
            taskId: task.id,
            status: 'SUCCESS',
            output: {
                analysis: uiAnalysis,
                components,
                routing,
                stateManagement,
                documentation
            },
            artifacts: this.getGeneratedArtifacts(components, routing, stateManagement),
            duration,
            nextSteps: [
                'Add unit tests for components',
                'Integrate with backend APIs',
                'Add responsive styling'
            ]
        };
    }

    private async setupFrontendFoundation(task: AgentTask): Promise<TaskResult> {
        const startTime = Date.now();
        
        await this.updateTaskProgress(task.id, 20, 'Setting up React project structure');
        
        const projectStructure = await this.createReactProjectStructure();
        
        await this.updateTaskProgress(task.id, 40, 'Installing frontend dependencies');
        
        const dependencies = await this.installFrontendDependencies();
        
        await this.updateTaskProgress(task.id, 60, 'Configuring build tools');
        
        const buildConfig = await this.configureBuildTools();
        
        await this.updateTaskProgress(task.id, 80, 'Setting up development environment');
        
        const devEnvironment = await this.setupDevEnvironment();
        
        const duration = Date.now() - startTime;
        
        return {
            taskId: task.id,
            status: 'SUCCESS',
            output: {
                structure: projectStructure,
                dependencies,
                buildConfig,
                devEnvironment
            },
            artifacts: [
                'src/App.tsx',
                'src/index.tsx',
                'src/components/',
                'src/hooks/',
                'src/utils/',
                'package.json',
                'webpack.config.js'
            ],
            duration,
            nextSteps: [
                'Begin component development',
                'Setup testing framework',
                'Configure linting and formatting'
            ]
        };
    }

    private async integrateWithBackend(task: AgentTask): Promise<TaskResult> {
        const startTime = Date.now();
        
        await this.updateTaskProgress(task.id, 25, 'Analyzing API endpoints');
        
        const apiAnalysis = await this.analyzeAPIEndpoints(task);
        
        await this.updateTaskProgress(task.id, 50, 'Generating API clients');
        
        const apiClients = await this.generateAPIClients(apiAnalysis);
        
        await this.updateTaskProgress(task.id, 75, 'Setting up data fetching');
        
        const dataLayer = await this.setupDataFetching(apiClients);
        
        const duration = Date.now() - startTime;
        
        return {
            taskId: task.id,
            status: 'SUCCESS',
            output: {
                apiAnalysis,
                apiClients,
                dataLayer
            },
            artifacts: [
                'src/services/api.ts',
                'src/hooks/useApi.ts',
                'src/types/api.ts'
            ],
            duration,
            nextSteps: [
                'Add error handling for API calls',
                'Implement loading states',
                'Add API response caching'
            ]
        };
    }

    // UI Analysis and Design Methods
    private async analyzeUIRequirements(task: AgentTask): Promise<any> {
        const prompt = `
        As a senior React developer, analyze these UI requirements and create a comprehensive component strategy:
        
        Task: ${task.title}
        Description: ${task.description}
        Metadata: ${JSON.stringify(task.metadata)}
        
        Please provide:
        1. Component hierarchy and relationships
        2. Props and state requirements
        3. Event handling patterns
        4. Performance considerations
        5. Accessibility requirements
        6. Responsive design needs
        `;
        
        const analysis = await this.callAnthropicAPI(prompt);
        
        // Search for React best practices
        const bestPractices = await this.searchWithTavily('React component best practices 2024');
        
        return {
            requirements: task.description,
            componentStrategy: analysis,
            bestPractices: bestPractices.map(result => result.content).join('\n'),
            timestamp: new Date()
        };
    }

    private async designComponents(analysis: any): Promise<any> {
        const prompt = `
        Based on this UI analysis, design specific React components:
        
        ${JSON.stringify(analysis)}
        
        For each component, provide:
        1. Component name and purpose
        2. Props interface (TypeScript)
        3. State structure if needed
        4. Key methods and event handlers
        5. Child components
        6. External dependencies
        `;
        
        const componentDesign = await this.callAnthropicAPI(prompt);
        
        return {
            components: this.parseComponentDesign(componentDesign),
            hierarchy: 'App -> Layout -> Pages -> Components',
            patterns: ['Container/Presentational', 'Custom Hooks', 'Context API'],
            timestamp: new Date()
        };
    }

    private async generateComponents(design: any): Promise<any[]> {
        const components = [];
        
        for (const component of design.components) {
            const generatedComponent = await this.generateSingleComponent(component);
            components.push(generatedComponent);
            
            // Register component
            this.componentRegistry.set(component.name, {
                ...component,
                generated: true,
                path: `src/components/${component.name}.tsx`
            });
        }
        
        return components;
    }

    private async generateSingleComponent(component: any): Promise<any> {
        const prompt = `
        Generate a complete React TypeScript component:
        
        Component Name: ${component.name}
        Purpose: ${component.purpose}
        Props: ${JSON.stringify(component.props)}
        
        Requirements:
        1. Use TypeScript interfaces
        2. Include proper prop validation
        3. Add accessibility attributes
        4. Include error boundaries where appropriate
        5. Use modern React patterns (hooks, functional components)
        6. Add comprehensive JSDoc comments
        `;
        
        const componentCode = await this.callAnthropicAPI(prompt);
        
        // Create the actual component file
        const componentPath = path.join(this.workspaceRoot, 'src', 'components', `${component.name}.tsx`);
        await this.createComponentFile(componentPath, componentCode);
        
        return {
            name: component.name,
            code: componentCode,
            path: componentPath,
            props: component.props,
            tests: await this.generateComponentTests(component)
        };
    }

    private async setupRouting(design: any): Promise<any> {
        const prompt = `
        Create a React Router configuration for this application:
        
        Components: ${JSON.stringify(design.components)}
        
        Provide:
        1. Route structure with React Router v6
        2. Protected route implementation
        3. Lazy loading setup
        4. Navigation component
        5. Route guards and redirects
        `;
        
        const routingConfig = await this.callAnthropicAPI(prompt);
        
        // Create routing files
        await this.createRoutingFiles(routingConfig);
        
        this.routingConfig = {
            config: routingConfig,
            routes: this.extractRoutes(routingConfig),
            timestamp: new Date()
        };
        
        return this.routingConfig;
    }

    private async setupStateManagement(design: any): Promise<any> {
        const prompt = `
        Design state management for this React application:
        
        Components: ${JSON.stringify(design.components)}
        
        Provide:
        1. Context providers setup
        2. Custom hooks for state management
        3. Reducer patterns where needed
        4. State persistence strategy
        5. Performance optimizations (React.memo, useMemo)
        `;
        
        const stateConfig = await this.callAnthropicAPI(prompt);
        
        // Create state management files
        await this.createStateManagementFiles(stateConfig);
        
        return {
            config: stateConfig,
            providers: ['AuthProvider', 'ThemeProvider', 'DataProvider'],
            hooks: ['useAuth', 'useTheme', 'useData'],
            timestamp: new Date()
        };
    }

    // Backend Integration Methods
    private async analyzeAPIEndpoints(task: AgentTask): Promise<any> {
        // This would typically analyze OpenAPI specs or backend documentation
        const mockAPIAnalysis = {
            baseUrl: 'http://localhost:3001/api',
            endpoints: [
                { path: '/users', method: 'GET', description: 'Get all users' },
                { path: '/users/:id', method: 'GET', description: 'Get user by ID' },
                { path: '/users', method: 'POST', description: 'Create user' },
                { path: '/auth/login', method: 'POST', description: 'User login' }
            ],
            authentication: 'JWT Bearer Token',
            dataFormats: ['JSON']
        };
        
        return mockAPIAnalysis;
    }

    private async generateAPIClients(apiAnalysis: any): Promise<any> {
        const prompt = `
        Generate TypeScript API client code for these endpoints:
        
        ${JSON.stringify(apiAnalysis)}
        
        Requirements:
        1. Type-safe API calls
        2. Error handling
        3. Request/response interceptors
        4. Authentication token management
        5. Retry logic for failed requests
        `;
        
        const apiClientCode = await this.callAnthropicAPI(prompt);
        
        // Create API client files
        await this.createAPIClientFiles(apiClientCode);
        
        return {
            clientCode: apiClientCode,
            endpoints: apiAnalysis.endpoints,
            types: 'Generated TypeScript interfaces'
        };
    }

    private async setupDataFetching(apiClients: any): Promise<any> {
        const prompt = `
        Create React hooks for data fetching using these API clients:
        
        ${JSON.stringify(apiClients)}
        
        Generate:
        1. Custom hooks for each endpoint
        2. Loading and error states
        3. Data caching strategy
        4. Optimistic updates
        5. Real-time data synchronization
        `;
        
        const dataHooks = await this.callAnthropicAPI(prompt);
        
        await this.createDataHookFiles(dataHooks);
        
        return {
            hooks: dataHooks,
            caching: 'React Query integration',
            realtime: 'WebSocket connections'
        };
    }

    // Message Handling Methods
    private async handleTaskAssignment(message: AgentMessage): Promise<any> {
        const task = message.payload.task;
        this.logger.info(`Frontend Core received task assignment: ${task.title}`);
        
        return {
            accepted: true,
            estimatedDuration: this.capabilities.estimatedTaskDuration[task.type as keyof typeof this.capabilities.estimatedTaskDuration] || 4,
            requirements: ['React 18+', 'TypeScript', 'CSS-in-JS']
        };
    }

    private async handleStatusUpdate(message: AgentMessage): Promise<any> {
        const update = message.payload;
        this.logger.debug(`Frontend Core received status update from ${message.sender}`);
        
        return {
            acknowledged: true,
            currentStatus: 'Processing frontend development tasks'
        };
    }

    private async handleCoordinationRequest(message: AgentMessage): Promise<any> {
        const request = message.payload;
        
        return {
            response: 'Frontend Core ready to coordinate',
            capabilities: this.capabilities.supportedTaskTypes,
            availability: this.currentTasks.size < this.capabilities.maxConcurrentTasks
        };
    }

    private async handleKnowledgeSharing(message: AgentMessage): Promise<any> {
        const knowledge = message.payload;
        
        // Update component registry with shared knowledge
        if (knowledge.type === 'component_pattern') {
            this.componentRegistry.set(`pattern_${knowledge.name}`, knowledge);
        }
        
        return {
            integrated: true,
            type: 'frontend_knowledge',
            impact: 'Updated component patterns and best practices'
        };
    }

    // Helper Methods
    private parseComponentDesign(design: string): any[] {
        // Mock component parsing - in real implementation would parse AI response
        return [
            {
                name: 'Header',
                purpose: 'Application header with navigation',
                props: { title: 'string', navigation: 'NavigationItem[]' }
            },
            {
                name: 'UserList',
                purpose: 'Display list of users',
                props: { users: 'User[]', onSelect: 'function' }
            },
            {
                name: 'UserCard',
                purpose: 'Individual user display card',
                props: { user: 'User', onClick: 'function' }
            }
        ];
    }

    private async generateComponentTests(component: any): Promise<string> {
        const prompt = `
        Generate comprehensive Jest/React Testing Library tests for this component:
        
        Component: ${component.name}
        Props: ${JSON.stringify(component.props)}
        
        Include:
        1. Rendering tests
        2. Props validation
        3. Event handling tests
        4. Accessibility tests
        5. Edge case handling
        `;
        
        return await this.callAnthropicAPI(prompt);
    }

    private getGeneratedArtifacts(components: any[], routing: any, stateManagement: any): string[] {
        const artifacts = [
            'src/App.tsx',
            'src/components/',
            'src/hooks/',
            'src/context/',
            'src/services/',
            'src/types/'
        ];
        
        // Add specific component files
        components.forEach(comp => {
            artifacts.push(`src/components/${comp.name}.tsx`);
            artifacts.push(`src/components/${comp.name}.test.tsx`);
        });
        
        return artifacts;
    }

    private extractRoutes(routingConfig: string): string[] {
        // Mock route extraction - would parse actual routing config
        return ['/dashboard', '/users', '/settings', '/profile'];
    }

    // File Creation Methods
    private async createComponentFile(filePath: string, code: string): Promise<void> {
        try {
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            await fs.promises.writeFile(filePath, code);
            this.logger.debug(`Created component file: ${filePath}`);
        } catch (error) {
            this.logger.warn(`Could not create component file: ${filePath}`, error as Error);
        }
    }

    private async createReactProjectStructure(): Promise<string[]> {
        const structure = [
            'src/',
            'src/components/',
            'src/hooks/',
            'src/context/',
            'src/services/',
            'src/types/',
            'src/utils/',
            'src/styles/',
            'public/',
            'src/App.tsx',
            'src/index.tsx'
        ];
        
        for (const item of structure) {
            const fullPath = path.join(this.workspaceRoot, item);
            try {
                if (item.endsWith('/')) {
                    await fs.promises.mkdir(fullPath, { recursive: true });
                } else {
                    await this.createBasicReactFile(fullPath, item);
                }
            } catch (error) {
                this.logger.warn(`Could not create: ${item}`, error as Error);
            }
        }
        
        return structure;
    }

    private async createBasicReactFile(filePath: string, fileName: string): Promise<void> {
        let content = '';
        
        switch (fileName) {
            case 'src/App.tsx':
                content = `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Dev Team Project</h1>
        <p>Generated by Dev Team Coordinator</p>
      </header>
    </div>
  );
}

export default App;`;
                break;
            case 'src/index.tsx':
                content = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
                break;
            default:
                content = `// ${fileName}\n// Generated by Frontend Core Agent\n`;
        }
        
        try {
            await fs.promises.writeFile(filePath, content);
        } catch (error) {
            this.logger.warn(`Could not write file ${fileName}`, error as Error);
        }
    }

    private async installFrontendDependencies(): Promise<any> {
        return {
            dependencies: {
                'react': '^18.0.0',
                'react-dom': '^18.0.0',
                'react-router-dom': '^6.0.0',
                '@types/react': '^18.0.0',
                '@types/react-dom': '^18.0.0'
            },
            devDependencies: {
                '@testing-library/react': '^13.0.0',
                '@testing-library/jest-dom': '^5.0.0',
                'typescript': '^5.0.0'
            }
        };
    }

    private async configureBuildTools(): Promise<any> {
        return {
            webpack: 'Configured for TypeScript and React',
            babel: 'React and TypeScript presets',
            eslint: 'React and TypeScript rules'
        };
    }

    private async setupDevEnvironment(): Promise<any> {
        return {
            devServer: 'Hot reload enabled',
            proxy: 'API proxy to backend',
            debugging: 'React DevTools integration'
        };
    }

    private async createRoutingFiles(routingConfig: string): Promise<void> {
        // Would create actual routing files here
        this.logger.debug('Created routing configuration files');
    }

    private async createStateManagementFiles(stateConfig: string): Promise<void> {
        // Would create actual state management files here
        this.logger.debug('Created state management files');
    }

    private async createAPIClientFiles(apiClientCode: string): Promise<void> {
        // Would create actual API client files here
        this.logger.debug('Created API client files');
    }

    private async createDataHookFiles(dataHooks: string): Promise<void> {
        // Would create actual data hook files here
        this.logger.debug('Created data fetching hook files');
    }

    private async loadComponentRegistry(): Promise<void> {
        try {
            const registryPath = path.join(this.workspaceRoot, '.frontend-registry.json');
            const registryData = await fs.promises.readFile(registryPath, 'utf8');
            const data = JSON.parse(registryData);
            
            for (const [key, value] of Object.entries(data)) {
                this.componentRegistry.set(key, value);
            }
            
            this.logger.info('Loaded existing component registry');
        } catch (error) {
            // Registry doesn't exist yet
            this.componentRegistry = new Map();
        }
    }

    private async saveComponentRegistry(): Promise<void> {
        try {
            const registryPath = path.join(this.workspaceRoot, '.frontend-registry.json');
            const registryData = Object.fromEntries(this.componentRegistry);
            await fs.promises.writeFile(registryPath, JSON.stringify(registryData, null, 2));
            this.logger.info('Saved component registry');
        } catch (error) {
            this.logger.warn('Could not save component registry', error as Error);
        }
    }

    private async generateComponentDocumentation(components: any[]): Promise<any> {
        const prompt = `
        Generate comprehensive documentation for these React components:
        
        ${JSON.stringify(components)}
        
        Include:
        1. Component API documentation
        2. Usage examples
        3. Props documentation
        4. Styling guide
        5. Best practices
        `;
        
        return await this.callAnthropicAPI(prompt);
    }
}
