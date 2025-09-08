import { FastifyInstance } from 'fastify';
import { 
    AgentOrchestrator, 
    SystemMetrics 
} from '../orchestrator/AgentOrchestrator';
import { DatabaseManager } from '../database/DatabaseManager';
import { MessageBroker } from '../messaging/MessageBroker';
import { 
    Logger, 
    AgentTask, 
    Project, 
    ApiResponse, 
    ValidationError, 
    NotFoundError,
    PlatformError
} from '../shared';

// Route schemas for validation
const taskCreateSchema = {
    body: {
        type: 'object',
        required: ['title', 'description', 'type', 'priority'],
        properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string', minLength: 1 },
            type: { 
                type: 'string', 
                enum: [
                    'FOUNDATION', 'AGENT_DEVELOPMENT', 'INTEGRATION', 
                    'UI_DEVELOPMENT', 'TESTING', 'DOCUMENTATION', 
                    'DEPLOYMENT', 'CODE_GENERATION', 'CODE_REVIEW', 
                    'BUG_FIX', 'REFACTORING'
                ] 
            },
            priority: { 
                type: 'string', 
                enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] 
            },
            projectId: { type: 'string' },
            dueDate: { type: 'string', format: 'date-time' },
            estimatedHours: { type: 'number', minimum: 0 },
            tags: { 
                type: 'array', 
                items: { type: 'string' } 
            },
            metadata: { type: 'object' }
        }
    }
};

const taskUpdateSchema = {
    body: {
        type: 'object',
        properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string', minLength: 1 },
            status: { 
                type: 'string', 
                enum: [
                    'NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 
                    'REVIEW', 'TESTING', 'COMPLETED', 
                    'DEFERRED', 'CANCELLED'
                ] 
            },
            priority: { 
                type: 'string', 
                enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] 
            },
            assignedTo: { type: 'string' },
            dueDate: { type: 'string', format: 'date-time' },
            estimatedHours: { type: 'number', minimum: 0 },
            actualHours: { type: 'number', minimum: 0 },
            tags: { 
                type: 'array', 
                items: { type: 'string' } 
            },
            metadata: { type: 'object' }
        }
    }
};

export async function registerRoutes(
    fastify: FastifyInstance,
    orchestrator: AgentOrchestrator,
    database: DatabaseManager,
    messageBroker: MessageBroker,
    logger: Logger
): Promise<void> {
    
    // Agent Management Routes
    fastify.get('/api/agents', async (request, reply) => {
        try {
            const agents = orchestrator.getAllAgents();
            const agentData = agents.map(agent => ({
                id: agent.id,
                type: agent.type,
                status: agent.status,
                capabilities: agent.capabilities
            }));

            const response: ApiResponse = {
                success: true,
                data: agentData,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            logger.error('Failed to get agents', error as Error);
            throw new PlatformError('Failed to retrieve agents', 'AGENTS_GET_ERROR', 500);
        }
    });

    fastify.get('/api/agents/:agentId', async (request, reply) => {
        const { agentId } = request.params as { agentId: string };
        
        try {
            const agent = orchestrator.getAgent(agentId);
            if (!agent) {
                throw new NotFoundError(`Agent not found: ${agentId}`);
            }

            const response: ApiResponse = {
                success: true,
                data: {
                    id: agent.id,
                    type: agent.type,
                    status: agent.status,
                    capabilities: agent.capabilities,
                    metrics: agent.getMetrics(),
                    health: agent.getHealthStatus()
                },
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error(`Failed to get agent ${agentId}`, error as Error);
            throw new PlatformError(`Failed to retrieve agent: ${agentId}`, 'AGENT_GET_ERROR', 500);
        }
    });

    fastify.get('/api/agents/:agentId/metrics', async (request, reply) => {
        const { agentId } = request.params as { agentId: string };
        
        try {
            const agent = orchestrator.getAgent(agentId);
            if (!agent) {
                throw new NotFoundError(`Agent not found: ${agentId}`);
            }

            const metrics = agent.getMetrics();
            const response: ApiResponse = {
                success: true,
                data: metrics,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error(`Failed to get agent metrics ${agentId}`, error as Error);
            throw new PlatformError(`Failed to retrieve agent metrics: ${agentId}`, 'AGENT_METRICS_ERROR', 500);
        }
    });

    // Task Management Routes
    fastify.post('/api/tasks', { schema: taskCreateSchema }, async (request, reply) => {
        const taskData = request.body as any;
        
        try {
            const task: AgentTask = {
                id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: taskData.title,
                description: taskData.description,
                type: taskData.type,
                priority: taskData.priority,
                status: 'NOT_STARTED',
                projectId: taskData.projectId,
                createdAt: new Date(),
                updatedAt: new Date(),
                dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
                dependencies: [],
                blockers: [],
                estimatedHours: taskData.estimatedHours || 1,
                tags: taskData.tags || [],
                metadata: taskData.metadata || {}
            };

            await orchestrator.submitTask(task);

            const response: ApiResponse = {
                success: true,
                data: task,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.code(201).send(response);
        } catch (error) {
            logger.error('Failed to create task', error as Error);
            throw new PlatformError('Failed to create task', 'TASK_CREATE_ERROR', 500);
        }
    });

    fastify.get('/api/tasks', async (request, reply) => {
        const query = request.query as {
            status?: string;
            assignedTo?: string;
            projectId?: string;
            type?: string;
            page?: string;
            limit?: string;
        };

        try {
            const page = parseInt(query.page || '1');
            const limit = parseInt(query.limit || '20');
            const offset = (page - 1) * limit;

            const tasks = await database.getTasks({
                status: query.status,
                assignedTo: query.assignedTo,
                projectId: query.projectId,
                type: query.type,
                limit,
                offset
            });

            const response: ApiResponse = {
                success: true,
                data: tasks,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0',
                    pagination: {
                        page,
                        limit,
                        total: tasks.length, // This would need to be calculated properly
                        totalPages: Math.ceil(tasks.length / limit),
                        hasNext: tasks.length === limit,
                        hasPrev: page > 1
                    }
                }
            };

            reply.send(response);
        } catch (error) {
            logger.error('Failed to get tasks', error as Error);
            throw new PlatformError('Failed to retrieve tasks', 'TASKS_GET_ERROR', 500);
        }
    });

    fastify.get('/api/tasks/:taskId', async (request, reply) => {
        const { taskId } = request.params as { taskId: string };
        
        try {
            const task = await database.getTask(taskId);
            if (!task) {
                throw new NotFoundError(`Task not found: ${taskId}`);
            }

            const response: ApiResponse = {
                success: true,
                data: task,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error(`Failed to get task ${taskId}`, error as Error);
            throw new PlatformError(`Failed to retrieve task: ${taskId}`, 'TASK_GET_ERROR', 500);
        }
    });

    fastify.put('/api/tasks/:taskId', { schema: taskUpdateSchema }, async (request, reply) => {
        const { taskId } = request.params as { taskId: string };
        const updates = request.body as any;
        
        try {
            const existingTask = await database.getTask(taskId);
            if (!existingTask) {
                throw new NotFoundError(`Task not found: ${taskId}`);
            }

            const updatedTask: AgentTask = {
                ...existingTask,
                ...updates,
                id: taskId, // Ensure ID doesn't change
                updatedAt: new Date(),
                dueDate: updates.dueDate ? new Date(updates.dueDate) : existingTask.dueDate
            };

            await database.updateTask(updatedTask);

            const response: ApiResponse = {
                success: true,
                data: updatedTask,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error(`Failed to update task ${taskId}`, error as Error);
            throw new PlatformError(`Failed to update task: ${taskId}`, 'TASK_UPDATE_ERROR', 500);
        }
    });

    fastify.delete('/api/tasks/:taskId', async (request, reply) => {
        const { taskId } = request.params as { taskId: string };
        
        try {
            await database.deleteTask(taskId);

            const response: ApiResponse = {
                success: true,
                data: { message: `Task ${taskId} deleted successfully` },
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error(`Failed to delete task ${taskId}`, error as Error);
            throw new PlatformError(`Failed to delete task: ${taskId}`, 'TASK_DELETE_ERROR', 500);
        }
    });

    // Task Assignment Route
    fastify.post('/api/tasks/:taskId/assign', async (request, reply) => {
        const { taskId } = request.params as { taskId: string };
        const { agentId } = request.body as { agentId?: string };
        
        try {
            const task = await database.getTask(taskId);
            if (!task) {
                throw new NotFoundError(`Task not found: ${taskId}`);
            }

            if (agentId) {
                const agent = orchestrator.getAgent(agentId);
                if (!agent) {
                    throw new NotFoundError(`Agent not found: ${agentId}`);
                }
                
                if (!agent.canHandleTask(task)) {
                    throw new ValidationError('Agent cannot handle this task type');
                }

                task.assignedTo = agentId;
            }

            const assigned = await orchestrator.assignTask(task);
            
            if (!assigned && !agentId) {
                throw new PlatformError('No suitable agents available for this task', 'NO_AGENTS_AVAILABLE', 409);
            }

            const response: ApiResponse = {
                success: true,
                data: { 
                    taskId, 
                    assignedTo: task.assignedTo,
                    assigned 
                },
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof PlatformError) {
                throw error;
            }
            logger.error(`Failed to assign task ${taskId}`, error as Error);
            throw new PlatformError(`Failed to assign task: ${taskId}`, 'TASK_ASSIGN_ERROR', 500);
        }
    });

    // System Metrics Route
    fastify.get('/api/system/metrics', async (request, reply) => {
        try {
            const systemMetrics = await orchestrator.getSystemMetrics();
            const agentMetrics = await orchestrator.getAllAgentMetrics();
            
            const response: ApiResponse = {
                success: true,
                data: {
                    system: systemMetrics,
                    agents: Object.fromEntries(agentMetrics)
                },
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            logger.error('Failed to get system metrics', error as Error);
            throw new PlatformError('Failed to retrieve system metrics', 'METRICS_ERROR', 500);
        }
    });

    // System Status Route
    fastify.get('/api/system/status', async (request, reply) => {
        try {
            const orchestratorHealth = await orchestrator.getHealthStatus();
            const databaseHealth = await database.healthCheck();
            const messageBrokerHealth = await messageBroker.healthCheck();

            const overallStatus = [orchestratorHealth, databaseHealth, messageBrokerHealth]
                .every(h => h.status === 'HEALTHY') ? 'HEALTHY' : 
                [orchestratorHealth, databaseHealth, messageBrokerHealth]
                .some(h => h.status === 'UNHEALTHY') ? 'UNHEALTHY' : 'DEGRADED';

            const response: ApiResponse = {
                success: true,
                data: {
                    status: overallStatus,
                    services: {
                        orchestrator: orchestratorHealth,
                        database: databaseHealth,
                        messageBroker: messageBrokerHealth
                    }
                },
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            logger.error('Failed to get system status', error as Error);
            throw new PlatformError('Failed to retrieve system status', 'STATUS_ERROR', 500);
        }
    });

    // Message Broker Operations
    fastify.post('/api/messages/broadcast', async (request, reply) => {
        const { subject, message } = request.body as { subject: string; message: any };
        
        try {
            if (!subject) {
                throw new ValidationError('Subject is required');
            }

            await messageBroker.publish(subject, message);

            const response: ApiResponse = {
                success: true,
                data: { message: 'Message broadcasted successfully', subject },
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            logger.error('Failed to broadcast message', error as Error);
            throw new PlatformError('Failed to broadcast message', 'MESSAGE_BROADCAST_ERROR', 500);
        }
    });

    // Debug Routes (development only)
    if (process.env.NODE_ENV === 'development') {
        fastify.get('/api/debug/agents', async (request, reply) => {
            try {
                const agents = orchestrator.getAllAgents();
                const debugData = agents.map(agent => ({
                    id: agent.id,
                    type: agent.type,
                    status: agent.status,
                    capabilities: agent.capabilities,
                    metrics: agent.getMetrics(),
                    health: agent.getHealthStatus(),
                    config: agent.getConfiguration()
                }));

                reply.send({ success: true, data: debugData });
            } catch (error) {
                logger.error('Debug agents route error', error as Error);
                reply.code(500).send({ success: false, error: 'Debug error' });
            }
        });

        fastify.get('/api/debug/message-broker', async (request, reply) => {
            try {
                const brokerInfo = messageBroker.getConnectionInfo();
                const subscriptions = messageBroker.getActiveSubscriptions();
                
                reply.send({
                    success: true,
                    data: {
                        connection: brokerInfo,
                        subscriptions,
                        health: await messageBroker.healthCheck()
                    }
                });
            } catch (error) {
                logger.error('Debug message broker route error', error as Error);
                reply.code(500).send({ success: false, error: 'Debug error' });
            }
        });
    }

    logger.info('All routes registered successfully');
}
