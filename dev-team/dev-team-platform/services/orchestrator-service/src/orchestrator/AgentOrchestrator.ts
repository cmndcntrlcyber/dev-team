import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
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
    PlatformError,
    TaskBlueprint,
    TaskBlueprintSubtask,
    ArchitectureAgentOutput,
    TaskPriority,
    TaskType
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

            // Load agents from database
            await this.loadAgentsFromDB();

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

    /**
     * Load enabled agents from database on startup
     * Creates proxy agent objects for database-configured agents
     */
    async loadAgentsFromDB(): Promise<void> {
        try {
            this.logger.info('Loading agents from database...');

            const result = await this.database.query(
                `SELECT * FROM agents WHERE enabled = true ORDER BY priority DESC`
            );

            for (const row of result.rows) {
                // Create a proxy agent representation for database-configured agents
                // Real agents will register via NATS and update their status
                const proxyAgent: BaseAgent = {
                    id: row.id,
                    type: row.type,
                    name: row.name || row.id,
                    status: row.status || 'OFFLINE',
                    capabilities: row.capabilities || {},
                    getConfiguration: () => row.configuration || {},
                    canHandleTask: (task: AgentTask) => {
                        // Check if agent type matches task requirements
                        const caps = row.capabilities || {};
                        return caps.taskTypes?.includes(task.type) || false;
                    },
                    executeTask: async () => {
                        throw new PlatformError('Agent not connected', 'AGENT_OFFLINE', 503);
                    },
                    getTaskProgress: () => null,
                    sendMessage: async () => { /* Proxy agent - no-op */ },
                    receiveMessage: async () => ({
                        messageId: '',
                        success: false,
                        error: 'Agent not connected',
                        timestamp: new Date(),
                        processingTime: 0
                    }),
                    subscribeToTopic: () => { /* Proxy agent - no-op */ },
                    initialize: async () => { /* Proxy agent - no-op */ },
                    start: async () => { /* Proxy agent - no-op */ },
                    stop: async () => { /* Proxy agent - no-op */ },
                    restart: async () => { /* Proxy agent - no-op */ },
                    getMetrics: () => ({
                        productivity: {
                            tasksCompleted: row.metrics?.tasks_completed || 0,
                            tasksInProgress: row.metrics?.tasks_in_progress || 0,
                            averageCompletionTime: row.metrics?.avg_completion_time || 0,
                            velocityTrend: [],
                            estimationAccuracy: row.metrics?.estimation_accuracy || 0,
                            throughput: row.metrics?.throughput || 0
                        },
                        quality: {
                            codeQualityScore: 0,
                            testCoverageAchieved: 0,
                            defectRate: 0,
                            reworkPercentage: 0,
                            reviewScore: 0,
                            complianceScore: 0
                        },
                        reliability: {
                            uptime: row.metrics?.uptime || 0,
                            errorRate: row.metrics?.error_rate || 0,
                            responseTime: row.metrics?.response_time || 0,
                            successRate: row.metrics?.success_rate || 0,
                            mtbf: 0,
                            mttr: 0
                        },
                        coordination: {
                            communicationEfficiency: 0,
                            conflictResolutionTime: 0,
                            dependencyResolutionRate: 0,
                            collaborationScore: 0,
                            knowledgeSharingRate: 0
                        },
                        performance: {
                            averageResponseTime: row.metrics?.response_time || 0,
                            peakResponseTime: 0,
                            requestsPerSecond: 0,
                            concurrentTasks: row.metrics?.tasks_in_progress || 0,
                            resourceUtilization: 0
                        }
                    }),
                    getHealthStatus: () => ({
                        status: row.status === 'READY' ? 'HEALTHY' : 'DEGRADED',
                        lastCheck: new Date(),
                        uptime: 0,
                        issues: row.status !== 'READY' ? [{
                            severity: 'LOW',
                            message: `Agent status: ${row.status}`,
                            code: 'AGENT_STATUS',
                            timestamp: new Date()
                        }] : [],
                        systemInfo: { memoryUsage: 0, cpuUsage: 0, activeConnections: 0 }
                    })
                };

                // Store in memory registry
                this.agents.set(row.id, {
                    agent: proxyAgent,
                    lastSeen: row.last_heartbeat || row.updated_at || new Date()
                });

                this.logger.debug(`Loaded agent from database: ${row.id} (${row.type})`);
            }

            this.logger.info(`Loaded ${result.rows.length} agents from database`);
        } catch (error) {
            this.logger.error('Failed to load agents from database', error as Error);
            // Non-fatal - orchestrator can still work with dynamically registered agents
        }
    }

    /**
     * Persist agent configuration to database
     */
    async persistAgent(agent: BaseAgent): Promise<void> {
        try {
            const config = agent.getConfiguration ? agent.getConfiguration() : {};

            await this.database.query(
                `INSERT INTO agents (id, type, name, status, capabilities, configuration, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())
                 ON CONFLICT (id) DO UPDATE SET
                    type = $2,
                    name = $3,
                    status = $4,
                    capabilities = $5,
                    configuration = $6,
                    updated_at = NOW()`,
                [
                    agent.id,
                    agent.type,
                    agent.name || agent.id,
                    agent.status,
                    JSON.stringify(agent.capabilities || {}),
                    JSON.stringify(config)
                ]
            );

            this.logger.debug(`Agent persisted to database: ${agent.id}`);
        } catch (error) {
            this.logger.error(`Failed to persist agent ${agent.id}`, error as Error);
            throw error;
        }
    }

    /**
     * Reconcile agent status between database and in-memory registry
     * Called on heartbeat to ensure consistency
     */
    async reconcileAgentStatus(agentId: AgentId, status: AgentStatus, metrics?: any): Promise<void> {
        try {
            // Update database status
            await this.database.query(
                `UPDATE agents SET
                    status = $2,
                    last_heartbeat = NOW(),
                    metrics = COALESCE($3, metrics),
                    updated_at = NOW()
                 WHERE id = $1`,
                [agentId, status, metrics ? JSON.stringify(metrics) : null]
            );

            // Update in-memory registry
            const registration = this.agents.get(agentId);
            if (registration) {
                registration.agent.status = status;
                registration.lastSeen = new Date();
            }

            this.logger.debug(`Agent status reconciled: ${agentId} -> ${status}`);
        } catch (error) {
            this.logger.error(`Failed to reconcile agent status ${agentId}`, error as Error);
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

            // Persist agent to database
            await this.persistAgent(agent);

            // Log the registration action
            try {
                await this.database.query(
                    `SELECT log_agent_action($1, 'REGISTERED', $2, $3)`,
                    [agent.id, null, JSON.stringify({ type: agent.type })]
                );
            } catch (logErr) {
                // Non-fatal - log function may not exist yet
                this.logger.debug('Agent audit log not available');
            }

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

            // Update database status to OFFLINE
            await this.database.query(
                `UPDATE agents SET status = 'OFFLINE', updated_at = NOW() WHERE id = $1`,
                [agentId]
            );

            // Log the unregistration
            try {
                await this.database.query(
                    `SELECT log_agent_action($1, 'UNREGISTERED', $2, $3)`,
                    [agentId, null, '{}']
                );
            } catch (logErr) {
                this.logger.debug('Agent audit log not available');
            }

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
            const { agentId, status, timestamp, metrics } = message;
            const registration = this.agents.get(agentId);

            if (registration) {
                registration.lastSeen = new Date(timestamp);
                this.logger.debug(`Heartbeat received from agent: ${agentId}`);

                // Reconcile status with database
                await this.reconcileAgentStatus(agentId, status, metrics);
            } else {
                // Agent not in memory - may be a new agent registering
                // Update database status anyway
                await this.database.query(
                    `UPDATE agents SET status = $2, last_heartbeat = NOW(), updated_at = NOW() WHERE id = $1`,
                    [agentId, status]
                );
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

                // Check if result contains a TaskBlueprint (from Architecture Agent)
                await this.processArchitectureOutput(task, result);

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

    // ============================================
    // Architecture Agent Integration
    // ============================================

    /**
     * Process output from Architecture Agent
     * Handles task decomposition (TaskBlueprint) and other structured outputs
     */
    private async processArchitectureOutput(task: AgentTask, result: TaskResult): Promise<void> {
        try {
            const output = result.output as ArchitectureAgentOutput | null;

            if (!output || typeof output !== 'object') {
                return;
            }

            // Check if it's a TaskBlueprint for task decomposition
            if (output.type === 'BLUEPRINT') {
                await this.handleTaskBlueprint(task, output.data as TaskBlueprint);
            }
        } catch (error) {
            this.logger.error(`Error processing architecture output for task ${task.id}`, error as Error);
        }
    }

    /**
     * Handle a TaskBlueprint from Architecture Agent
     * Creates subtasks and sets up dependencies
     */
    private async handleTaskBlueprint(parentTask: AgentTask, blueprint: TaskBlueprint): Promise<void> {
        this.logger.info(`Processing task blueprint for: ${parentTask.id}`);

        const subtaskIds: Map<string, string> = new Map(); // Map subtask title to ID
        const createdTasks: AgentTask[] = [];

        // First pass: Create all subtasks with IDs
        for (const subtask of blueprint.subtasks) {
            const taskId = `subtask_${uuidv4().slice(0, 8)}`;
            subtaskIds.set(subtask.title, taskId);

            const newTask: AgentTask = {
                id: taskId,
                title: subtask.title,
                description: subtask.description,
                type: subtask.type as TaskType,
                priority: subtask.priority as TaskPriority,
                status: 'NOT_STARTED' as TaskStatus,
                projectId: parentTask.projectId,
                createdAt: new Date(),
                updatedAt: new Date(),
                estimatedHours: subtask.estimatedHours,
                dependencies: [], // Will be filled in second pass
                blockers: [],
                tags: [...(parentTask.tags || []), 'subtask', `parent:${parentTask.id}`],
                metadata: {
                    parentTaskId: parentTask.id,
                    assignedAgentType: subtask.assignedAgentType,
                    acceptanceCriteria: subtask.acceptanceCriteria,
                    technicalNotes: subtask.technicalNotes,
                    blueprintId: blueprint.id,
                    ...subtask.metadata,
                },
            };

            createdTasks.push(newTask);
        }

        // Second pass: Resolve dependencies (title references to task IDs)
        for (let i = 0; i < createdTasks.length; i++) {
            const subtaskDef = blueprint.subtasks[i];
            const task = createdTasks[i];

            task.dependencies = subtaskDef.dependencies
                .map(depTitle => subtaskIds.get(depTitle))
                .filter((id): id is string => id !== undefined);
        }

        // Store all subtasks in database and submit them
        for (const task of createdTasks) {
            await this.database.createTask(task);
            this.tasks.set(task.id, task);

            this.logger.info(`Created subtask: ${task.id} (${task.title}) for agent type: ${task.metadata.assignedAgentType}`);
        }

        // Submit tasks that have no dependencies (ready to start)
        const readyTasks = createdTasks.filter(t => t.dependencies.length === 0);
        for (const task of readyTasks) {
            await this.submitTaskToQueue(task);
        }

        // Update parent task to track subtasks
        parentTask.metadata = {
            ...parentTask.metadata,
            subtaskIds: createdTasks.map(t => t.id),
            blueprintId: blueprint.id,
            sequencingStrategy: blueprint.sequencingStrategy,
            criticalPath: blueprint.criticalPath,
        };
        await this.database.updateTask(parentTask);

        this.emit('task:decomposed', {
            parentTaskId: parentTask.id,
            subtaskCount: createdTasks.length,
            readyTaskCount: readyTasks.length,
            blueprintId: blueprint.id,
        });

        this.logger.info(`Task blueprint processed: ${createdTasks.length} subtasks created, ${readyTasks.length} ready to start`);
    }

    /**
     * Submit a task to the queue (internal helper for subtasks)
     */
    private async submitTaskToQueue(task: AgentTask): Promise<void> {
        const assigned = await this.assignTask(task);
        if (!assigned) {
            this.taskQueue.push(task);
            this.logger.info(`Subtask queued for later assignment: ${task.id}`);
        }
    }

    /**
     * Check if a task should be routed to Architecture Agent for review
     * Called before assigning tasks that may need architectural oversight
     */
    private async preTaskHook(task: AgentTask): Promise<boolean> {
        // Tasks that might need architecture review
        const reviewableTypes: TaskType[] = ['FOUNDATION', 'REFACTORING', 'INTEGRATION'];

        if (!reviewableTypes.includes(task.type as TaskType)) {
            return true; // No review needed
        }

        // Check if task already has architecture approval
        if (task.metadata?.architectureApproved) {
            return true;
        }

        // Check if this is a subtask from Architecture Agent (already approved)
        if (task.metadata?.parentTaskId && task.metadata?.assignedAgentType) {
            return true;
        }

        // For large tasks, request architecture review
        if (task.estimatedHours > 8 && !task.metadata?.skipArchitectureReview) {
            this.logger.info(`Task ${task.id} requires architecture review`);

            // Create an architecture review task
            const reviewTask: AgentTask = {
                id: `review_${task.id}`,
                title: `Architecture Review: ${task.title}`,
                description: `Review the architectural approach for: ${task.description}`,
                type: 'CODE_REVIEW' as TaskType,
                priority: task.priority,
                status: 'NOT_STARTED' as TaskStatus,
                projectId: task.projectId,
                createdAt: new Date(),
                updatedAt: new Date(),
                estimatedHours: 1,
                dependencies: [],
                blockers: [],
                tags: ['architecture-review', `original:${task.id}`],
                metadata: {
                    originalTaskId: task.id,
                    reviewType: 'PRE_IMPLEMENTATION',
                },
            };

            // Submit review task to Architecture Agent
            await this.submitTask(reviewTask);

            // Block original task until review is complete
            task.blockers = [...(task.blockers || []), reviewTask.id];
            task.status = 'BLOCKED' as TaskStatus;
            await this.database.updateTask(task);

            return false; // Don't proceed with assignment yet
        }

        return true;
    }

    /**
     * Check and unblock tasks whose dependencies are complete
     */
    private async checkDependenciesAndUnblock(): Promise<void> {
        for (const [taskId, task] of this.tasks) {
            if (task.status !== 'NOT_STARTED' && task.status !== 'BLOCKED') {
                continue;
            }

            // Check if all dependencies are complete
            const allDepsComplete = task.dependencies.every(depId => {
                const depTask = this.tasks.get(depId);
                return depTask?.status === 'COMPLETED';
            });

            // Check if all blockers are resolved
            const allBlockersResolved = (task.blockers || []).every(blockerId => {
                const blockerTask = this.tasks.get(blockerId);
                return blockerTask?.status === 'COMPLETED';
            });

            if (allDepsComplete && allBlockersResolved && task.status === 'BLOCKED') {
                task.status = 'NOT_STARTED' as TaskStatus;
                task.updatedAt = new Date();
                await this.database.updateTask(task);

                // Submit to queue
                this.taskQueue.push(task);
                this.logger.info(`Task ${taskId} unblocked and queued for assignment`);
            }
        }
    }

    private async processTasks(): Promise<void> {
        // First, check if any blocked tasks can be unblocked
        await this.checkDependenciesAndUnblock();

        if (this.taskQueue.length === 0) {
            return;
        }

        const tasksToAssign = [...this.taskQueue];
        this.taskQueue.length = 0;

        for (const task of tasksToAssign) {
            // Run pre-task hook (architecture review check)
            const canProceed = await this.preTaskHook(task);

            if (!canProceed) {
                // Task was blocked for review, don't add back to queue
                continue;
            }

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
