import * as vscode from 'vscode';
import { 
    BaseAgent, 
    AgentId, 
    AgentType, 
    AgentStatus, 
    AgentCapabilities, 
    AgentConfig, 
    AgentTask, 
    TaskResult, 
    TaskProgress, 
    AgentMessage, 
    AgentResponse, 
    HealthStatus, 
    AgentMetrics,
    MessageType,
    Logger,
    DevTeamError
} from '../types';

export abstract class BaseAgentImpl implements BaseAgent {
    public status: AgentStatus = 'INITIALIZING';
    protected config: AgentConfig | null = null;
    protected subscriptions: string[] = [];
    protected currentTasks: Map<string, AgentTask> = new Map();
    protected taskProgress: Map<string, TaskProgress> = new Map();
    protected startTime: Date = new Date();

    constructor(
        public readonly id: AgentId,
        public readonly type: AgentType,
        public readonly capabilities: AgentCapabilities,
        protected logger: Logger
    ) {}

    // Lifecycle Management
    async initialize(config: AgentConfig): Promise<void> {
        this.logger.info(`Initializing agent ${this.id}`);
        
        try {
            this.config = config;
            this.status = 'INITIALIZING';
            
            // Validate configuration
            await this.validateConfiguration(config);
            
            // Initialize AI clients and other resources
            await this.initializeResources();
            
            this.status = 'READY';
            this.logger.info(`Agent ${this.id} initialized successfully`);
            
        } catch (error) {
            this.status = 'ERROR';
            this.logger.error(`Failed to initialize agent ${this.id}`, error as Error);
            throw new DevTeamError('AGENT_INIT_FAILED', `Agent ${this.id} initialization failed`, { error });
        }
    }

    async start(): Promise<void> {
        if (this.status !== 'READY') {
            throw new DevTeamError('AGENT_NOT_READY', `Agent ${this.id} is not ready to start`);
        }

        this.logger.info(`Starting agent ${this.id}`);
        this.status = 'READY';
        await this.onStart();
    }

    async stop(): Promise<void> {
        this.logger.info(`Stopping agent ${this.id}`);
        this.status = 'OFFLINE';
        
        // Cancel all current tasks
        for (const [taskId, task] of this.currentTasks) {
            await this.cancelTask(taskId);
        }
        
        await this.cleanup();
    }

    async restart(): Promise<void> {
        await this.stop();
        if (this.config) {
            await this.initialize(this.config);
            await this.start();
        }
    }

    // Task Execution
    async executeTask(task: AgentTask): Promise<TaskResult> {
        this.logger.info(`Agent ${this.id} executing task: ${task.title}`);
        
        if (!this.canHandleTask(task)) {
            throw new DevTeamError('TASK_NOT_SUPPORTED', `Agent ${this.id} cannot handle task type ${task.type}`);
        }

        if (this.status !== 'READY') {
            throw new DevTeamError('AGENT_NOT_READY', `Agent ${this.id} is not ready to execute tasks`);
        }

        const startTime = Date.now();
        this.status = 'BUSY';
        this.currentTasks.set(task.id, task);
        
        // Initialize task progress
        this.taskProgress.set(task.id, {
            taskId: task.id,
            percentage: 0,
            currentStep: 'Starting task execution',
            timeSpent: 0,
            estimatedRemaining: task.estimatedHours * 3600000, // Convert hours to milliseconds
            lastUpdate: new Date()
        });

        try {
            // Execute the actual task logic (implemented by subclasses)
            const result = await this.executeTaskImpl(task);
            
            const duration = Date.now() - startTime;
            
            // Update final progress
            this.taskProgress.set(task.id, {
                taskId: task.id,
                percentage: 100,
                currentStep: 'Task completed',
                timeSpent: duration,
                estimatedRemaining: 0,
                lastUpdate: new Date()
            });

            this.currentTasks.delete(task.id);
            this.status = this.currentTasks.size > 0 ? 'BUSY' : 'READY';
            
            this.logger.info(`Agent ${this.id} completed task ${task.title} in ${duration}ms`);
            
            return {
                taskId: task.id,
                status: result.status,
                output: result.output,
                artifacts: result.artifacts || [],
                duration,
                errors: result.errors,
                warnings: result.warnings,
                nextSteps: result.nextSteps
            };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.currentTasks.delete(task.id);
            this.status = this.currentTasks.size > 0 ? 'BUSY' : 'READY';
            
            this.logger.error(`Agent ${this.id} failed to execute task ${task.title}`, error as Error);
            
            return {
                taskId: task.id,
                status: 'FAILURE',
                output: null,
                artifacts: [],
                duration,
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }

    canHandleTask(task: AgentTask): boolean {
        return this.capabilities.supportedTaskTypes.includes(task.type) &&
               this.currentTasks.size < this.capabilities.maxConcurrentTasks;
    }

    getTaskProgress(taskId: string): TaskProgress {
        const progress = this.taskProgress.get(taskId);
        if (!progress) {
            throw new DevTeamError('TASK_NOT_FOUND', `Task ${taskId} not found in agent ${this.id}`);
        }
        return progress;
    }

    // Communication
    async sendMessage(message: AgentMessage): Promise<void> {
        this.logger.debug(`Agent ${this.id} sending message: ${message.type} to ${message.recipient || 'broadcast'}`);
        // This would be handled by the orchestrator's message system
        // For now, we'll just log it
    }

    async receiveMessage(message: AgentMessage): Promise<AgentResponse> {
        this.logger.debug(`Agent ${this.id} received message: ${message.type} from ${message.sender}`);
        
        try {
            const response = await this.handleMessage(message);
            
            return {
                messageId: message.id,
                success: true,
                data: response,
                timestamp: new Date()
            };
            
        } catch (error) {
            this.logger.error(`Agent ${this.id} error handling message ${message.id}`, error as Error);
            
            return {
                messageId: message.id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
        }
    }

    subscribeToTopic(topic: string): void {
        if (!this.subscriptions.includes(topic)) {
            this.subscriptions.push(topic);
            this.logger.debug(`Agent ${this.id} subscribed to topic: ${topic}`);
        }
    }

    // Health and Monitoring
    getHealthStatus(): HealthStatus {
        const uptime = Date.now() - this.startTime.getTime();
        
        return {
            status: this.status === 'ERROR' ? 'UNHEALTHY' : 
                    this.status === 'OFFLINE' ? 'UNHEALTHY' : 'HEALTHY',
            lastCheck: new Date(),
            uptime,
            issues: this.status === 'ERROR' ? ['Agent in error state'] : [],
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
            cpuUsage: 0 // Would need more sophisticated monitoring
        };
    }

    getMetrics(): AgentMetrics {
        // Basic metrics implementation - would be enhanced with more detailed tracking
        return {
            productivity: {
                tasksCompleted: 0, // Would track this
                averageCompletionTime: 0,
                velocityTrend: [],
                estimationAccuracy: 1.0
            },
            quality: {
                codeQualityScore: 0.85,
                testCoverageAchieved: 0.0,
                defectRate: 0.0,
                reworkPercentage: 0.0
            },
            reliability: {
                uptime: (Date.now() - this.startTime.getTime()) / 1000,
                errorRate: 0.0,
                responseTime: 1000,
                successRate: 1.0
            },
            coordination: {
                communicationEfficiency: 0.9,
                conflictResolutionTime: 300,
                dependencyResolutionRate: 1.0,
                collaborationScore: 0.85
            }
        };
    }

    getConfiguration(): AgentConfig {
        if (!this.config) {
            throw new DevTeamError('AGENT_NOT_CONFIGURED', `Agent ${this.id} is not configured`);
        }
        return { ...this.config };
    }

    // Abstract Methods - Must be implemented by subclasses
    protected abstract executeTaskImpl(task: AgentTask): Promise<TaskResult>;
    protected abstract handleMessage(message: AgentMessage): Promise<any>;
    protected abstract validateConfiguration(config: AgentConfig): Promise<void>;
    protected abstract initializeResources(): Promise<void>;

    // Protected helper methods
    protected async updateTaskProgress(taskId: string, percentage: number, currentStep: string): Promise<void> {
        const progress = this.taskProgress.get(taskId);
        if (progress) {
            progress.percentage = percentage;
            progress.currentStep = currentStep;
            progress.timeSpent = Date.now() - (progress.lastUpdate.getTime() - progress.timeSpent);
            progress.lastUpdate = new Date();
            
            this.logger.debug(`Task ${taskId} progress: ${percentage}% - ${currentStep}`);
        }
    }

    protected async cancelTask(taskId: string): Promise<void> {
        this.currentTasks.delete(taskId);
        this.taskProgress.delete(taskId);
        this.logger.info(`Task ${taskId} cancelled`);
    }

    protected async onStart(): Promise<void> {
        // Override in subclasses for custom start logic
    }

    protected async cleanup(): Promise<void> {
        // Override in subclasses for custom cleanup logic
        this.subscriptions = [];
        this.currentTasks.clear();
        this.taskProgress.clear();
    }

    // Utility methods for AI integration
    protected async callAnthropicAPI(prompt: string, system?: string): Promise<string> {
        if (!this.config?.anthropicApiKey) {
            throw new DevTeamError('API_KEY_MISSING', 'Anthropic API key not configured');
        }

        try {
            // This is a placeholder for Anthropic API integration
            // In real implementation, would use @anthropic-ai/sdk
            this.logger.debug(`Calling Anthropic API for agent ${this.id}`);
            
            // Mock response for now
            return `Mock AI response for: ${prompt.substring(0, 100)}...`;
            
        } catch (error) {
            this.logger.error(`Anthropic API call failed for agent ${this.id}`, error as Error);
            throw new DevTeamError('API_CALL_FAILED', 'Anthropic API call failed', { error });
        }
    }

    protected async searchWithTavily(query: string): Promise<any[]> {
        if (!this.config?.tavilyApiKey) {
            throw new DevTeamError('API_KEY_MISSING', 'Tavily API key not configured');
        }

        try {
            // This is a placeholder for Tavily API integration
            this.logger.debug(`Searching with Tavily for agent ${this.id}: ${query}`);
            
            // Mock response for now
            return [
                {
                    title: `Mock search result for: ${query}`,
                    url: 'https://example.com/mock-result',
                    content: `Mock content for search query: ${query}`
                }
            ];
            
        } catch (error) {
            this.logger.error(`Tavily search failed for agent ${this.id}`, error as Error);
            throw new DevTeamError('API_CALL_FAILED', 'Tavily search failed', { error });
        }
    }
}
