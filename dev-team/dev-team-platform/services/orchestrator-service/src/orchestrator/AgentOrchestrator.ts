import { EventEmitter } from 'events';
import { 
    AgentId, 
    AgentType, 
    AgentTask, 
    TaskResult, 
    AgentMessage, 
    PlatformConfig, 
    Logger, 
    BaseAgent,
    AgentStatus,
    HealthStatus,
    AgentMetrics,
    MessageType,
    TaskStatus,
    PlatformError
} from '../shared';
import { DatabaseManager } from '../database/DatabaseManager';
import { MessageBroker } from '../messaging/MessageBroker';

export interface AgentRegistration {
    agent: BaseAgent;
    lastSeen: Date;
    heartbeatInterval?: NodeJS.Timeout;
}

export interface SystemMetrics {
    totalAgents: number;
    activeAgents: number;
    busyAgents: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageResponseTime: number;
    systemLoad: number;
    memory: {
        used: number;
        free: number;
        total: number;
    };
}

export class AgentOrchestrator extends EventEmitter {
    private agents: Map<AgentId, AgentRegistration> = new Map();
    private tasks: Map<string, AgentTask> = new Map();
    private taskQueue: AgentTask[] = [];
    private config: PlatformConfig;
    private logger: Logger;
    private database: DatabaseManager;
    private messageBroker: MessageBroker;
    private isRunning: boolean = false;
    private taskProcessingInterval?: NodeJS.Timeout;
    private healthCheckInterval?: NodeJS.Timeout;

    constructor(
        config: PlatformConfig, 
        logger: Logger, 
        database: DatabaseManager, 
        messageBroker: MessageBroker
    ) {
        super();
        this.config = config;
        this.logger = logger;
        this.database = database;
        this.messageBroker = messageBroker;

        // Set up message broker subscriptions
        this.setupMessageHandling();
    }

    async initialize(): Promise<void> {
        try {
            this.logger.info('Initializing Agent Orchestrator...');

            // Subscribe to agent registration messages
            await this.messageBroker.subscribe('agent.register', this.handleAgentRegistration.bind(this));
            await this.messageBroker.subscribe('agent.heartbeat', this.handleAgentHeartbeat.bind(this));
            await this.messageBroker.subscribe('task.update', this.handleTaskUpdate.bind(this));
            await this.messageBroker.subscribe('task.complete', this.handleTaskCompletion.bind(this));

            this.logger.info('Agent Orchestrator initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Agent Orchestrator', error as Error);
            throw new PlatformError('Orchestrator initialization failed', 'INIT_ERROR', 500, { error });
        }
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('Agent Orchestrator is already running');
            return;
        }

        this.logger.info('Starting Agent Orchestrator...');
        this.isRunning = true;

        // Start task processing loop
        this.taskProcessingInterval = setInterval(() => {
            this.processTasks().catch(error => {
                this.logger.error('Error in task processing loop', error as Error);
            });
        }, 5000); // Process tasks every 5 seconds

        // Start health check loop
        this.healthCheckInterval = setInterval(() => {
            this.performHealthChecks().catch(error => {
                this.logger.error('Error in health check loop', error as Error);
            });
        }, 30000); // Health check every 30 seconds

        this.emit('orchestrator:started');
        this.logger.info('Agent Orchestrator started successfully');
    }

    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        this.logger.info('Stopping Agent Orchestrator...');
        this.isRunning = false;

        // Clear intervals
        if (this.taskProcessingInterval) {
            clearInterval(this.taskProcessingInterval);
        }
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        // Stop all agents
        for (const [agentId, registration] of this.agents) {
            try {
                await registration.agent.stop();
                if (registration.heartbeatInterval) {
                    clearInterval(registration.heartbeatInterval);
                }
            } catch (error) {
                this.logger.error(`Failed to stop agent ${agentId}`, error as Error);
            }
        }

        this.agents.clear();
        this.tasks.clear();
        this.taskQueue.length = 0;

        this.emit('orchestrator:stopped');
        this.logger.info('Agent Orchestrator stopped');
    }

    async registerAgent(agent: BaseAgent): Promise<void> {
        try {
            this.logger.info(`Registering agent: ${agent.id} (${agent.type})`);

            const registration: AgentRegistration = {
                agent,
                lastSeen: new Date()
            };

            this.agents.set(agent.id, registration);

            // Set up heartbeat monitoring
            registration.heartbeatInterval = setInterval(() => {
                this.checkAgentHeartbeat(agent.id);
            }, 60000); // Check every minute

            // Notify other services about agent registration
            await this.messageBroker.publish('agent.registered', {
                agentId: agent.id,
                agentType: agent.type,
                capabilities: agent.capabilities,
                timestamp: new Date()
            });

            this.emit('agent:registered', { agentId: agent.id, agentType: agent.type });
            this.logger.info(`Agent registered successfully: ${agent.id}`);
        } catch (error) {
            this.logger.error(`Failed to register agent ${agent.id}`, error as Error);
            throw new PlatformError(
                `Agent registration failed: ${agent.id}`, 
                'AGENT_REGISTRATION_ERROR', 
                500, 
                { agentId: agent.id, error }
            );
        }
    }

    async unregisterAgent(agentId: AgentId): Promise<void> {
        const registration = this.agents.get(agentId);
        if (!registration) {
            this.logger.warn(`Agent not found for unregistration: ${agentId}`);
            return;
        }

        try {
            this.logger.info(`Unregistering agent: ${agentId}`);

            // Stop the agent
            await registration.agent.stop();

            // Clear heartbeat monitoring
            if (registration.heartbeatInterval) {
                clearInterval(registration.heartbeatInterval);
            }

            // Remove from registry
            this.agents.delete(agentId);

            // Reassign any tasks that were assigned to this agent
            await this.reassignAgentTasks(agentId);

            // Notify other services
            await this.messageBroker.publish('agent.unregistered', {
                agentId,
                timestamp: new Date()
            });

            this.emit('agent:unregistered', { agentId });
            this.logger.info(`Agent unregistered successfully: ${agentId}`);
        } catch (error) {
            this.logger.error(`Failed to unregister agent ${agentId}`, error as Error);
            throw new PlatformError(
                `Agent unregistration failed: ${agentId}`, 
                'AGENT_UNREGISTRATION_ERROR', 
                500, 
                { agentId, error }
            );
        }
    }

    async submitTask(task: AgentTask): Promise<void> {
        try {
            this.logger.info(`Submitting task: ${task.id} (${task.type})`);

            // Store task in database
            await this.database.createTask(task);

            // Add to local task registry
            this.tasks.set(task.id, task);

            // Try to assign immediately
            const assigned = await this.assignTask(task);
            
            if (!assigned) {
                // Add to queue for later processing
                this.taskQueue.push(task);
                this.logger.info(`Task queued for later assignment: ${task.id}`);
            }

            this.emit('task:submitted', { taskId: task.id, assigned });
        } catch (error) {
            this.logger.error(`Failed to submit task ${task.id}`, error as Error);
            throw new PlatformError(
                `Task submission failed: ${task.id}`, 
                'TASK_SUBMISSION_ERROR', 
                500, 
                { taskId: task.id, error }
            );
        }
    }

    async assignTask(task: AgentTask): Promise<boolean> {
        try {
            // Find suitable agents
            const suitableAgents = this.findSuitableAgents(task);
            
            if (suitableAgents.length === 0) {
                this.logger.info(`No suitable agents found for task: ${task.id}`);
                return false;
            }

            // Select the best agent (simple round-robin for now)
            const selectedAgent = this.selectBestAgent(suitableAgents, task);
            
            if (!selectedAgent) {
                return false;
            }

            // Assign task to agent
            task.assignedTo = selectedAgent.id;
            task.status = 'IN_PROGRESS';
            task.startedAt = new Date();

            // Update database
            await this.database.updateTask(task);

            // Send task to agent
            const message: AgentMessage = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'TASK_ASSIGNMENT',
                sender: 'orchestrator',
                recipient: selectedAgent.id,
                timestamp: new Date(),
                payload: { task },
                priority: this.getMessagePriority(task.priority),
                requiresResponse: true
            };

            await this.messageBroker.publish(`agent.${selectedAgent.id}.tasks`, message);

            this.logger.info(`Task assigned: ${task.id} -> ${selectedAgent.id}`);
            this.emit('task:assigned', { taskId: task.id, agentId: selectedAgent.id });

            return true;
        } catch (error) {
            this.logger.error(`Failed to assign task ${task.id}`, error as Error);
            return false;
        }
    }

    getAgent(agentId: AgentId): BaseAgent | undefined {
        const registration = this.agents.get(agentId);
        return registration?.agent;
    }

    getAllAgents(): BaseAgent[] {
        return Array.from(this.agents.values()).map(reg => reg.agent);
    }

    getAgentsByType(type: AgentType): BaseAgent[] {
        return Array.from(this.agents.values())
            .map(reg => reg.agent)
            .filter(agent => agent.type === type);
    }

    async getAllAgentMetrics(): Promise<Map<AgentId, AgentMetrics>> {
        const metrics = new Map<AgentId, AgentMetrics>();
        
        for (const [agentId, registration] of this.agents) {
            try {
                const agentMetrics = registration.agent.getMetrics();
                metrics.set(agentId, agentMetrics);
            } catch (error) {
                this.logger.error(`Failed to get metrics for agent ${agentId}`, error as Error);
            }
        }

        return metrics;
    }

    async getSystemMetrics(): Promise<SystemMetrics> {
        const totalAgents = this.agents.size;
        const activeAgents = Array.from(this.agents.values())
            .filter(reg => reg.agent.status === 'READY').length;
        const busyAgents = Array.from(this.agents.values())
            .filter(reg => reg.agent.status === 'BUSY').length;

        const allTasks = Array.from(this.tasks.values());
        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter(t => t.status === 'COMPLETED').length;
        const failedTasks = allTasks.filter(t => t.status === 'CANCELLED').length;

        const memoryUsage = process.memoryUsage();

        return {
            totalAgents,
            activeAgents,
            busyAgents,
            totalTasks,
            completedTasks,
            failedTasks,
            averageResponseTime: 250, // TODO: Calculate from actual metrics
            systemLoad: 0.5, // TODO: Get actual system load
            memory: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                free: Math.round((memoryUsage.heapTotal - memoryUsage.heapUsed) / 1024 / 1024),
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024)
            }
        };
    }

    async getHealthStatus(): Promise<HealthStatus> {
        const issues: any[] = [];

        // Check agent health
        for (const [agentId, registration] of this.agents) {
            try {
                const health = registration.agent.getHealthStatus();
                if (health.status !== 'HEALTHY') {
                    issues.push({
                        severity: 'MEDIUM',
                        message: `Agent ${agentId} is ${health.status}`,
                        code: 'AGENT_UNHEALTHY',
                        timestamp: new Date()
                    });
                }
            } catch (error) {
                issues.push({
                    severity: 'HIGH',
                    message: `Failed to get health status for agent ${agentId}`,
                    code: 'AGENT_HEALTH_CHECK_FAILED',
                    timestamp: new Date()
                });
            }
        }

        const memoryUsage = process.memoryUsage();
        const status = issues.length === 0 ? 'HEALTHY' : 
                      issues.some(i => i.severity === 'HIGH') ? 'UNHEALTHY' : 'DEGRADED';

        return {
            status,
            lastCheck: new Date(),
            uptime: process.uptime(),
            issues,
            systemInfo: {
                memoryUsage: memoryUsage.heapUsed / 1024 / 1024,
                cpuUsage: 0, // TODO: Get actual CPU usage
                activeConnections: this.agents.size
            }
        };
    }

    // Public subscription method for external consumers
    subscribe(pattern: string, callback: (event: any) => void): () => void {
        // For '*' pattern, listen to all events
        if (pattern === '*') {
            const eventTypes = [
                'orchestrator:started',
                'orchestrator:stopped', 
                'orchestrator:error',
                'orchestrator:recovered',
                'agent:registered',
                'agent:unregistered',
                'agent:unhealthy',
                'agent:offline',
                'agent:available',
                'task:submitted',
                'task:assigned',
                'task:updated',
                'task:completed'
            ];

            eventTypes.forEach(eventType => {
                this.on(eventType, callback);
            });

            // Return unsubscribe function
            return () => {
                eventTypes.forEach(eventType => {
                    this.off(eventType, callback);
                });
            };
        } else {
            // For specific patterns, use standard EventEmitter
            this.on(pattern, callback);
            return () => this.off(pattern, callback);
        }
    }

    // Private helper methods

    private setupMessageHandling(): void {
        // Set up message broker event handlers
        this.messageBroker.on('connection:lost', () => {
            this.logger.error('Message broker connection lost');
            this.emit('orchestrator:error', { type: 'MESSAGE_BROKER_DISCONNECTED' });
        });

        this.messageBroker.on('connection:restored', () => {
            this.logger.info('Message broker connection restored');
            this.emit('orchestrator:recovered', { type: 'MESSAGE_BROKER_RECONNECTED' });
        });
    }

    private async handleAgentRegistration(message: any): Promise<void> {
        try {
            const { agentId, agentType, capabilities } = message;
            this.logger.info(`Received agent registration: ${agentId} (${agentType})`);
            
            // Update agent last seen time
            const registration = this.agents.get(agentId);
            if (registration) {
                registration.lastSeen = new Date();
            }
        } catch (error) {
            this.logger.error('Error handling agent registration', error as Error);
        }
    }

    private async handleAgentHeartbeat(message: any): Promise<void> {
        try {
            const { agentId, status, timestamp } = message;
            const registration = this.agents.get(agentId);
            
            if (registration) {
                registration.lastSeen = new Date(timestamp);
                this.logger.debug(`Heartbeat received from agent: ${agentId}`);
            }
        } catch (error) {
            this.logger.error('Error handling agent heartbeat', error as Error);
        }
    }

    private async handleTaskUpdate(message: any): Promise<void> {
        try {
            const { taskId, status, progress } = message;
            const task = this.tasks.get(taskId);
            
            if (task) {
                task.status = status;
                task.updatedAt = new Date();
                
                await this.database.updateTask(task);
                this.emit('task:updated', { taskId, status, progress });
            }
        } catch (error) {
            this.logger.error('Error handling task update', error as Error);
        }
    }

    private async handleTaskCompletion(message: any): Promise<void> {
        try {
            const { taskId, result } = message;
            const task = this.tasks.get(taskId);
            
            if (task) {
                task.status = result.status === 'SUCCESS' ? 'COMPLETED' : 'CANCELLED';
                task.completedAt = new Date();
                task.actualHours = result.duration / (1000 * 60 * 60); // Convert ms to hours
                
                await this.database.updateTask(task);
                this.emit('task:completed', { taskId, result });
                
                // Free up the agent for new tasks
                if (task.assignedTo) {
                    const agent = this.getAgent(task.assignedTo);
                    if (agent && agent.status === 'BUSY') {
                        // Agent should update its own status, but we can emit an event
                        this.emit('agent:available', { agentId: task.assignedTo });
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error handling task completion', error as Error);
        }
    }

    private async processTasks(): Promise<void> {
        if (this.taskQueue.length === 0) {
            return;
        }

        const tasksToAssign = [...this.taskQueue];
        this.taskQueue.length = 0;

        for (const task of tasksToAssign) {
            const assigned = await this.assignTask(task);
            if (!assigned) {
                // Put back in queue
                this.taskQueue.push(task);
            }
        }
    }

    private async performHealthChecks(): Promise<void> {
        for (const [agentId, registration] of this.agents) {
            try {
                const timeSinceLastSeen = Date.now() - registration.lastSeen.getTime();
                
                // If agent hasn't been seen in 2 minutes, mark as potentially offline
                if (timeSinceLastSeen > 120000) {
                    this.logger.warn(`Agent ${agentId} hasn't been seen for ${timeSinceLastSeen}ms`);
                    
                    // Try to ping the agent
                    const health = registration.agent.getHealthStatus();
                    if (health.status === 'UNHEALTHY') {
                        this.emit('agent:unhealthy', { agentId, timeSinceLastSeen });
                    }
                }
            } catch (error) {
                this.logger.error(`Health check failed for agent ${agentId}`, error as Error);
            }
        }
    }

    private checkAgentHeartbeat(agentId: AgentId): void {
        const registration = this.agents.get(agentId);
        if (!registration) {
            return;
        }

        const timeSinceLastSeen = Date.now() - registration.lastSeen.getTime();
        
        // If no heartbeat for 5 minutes, consider agent offline
        if (timeSinceLastSeen > 300000) {
            this.logger.warn(`Agent ${agentId} appears offline (no heartbeat for ${timeSinceLastSeen}ms)`);
            this.emit('agent:offline', { agentId, timeSinceLastSeen });
        }
    }

    private findSuitableAgents(task: AgentTask): BaseAgent[] {
        return Array.from(this.agents.values())
            .map(reg => reg.agent)
            .filter(agent => 
                agent.status === 'READY' && 
                agent.canHandleTask && 
                agent.canHandleTask(task)
            );
    }

    private selectBestAgent(agents: BaseAgent[], task: AgentTask): BaseAgent | null {
        if (agents.length === 0) {
            return null;
        }

        // Simple selection strategy: prefer agents with fewer current tasks
        return agents.reduce((best, current) => {
            const currentMetrics = current.getMetrics();
            const bestMetrics = best.getMetrics();
            
            return currentMetrics.productivity.tasksInProgress < bestMetrics.productivity.tasksInProgress
                ? current : best;
        });
    }

    private async reassignAgentTasks(agentId: AgentId): Promise<void> {
        const agentTasks = Array.from(this.tasks.values())
            .filter(task => task.assignedTo === agentId && task.status === 'IN_PROGRESS');

        for (const task of agentTasks) {
            task.assignedTo = undefined;
            task.status = 'NOT_STARTED';
            task.startedAt = undefined;
            
            await this.database.updateTask(task);
            this.taskQueue.push(task);
            
            this.logger.info(`Task reassigned to queue: ${task.id}`);
        }
    }

    private getMessagePriority(taskPriority: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
        switch (taskPriority) {
            case 'CRITICAL': return 'CRITICAL';
            case 'HIGH': return 'HIGH';
            case 'MEDIUM': return 'MEDIUM';
            case 'LOW': return 'LOW';
            default: return 'MEDIUM';
        }
    }
}
