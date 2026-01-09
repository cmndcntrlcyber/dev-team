import { FastifyInstance } from 'fastify';
import {
    WorkflowExecutionEngine,
    Workflow,
    WorkflowStep
} from '../workflow/WorkflowExecutionEngine';
import {
    Logger,
    ApiResponse,
    ValidationError,
    NotFoundError,
    PlatformError
} from '../shared';

// Validation schemas
const workflowCreateSchema = {
    body: {
        type: 'object',
        required: ['name'],
        properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'] },
            config: { type: 'object' },
            variables: { type: 'object' },
            triggers: { type: 'array' },
            hooks: { type: 'object' },
            projectId: { type: 'string' }
        }
    }
};

const workflowUpdateSchema = {
    body: {
        type: 'object',
        properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'] },
            config: { type: 'object' },
            variables: { type: 'object' },
            triggers: { type: 'array' },
            hooks: { type: 'object' }
        }
    }
};

const stepCreateSchema = {
    body: {
        type: 'object',
        required: ['name', 'stepType'],
        properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            stepOrder: { type: 'integer', minimum: 0 },
            stepType: { type: 'string', enum: ['TASK', 'PARALLEL', 'CONDITIONAL', 'WAIT', 'APPROVAL', 'WEBHOOK', 'SCRIPT'] },
            agentType: { type: 'string' },
            taskConfig: { type: 'object' },
            retryPolicy: {
                type: 'object',
                properties: {
                    maxRetries: { type: 'integer', minimum: 0 },
                    retryDelayMs: { type: 'integer', minimum: 0 },
                    backoffMultiplier: { type: 'number', minimum: 1 }
                }
            },
            timeoutMs: { type: 'integer', minimum: 0 },
            condition: { type: 'object' },
            onSuccess: { type: 'string' },
            onFailure: { type: 'string' },
            dependencies: { type: 'array', items: { type: 'string' } },
            enabled: { type: 'boolean' }
        }
    }
};

const executeWorkflowSchema = {
    body: {
        type: 'object',
        properties: {
            triggerType: { type: 'string', enum: ['MANUAL', 'SCHEDULED', 'EVENT', 'API', 'WEBHOOK'] },
            variables: { type: 'object' }
        }
    }
};

export async function registerWorkflowRoutes(
    fastify: FastifyInstance,
    workflowEngine: WorkflowExecutionEngine,
    logger: Logger
): Promise<void> {

    // ============================================
    // Workflow Definition Endpoints
    // ============================================

    // Create workflow
    fastify.post('/api/workflows', { schema: workflowCreateSchema }, async (request, reply) => {
        const data = request.body as Partial<Workflow>;

        try {
            const workflow = await workflowEngine.createWorkflow({
                ...data,
                ownerId: (request.user as any)?.sub
            });

            const response: ApiResponse = {
                success: true,
                data: workflow,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.code(201).send(response);
        } catch (error) {
            logger.error('Failed to create workflow', error as Error);
            throw new PlatformError('Failed to create workflow', 'WORKFLOW_CREATE_ERROR', 500);
        }
    });

    // List workflows
    fastify.get('/api/workflows', async (request, reply) => {
        const { status, projectId } = request.query as { status?: string; projectId?: string };

        try {
            const workflows = await workflowEngine.listWorkflows({
                status,
                projectId,
                ownerId: (request.user as any)?.sub
            });

            const response: ApiResponse = {
                success: true,
                data: workflows,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0',
                    total: workflows.length
                }
            };

            reply.send(response);
        } catch (error) {
            logger.error('Failed to list workflows', error as Error);
            throw new PlatformError('Failed to retrieve workflows', 'WORKFLOWS_LIST_ERROR', 500);
        }
    });

    // Get workflow by ID
    fastify.get('/api/workflows/:workflowId', async (request, reply) => {
        const { workflowId } = request.params as { workflowId: string };

        try {
            const result = await workflowEngine.getWorkflowWithSteps(workflowId);

            if (!result) {
                throw new NotFoundError(`Workflow not found: ${workflowId}`);
            }

            const response: ApiResponse = {
                success: true,
                data: result,
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
            logger.error(`Failed to get workflow ${workflowId}`, error as Error);
            throw new PlatformError(`Failed to retrieve workflow: ${workflowId}`, 'WORKFLOW_GET_ERROR', 500);
        }
    });

    // Update workflow
    fastify.put('/api/workflows/:workflowId', { schema: workflowUpdateSchema }, async (request, reply) => {
        const { workflowId } = request.params as { workflowId: string };
        const updates = request.body as Partial<Workflow>;

        try {
            const workflow = await workflowEngine.updateWorkflow(workflowId, updates);

            const response: ApiResponse = {
                success: true,
                data: workflow,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            if (error instanceof PlatformError && error.code === 'NOT_FOUND') {
                throw new NotFoundError(`Workflow not found: ${workflowId}`);
            }
            logger.error(`Failed to update workflow ${workflowId}`, error as Error);
            throw new PlatformError(`Failed to update workflow: ${workflowId}`, 'WORKFLOW_UPDATE_ERROR', 500);
        }
    });

    // Delete workflow
    fastify.delete('/api/workflows/:workflowId', async (request, reply) => {
        const { workflowId } = request.params as { workflowId: string };

        try {
            await workflowEngine.deleteWorkflow(workflowId);

            const response: ApiResponse = {
                success: true,
                data: { message: `Workflow ${workflowId} deleted successfully` },
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            if (error instanceof PlatformError && error.code === 'NOT_FOUND') {
                throw new NotFoundError(`Workflow not found: ${workflowId}`);
            }
            logger.error(`Failed to delete workflow ${workflowId}`, error as Error);
            throw new PlatformError(`Failed to delete workflow: ${workflowId}`, 'WORKFLOW_DELETE_ERROR', 500);
        }
    });

    // ============================================
    // Workflow Step Endpoints
    // ============================================

    // Add step to workflow
    fastify.post('/api/workflows/:workflowId/steps', { schema: stepCreateSchema }, async (request, reply) => {
        const { workflowId } = request.params as { workflowId: string };
        const stepData = request.body as Partial<WorkflowStep>;

        try {
            const step = await workflowEngine.addStep(workflowId, stepData);

            const response: ApiResponse = {
                success: true,
                data: step,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.code(201).send(response);
        } catch (error) {
            logger.error(`Failed to add step to workflow ${workflowId}`, error as Error);
            throw new PlatformError('Failed to add workflow step', 'WORKFLOW_STEP_CREATE_ERROR', 500);
        }
    });

    // ============================================
    // Workflow Execution Endpoints
    // ============================================

    // Execute workflow
    fastify.post('/api/workflows/:workflowId/execute', { schema: executeWorkflowSchema }, async (request, reply) => {
        const { workflowId } = request.params as { workflowId: string };
        const options = request.body as { triggerType?: any; variables?: Record<string, any> };

        try {
            const execution = await workflowEngine.executeWorkflow(workflowId, {
                triggerType: options.triggerType || 'API',
                triggeredBy: (request.user as any)?.sub,
                variables: options.variables
            });

            const response: ApiResponse = {
                success: true,
                data: execution,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.code(201).send(response);
        } catch (error) {
            if (error instanceof PlatformError) {
                throw error;
            }
            logger.error(`Failed to execute workflow ${workflowId}`, error as Error);
            throw new PlatformError('Failed to execute workflow', 'WORKFLOW_EXECUTE_ERROR', 500);
        }
    });

    // List executions
    fastify.get('/api/workflows/executions', async (request, reply) => {
        const { workflowId, status, limit, offset } = request.query as {
            workflowId?: string;
            status?: string;
            limit?: string;
            offset?: string;
        };

        try {
            const executions = await workflowEngine.listExecutions({
                workflowId,
                status,
                limit: limit ? parseInt(limit) : 50,
                offset: offset ? parseInt(offset) : 0
            });

            const response: ApiResponse = {
                success: true,
                data: executions,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0',
                    total: executions.length
                }
            };

            reply.send(response);
        } catch (error) {
            logger.error('Failed to list workflow executions', error as Error);
            throw new PlatformError('Failed to retrieve workflow executions', 'EXECUTIONS_LIST_ERROR', 500);
        }
    });

    // Get execution by ID
    fastify.get('/api/workflows/executions/:executionId', async (request, reply) => {
        const { executionId } = request.params as { executionId: string };

        try {
            const result = await workflowEngine.getExecutionWithSteps(executionId);

            if (!result) {
                throw new NotFoundError(`Execution not found: ${executionId}`);
            }

            const response: ApiResponse = {
                success: true,
                data: result,
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
            logger.error(`Failed to get execution ${executionId}`, error as Error);
            throw new PlatformError(`Failed to retrieve execution: ${executionId}`, 'EXECUTION_GET_ERROR', 500);
        }
    });

    // Pause execution
    fastify.post('/api/workflows/executions/:executionId/pause', async (request, reply) => {
        const { executionId } = request.params as { executionId: string };

        try {
            await workflowEngine.pauseExecution(executionId);

            const response: ApiResponse = {
                success: true,
                data: { message: `Execution ${executionId} paused`, executionId },
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            logger.error(`Failed to pause execution ${executionId}`, error as Error);
            throw new PlatformError(`Failed to pause execution: ${executionId}`, 'EXECUTION_PAUSE_ERROR', 500);
        }
    });

    // Resume execution
    fastify.post('/api/workflows/executions/:executionId/resume', async (request, reply) => {
        const { executionId } = request.params as { executionId: string };

        try {
            await workflowEngine.resumeExecution(executionId);

            const response: ApiResponse = {
                success: true,
                data: { message: `Execution ${executionId} resumed`, executionId },
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            logger.error(`Failed to resume execution ${executionId}`, error as Error);
            throw new PlatformError(`Failed to resume execution: ${executionId}`, 'EXECUTION_RESUME_ERROR', 500);
        }
    });

    // Cancel execution
    fastify.post('/api/workflows/executions/:executionId/cancel', async (request, reply) => {
        const { executionId } = request.params as { executionId: string };

        try {
            await workflowEngine.cancelExecution(executionId);

            const response: ApiResponse = {
                success: true,
                data: { message: `Execution ${executionId} cancelled`, executionId },
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            logger.error(`Failed to cancel execution ${executionId}`, error as Error);
            throw new PlatformError(`Failed to cancel execution: ${executionId}`, 'EXECUTION_CANCEL_ERROR', 500);
        }
    });

    // Approve step
    fastify.post('/api/workflows/executions/:executionId/steps/:stepId/approve', async (request, reply) => {
        const { executionId, stepId } = request.params as { executionId: string; stepId: string };
        const { approved, comments } = request.body as { approved: boolean; comments?: string };

        try {
            // Get step execution ID
            const result = await (workflowEngine as any).database.query(
                'SELECT id FROM workflow_step_executions WHERE execution_id = $1 AND step_id = $2',
                [executionId, stepId]
            );

            if (result.rows.length === 0) {
                throw new NotFoundError(`Step execution not found for execution ${executionId} and step ${stepId}`);
            }

            // Publish approval message
            await (workflowEngine as any).messageBroker.publish('workflow.approval', {
                stepExecutionId: result.rows[0].id,
                approved,
                approverId: (request.user as any)?.sub,
                comments
            });

            const response: ApiResponse = {
                success: true,
                data: {
                    message: approved ? 'Step approved' : 'Step rejected',
                    executionId,
                    stepId,
                    approved
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
            logger.error(`Failed to process approval for execution ${executionId} step ${stepId}`, error as Error);
            throw new PlatformError('Failed to process approval', 'APPROVAL_ERROR', 500);
        }
    });

    // ============================================
    // Template Endpoints
    // ============================================

    // List templates
    fastify.get('/api/workflows/templates', async (request, reply) => {
        const { category } = request.query as { category?: string };

        try {
            const templates = await workflowEngine.listTemplates(category);

            const response: ApiResponse = {
                success: true,
                data: templates,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0',
                    total: templates.length
                }
            };

            reply.send(response);
        } catch (error) {
            logger.error('Failed to list workflow templates', error as Error);
            throw new PlatformError('Failed to retrieve workflow templates', 'TEMPLATES_LIST_ERROR', 500);
        }
    });

    // Instantiate template
    fastify.post('/api/workflows/templates/:templateId/instantiate', async (request, reply) => {
        const { templateId } = request.params as { templateId: string };
        const { name, projectId, variables } = request.body as {
            name: string;
            projectId?: string;
            variables?: Record<string, any>;
        };

        try {
            if (!name) {
                throw new ValidationError('Workflow name is required');
            }

            const workflow = await workflowEngine.instantiateTemplate(templateId, {
                name,
                projectId,
                variables
            });

            const response: ApiResponse = {
                success: true,
                data: workflow,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.code(201).send(response);
        } catch (error) {
            if (error instanceof PlatformError && error.code === 'NOT_FOUND') {
                throw new NotFoundError(`Template not found: ${templateId}`);
            }
            if (error instanceof ValidationError) {
                throw error;
            }
            logger.error(`Failed to instantiate template ${templateId}`, error as Error);
            throw new PlatformError('Failed to instantiate template', 'TEMPLATE_INSTANTIATE_ERROR', 500);
        }
    });

    logger.info('Workflow routes registered successfully');
}
