import * as vscode from 'vscode';
import { 
    BaseAgent, 
    AgentId, 
    AgentTask, 
    AgentMessage, 
    ExtensionConfig, 
    Logger, 
    ProjectTemplate,
    TaskType,
    DevTeamError 
} from '../types';
import { DatabaseManager } from '../utils/database';
import { TaskDistributionEngine } from '../coordination/TaskDistributionEngine';
import { HumanFeedbackSystem } from '../coordination/HumanFeedbackSystem';
import { ProgressMonitor } from '../coordination/ProgressMonitor';
// Generate UUID without external dependency
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export class AgentOrchestrator {
    private agents: Map<AgentId, BaseAgent> = new Map();
    private activeProjects: Set<string> = new Set();
    private isInitialized = false;
    private isRunning = false;
    private messageQueue: AgentMessage[] = [];
    private templates: ProjectTemplate[] = [];

    constructor(
        private context: vscode.ExtensionContext,
        private config: ExtensionConfig,
        private logger: Logger,
        private database: DatabaseManager
    ) {}

    async initialize(): Promise<void> {
        this.logger.info('Initializing Agent Orchestrator...');

        try {
            // Load project templates
            await this.loadProjectTemplates();
            
            // Initialize agents (create instances but don't start them yet)
            await this.initializeAgents();
            
            // Load existing tasks and projects from database
            await this.loadExistingData();
            
            this.isInitialized = true;
            this.logger.info('Agent Orchestrator initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize Agent Orchestrator', error as Error);
            throw new DevTeamError('ORCHESTRATOR_INIT_FAILED', 'Failed to initialize orchestrator', { error });
        }
    }

    async start(): Promise<void> {
        if (!this.isInitialized) {
            throw new DevTeamError('ORCHESTRATOR_NOT_INITIALIZED', 'Orchestrator not initialized');
        }

        if (this.isRunning) {
            this.logger.warn('Agent Orchestrator is already running');
            return;
        }

        this.logger.info('Starting Agent Orchestrator...');

        try {
            // Start all agents
            for (const [agentId, agent] of this.agents) {
                try {
                    await agent.start();
                    this.logger.info(`Agent started: ${agentId}`);
                } catch (error) {
                    this.logger.error(`Failed to start agent ${agentId}`, error as Error);
                }
            }

            // Start message processing loop
            this.startMessageProcessing();
            
            this.isRunning = true;
            this.logger.info('Agent Orchestrator started successfully');
            
        } catch (error) {
            this.logger.error('Failed to start Agent Orchestrator', error as Error);
            throw new DevTeamError('ORCHESTRATOR_START_FAILED', 'Failed to start orchestrator', { error });
        }
    }

    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        this.logger.info('Stopping Agent Orchestrator...');

        try {
            // Stop all agents
            for (const [agentId, agent] of this.agents) {
                try {
                    await agent.stop();
                    this.logger.info(`Agent stopped: ${agentId}`);
                } catch (error) {
                    this.logger.error(`Error stopping agent ${agentId}`, error as Error);
                }
            }

            this.isRunning = false;
            this.logger.info('Agent Orchestrator stopped');
            
        } catch (error) {
            this.logger.error('Error stopping Agent Orchestrator', error as Error);
        }
    }

    async updateConfiguration(config: ExtensionConfig): Promise<void> {
        this.logger.info('Updating Agent Orchestrator configuration');
        
        this.config = config;
        
        // Update agent configurations
        for (const [agentId, agent] of this.agents) {
            try {
                await agent.initialize({
                    anthropicApiKey: config.anthropicApiKey,
                    tavilyApiKey: config.tavilyApiKey,
                    maxRetries: 3,
                    timeout: config.agentTimeout,
                    logLevel: config.logLevel as any,
                    workingDirectory: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''
                });
            } catch (error) {
                this.logger.error(`Failed to update configuration for agent ${agentId}`, error as Error);
            }
        }
    }

    // Project Management
    async getProjectTemplates(): Promise<ProjectTemplate[]> {
        return this.templates;
    }

    async createProject(template: ProjectTemplate, projectName: string): Promise<void> {
        this.logger.info(`Creating project: ${projectName} with template: ${template.name}`);

        try {
            const projectId = generateUUID();
            
            // Create project in database
            await this.database.createProject(projectId, projectName, template.id);
            
            // Create project tasks based on template
            await this.createProjectTasks(projectId, template, projectName);
            
            this.activeProjects.add(projectId);
            
            this.logger.info(`Project created successfully: ${projectName}`);
            
        } catch (error) {
            this.logger.error(`Failed to create project: ${projectName}`, error as Error);
            throw new DevTeamError('PROJECT_CREATION_FAILED', `Failed to create project: ${projectName}`, { error });
        }
    }

    // Task Management
    async getAvailableTasks(): Promise<AgentTask[]> {
        try {
            return await this.database.getTasks({ status: 'NOT_STARTED' });
        } catch (error) {
            this.logger.error('Failed to get available tasks', error as Error);
            throw new DevTeamError('TASK_RETRIEVAL_FAILED', 'Failed to get available tasks', { error });
        }
    }

    async assignTask(taskId: string, agentId: AgentId): Promise<void> {
        this.logger.info(`Assigning task ${taskId} to agent ${agentId}`);

        try {
            const agent = this.agents.get(agentId);
            if (!agent) {
                throw new DevTeamError('AGENT_NOT_FOUND', `Agent not found: ${agentId}`);
            }

            const task = await this.database.getTask(taskId);
            if (!task) {
                throw new DevTeamError('TASK_NOT_FOUND', `Task not found: ${taskId}`);
            }

            // Check if agent can handle this task
            if (!agent.canHandleTask(task)) {
                throw new DevTeamError('AGENT_CANNOT_HANDLE_TASK', `Agent ${agentId} cannot handle task ${taskId}`);
            }

            // Update task assignment
            await this.database.updateTask(taskId, { 
                assignedTo: agentId,
                status: 'IN_PROGRESS'
            });

            // Send task assignment message to agent
            const message: AgentMessage = {
                id: generateUUID(),
                type: 'TASK_ASSIGNMENT',
                sender: 'orchestrator',
                recipient: agentId,
                timestamp: new Date(),
                payload: { task },
                priority: 'HIGH',
                requiresResponse: true
            };

            await this.sendMessage(message);
            
            this.logger.info(`Task ${taskId} assigned to agent ${agentId} successfully`);
            
        } catch (error) {
            this.logger.error(`Failed to assign task ${taskId} to agent ${agentId}`, error as Error);
            throw error;
        }
    }

    // Agent Management  
    async getAvailableAgents(taskType?: TaskType): Promise<BaseAgent[]> {
        const availableAgents: BaseAgent[] = [];
        
        for (const [agentId, agent] of this.agents) {
            if (agent.status === 'READY' || agent.status === 'INITIALIZING') {
                if (!taskType || agent.capabilities.supportedTaskTypes.includes(taskType)) {
                    availableAgents.push(agent);
                }
            }
        }
        
        return availableAgents;
    }

    async getAllAgents(): Promise<BaseAgent[]> {
        return Array.from(this.agents.values());
    }

    // Message Handling
    private async sendMessage(message: AgentMessage): Promise<void> {
        try {
            // Save message to database
            await this.database.saveMessage(message);
            
            // Add to in-memory queue for immediate processing
            this.messageQueue.push(message);
            
            this.logger.debug(`Message queued: ${message.type} from ${message.sender} to ${message.recipient || 'broadcast'}`);
            
        } catch (error) {
            this.logger.error('Failed to send message', error as Error);
            throw new DevTeamError('MESSAGE_SEND_FAILED', 'Failed to send message', { error, message });
        }
    }

    private startMessageProcessing(): void {
        // Process messages every second
        setInterval(async () => {
            if (this.messageQueue.length > 0) {
                await this.processMessageQueue();
            }
        }, 1000);
    }

    private async processMessageQueue(): Promise<void> {
        const messages = [...this.messageQueue];
        this.messageQueue = [];

        for (const message of messages) {
            try {
                if (message.recipient) {
                    // Direct message to specific agent
                    const agent = this.agents.get(message.recipient);
                    if (agent) {
                        await agent.receiveMessage(message);
                        await this.database.markMessageProcessed(message.id);
                    }
                } else {
                    // Broadcast message to all agents
                    for (const agent of this.agents.values()) {
                        await agent.receiveMessage(message);
                    }
                    await this.database.markMessageProcessed(message.id);
                }
            } catch (error) {
                this.logger.error(`Failed to process message ${message.id}`, error as Error);
            }
        }
    }

    // Private Methods
    private async loadProjectTemplates(): Promise<void> {
        // For now, create some basic templates
        this.templates = [
            {
                id: 'react-app',
                name: 'React Application',
                description: 'Full-stack React application with TypeScript',
                category: 'Web Application',
                technologies: ['React', 'TypeScript', 'Node.js', 'Express'],
                agents: {
                    'FRONTEND_CORE': ['component-development', 'routing', 'state-management'],
                    'FRONTEND_UIUX': ['styling', 'responsive-design', 'accessibility'],
                    'BACKEND_INTEGRATION': ['api-development', 'database-design'],
                    'QUALITY_ASSURANCE': ['testing', 'quality-validation'],
                    'DEVOPS': ['build-setup', 'deployment'],
                    'ARCHITECTURE_LEAD': ['coordination', 'decisions'],
                    'FRONTEND_VISUALIZATION': ['dashboard', 'charts'],
                    'MCP_INTEGRATION': ['external-apis']
                },
                phases: [
                    {
                        name: 'Setup',
                        duration: '1-2 days',
                        tasks: ['project-initialization', 'dependency-setup'],
                        dependencies: []
                    },
                    {
                        name: 'Development', 
                        duration: '1-2 weeks',
                        tasks: ['component-development', 'api-integration'],
                        dependencies: ['Setup']
                    }
                ],
                estimatedDuration: 14,
                complexity: 'MEDIUM'
            },
            {
                id: 'mcp-server',
                name: 'MCP Server',
                description: 'Model Context Protocol server with custom tools',
                category: 'Backend Service',
                technologies: ['Node.js', 'TypeScript', 'gRPC'],
                agents: {
                    'MCP_INTEGRATION': ['server-scaffold', 'tool-creation', 'documentation'],
                    'BACKEND_INTEGRATION': ['server-setup', 'api-endpoints'],
                    'QUALITY_ASSURANCE': ['testing', 'validation'],
                    'DEVOPS': ['deployment', 'monitoring'],
                    'ARCHITECTURE_LEAD': ['coordination', 'architecture']
                },
                phases: [
                    {
                        name: 'Server Setup',
                        duration: '1 day', 
                        tasks: ['server-scaffold', 'basic-configuration'],
                        dependencies: []
                    },
                    {
                        name: 'Tool Development',
                        duration: '3-5 days',
                        tasks: ['custom-tools', 'resource-management'],
                        dependencies: ['Server Setup']
                    }
                ],
                estimatedDuration: 7,
                complexity: 'LOW'
            }
        ];

        this.logger.info(`Loaded ${this.templates.length} project templates`);
    }

    private async initializeAgents(): Promise<void> {
        // Import agent implementations
        const { ArchitectureLeadAgent } = await import('../agents/ArchitectureLeadAgent');
        const { FrontendCoreAgent } = await import('../agents/FrontendCoreAgent');
        const { QualityAssuranceAgent } = await import('../agents/QualityAssuranceAgent');
        const { BackendIntegrationAgent } = await import('../agents/BackendIntegrationAgent');
        
        const agentConfig = {
            anthropicApiKey: this.config.anthropicApiKey,
            tavilyApiKey: this.config.tavilyApiKey,
            maxRetries: 3,
            timeout: this.config.agentTimeout,
            logLevel: this.config.logLevel as any,
            workingDirectory: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''
        };

        try {
            // Initialize Architecture Lead Agent
            const archAgent = new ArchitectureLeadAgent(this.logger);
            await archAgent.initialize(agentConfig);
            this.agents.set('arch-lead-001', archAgent);
            
            // Initialize Frontend Core Agent
            const frontendAgent = new FrontendCoreAgent(this.logger);
            await frontendAgent.initialize(agentConfig);
            this.agents.set('frontend-core-001', frontendAgent);
            
            // Initialize Quality Assurance Agent
            const qaAgent = new QualityAssuranceAgent(this.logger);
            await qaAgent.initialize(agentConfig);
            this.agents.set('qa-001', qaAgent);
            
            // Initialize Backend Integration Agent
            const backendAgent = new BackendIntegrationAgent(this.logger);
            await backendAgent.initialize(agentConfig);
            this.agents.set('backend-001', backendAgent);
            
            this.logger.info(`Initialized ${this.agents.size} agents successfully`);
            
        } catch (error) {
            this.logger.error('Failed to initialize one or more agents', error as Error);
            throw error;
        }
    }

    private async loadExistingData(): Promise<void> {
        try {
            // Load existing projects and tasks
            const tasks = await this.database.getTasks();
            this.logger.info(`Loaded ${tasks.length} existing tasks from database`);
            
        } catch (error) {
            this.logger.error('Failed to load existing data', error as Error);
        }
    }

    private async createProjectTasks(projectId: string, template: ProjectTemplate, projectName: string): Promise<void> {
        const tasks: AgentTask[] = [];
        
        // Create tasks based on template phases
        for (const phase of template.phases) {
            for (const taskName of phase.tasks) {
                const task: AgentTask = {
                    id: generateUUID(),
                    title: `${projectName}: ${taskName}`,
                    description: `${taskName} for ${projectName} project`,
                    type: 'FOUNDATION',
                    priority: 'MEDIUM',
                    status: 'NOT_STARTED',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    dependencies: [],
                    blockers: [],
                    estimatedHours: 4,
                    tags: [projectName, phase.name.toLowerCase()],
                    metadata: {
                        projectId,
                        templateId: template.id,
                        phase: phase.name
                    }
                };
                
                tasks.push(task);
            }
        }
        
        // Save tasks to database
        for (const task of tasks) {
            await this.database.createTask(task);
        }
        
        this.logger.info(`Created ${tasks.length} tasks for project ${projectName}`);
    }
}
