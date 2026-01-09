import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import {
    Logger,
    AgentTask,
    PlatformError,
    TaskStatus
} from '../shared';
import { DatabaseManager } from '../database/DatabaseManager';
import { MessageBroker } from '../messaging/MessageBroker';
import { AgentOrchestrator } from '../orchestrator/AgentOrchestrator';

// Workflow Types
export interface Workflow {
    id: string;
    name: string;
    description?: string;
    version: number;
    status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
    config: WorkflowConfig;
    variables: Record<string, any>;
    triggers: WorkflowTrigger[];
    hooks: WorkflowHooks;
    ownerId?: string;
    projectId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkflowConfig {
    maxParallelSteps?: number;
    defaultTimeoutMs?: number;
    failureStrategy?: 'FAIL_FAST' | 'CONTINUE' | 'ROLLBACK';
    retryPolicy?: RetryPolicy;
}

export interface RetryPolicy {
    maxRetries: number;
    retryDelayMs: number;
    backoffMultiplier: number;
}

export interface WorkflowTrigger {
    type: 'MANUAL' | 'SCHEDULED' | 'EVENT' | 'API' | 'WEBHOOK';
    config: Record<string, any>;
}

export interface WorkflowHooks {
    onStart?: string;
    onComplete?: string;
    onFailed?: string;
    onStepComplete?: string;
}

export interface WorkflowStep {
    id: string;
    workflowId: string;
    name: string;
    description?: string;
    stepOrder: number;
    stepType: 'TASK' | 'PARALLEL' | 'CONDITIONAL' | 'WAIT' | 'APPROVAL' | 'WEBHOOK' | 'SCRIPT';
    agentType?: string;
    taskConfig: TaskConfig;
    retryPolicy: RetryPolicy;
    timeoutMs: number;
    condition?: StepCondition;
    onSuccess?: string;
    onFailure?: string;
    enabled: boolean;
    dependencies: string[];
}

export interface TaskConfig {
    type: string;
    title: string;
    description?: string;
    priority?: string;
    metadata?: Record<string, any>;
    waitMs?: number;
}

export interface StepCondition {
    expression: string;
    variables?: string[];
}

export interface WorkflowExecution {
    id: string;
    workflowId: string;
    status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'WAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    triggerType: 'MANUAL' | 'SCHEDULED' | 'EVENT' | 'API' | 'WEBHOOK';
    triggeredBy?: string;
    inputVariables: Record<string, any>;
    outputVariables: Record<string, any>;
    context: Record<string, any>;
    progress: number;
    currentStepId?: string;
    errorMessage?: string;
    startedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface StepExecution {
    id: string;
    executionId: string;
    stepId: string;
    status: 'PENDING' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';
    assignedAgentId?: string;
    taskId?: string;
    inputData: Record<string, any>;
    outputData: Record<string, any>;
    errorMessage?: string;
    retryCount: number;
    startedAt?: Date;
    completedAt?: Date;
}

export class WorkflowExecutionEngine extends EventEmitter {
    private database: DatabaseManager;
    private messageBroker: MessageBroker;
    private orchestrator: AgentOrchestrator;
    private logger: Logger;
    private activeExecutions: Map<string, WorkflowExecution> = new Map();
    private executionTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(
        database: DatabaseManager,
        messageBroker: MessageBroker,
        orchestrator: AgentOrchestrator,
        logger: Logger
    ) {
        super();
        this.database = database;
        this.messageBroker = messageBroker;
        this.orchestrator = orchestrator;
        this.logger = logger;
    }

    async initialize(): Promise<void> {
        this.logger.info('Initializing Workflow Execution Engine...');

        // Subscribe to task completion events
        await this.messageBroker.subscribe('task.complete', this.handleTaskCompletion.bind(this));
        await this.messageBroker.subscribe('workflow.approval', this.handleApproval.bind(this));

        // Resume any running executions
        await this.resumeExecutions();

        this.logger.info('Workflow Execution Engine initialized');
    }

    async stop(): Promise<void> {
        this.logger.info('Stopping Workflow Execution Engine...');

        // Clear all timers
        for (const timer of this.executionTimers.values()) {
            clearTimeout(timer);
        }
        this.executionTimers.clear();
        this.activeExecutions.clear();

        this.logger.info('Workflow Execution Engine stopped');
    }

    // Workflow CRUD Operations

    async createWorkflow(data: Partial<Workflow>): Promise<Workflow> {
        const id = uuid();

        const result = await this.database.query(
            `INSERT INTO workflows (id, name, description, status, config, variables, triggers, hooks, owner_id, project_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
                id,
                data.name,
                data.description || '',
                data.status || 'DRAFT',
                JSON.stringify(data.config || {}),
                JSON.stringify(data.variables || {}),
                JSON.stringify(data.triggers || []),
                JSON.stringify(data.hooks || {}),
                data.ownerId || null,
                data.projectId || null
            ]
        );

        const workflow = this.mapWorkflowRow(result.rows[0]);
        this.emit('workflow:created', { workflowId: id, name: data.name });

        return workflow;
    }

    async getWorkflow(workflowId: string): Promise<Workflow | null> {
        const result = await this.database.query(
            'SELECT * FROM workflows WHERE id = $1',
            [workflowId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapWorkflowRow(result.rows[0]);
    }

    async getWorkflowWithSteps(workflowId: string): Promise<{ workflow: Workflow; steps: WorkflowStep[] } | null> {
        const workflow = await this.getWorkflow(workflowId);
        if (!workflow) {
            return null;
        }

        const stepsResult = await this.database.query(
            `SELECT ws.*,
                    COALESCE(
                        (SELECT json_agg(wsd.depends_on_step_id)
                         FROM workflow_step_dependencies wsd
                         WHERE wsd.step_id = ws.id), '[]'
                    ) as dependencies
             FROM workflow_steps ws
             WHERE ws.workflow_id = $1
             ORDER BY ws.step_order`,
            [workflowId]
        );

        const steps = stepsResult.rows.map(this.mapStepRow.bind(this));

        return { workflow, steps };
    }

    async listWorkflows(filters?: { status?: string; projectId?: string; ownerId?: string }): Promise<Workflow[]> {
        let sql = 'SELECT * FROM workflows WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if (filters?.status) {
            sql += ` AND status = $${paramIndex++}`;
            params.push(filters.status);
        }
        if (filters?.projectId) {
            sql += ` AND project_id = $${paramIndex++}`;
            params.push(filters.projectId);
        }
        if (filters?.ownerId) {
            sql += ` AND owner_id = $${paramIndex++}`;
            params.push(filters.ownerId);
        }

        sql += ' ORDER BY updated_at DESC';

        const result = await this.database.query(sql, params);
        return result.rows.map(this.mapWorkflowRow.bind(this));
    }

    async updateWorkflow(workflowId: string, updates: Partial<Workflow>): Promise<Workflow> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(updates.name);
        }
        if (updates.description !== undefined) {
            fields.push(`description = $${paramIndex++}`);
            values.push(updates.description);
        }
        if (updates.status !== undefined) {
            fields.push(`status = $${paramIndex++}`);
            values.push(updates.status);
        }
        if (updates.config !== undefined) {
            fields.push(`config = $${paramIndex++}`);
            values.push(JSON.stringify(updates.config));
        }
        if (updates.variables !== undefined) {
            fields.push(`variables = $${paramIndex++}`);
            values.push(JSON.stringify(updates.variables));
        }
        if (updates.triggers !== undefined) {
            fields.push(`triggers = $${paramIndex++}`);
            values.push(JSON.stringify(updates.triggers));
        }
        if (updates.hooks !== undefined) {
            fields.push(`hooks = $${paramIndex++}`);
            values.push(JSON.stringify(updates.hooks));
        }

        if (fields.length === 0) {
            throw new PlatformError('No fields to update', 'VALIDATION_ERROR', 400);
        }

        values.push(workflowId);

        const result = await this.database.query(
            `UPDATE workflows SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            throw new PlatformError(`Workflow not found: ${workflowId}`, 'NOT_FOUND', 404);
        }

        return this.mapWorkflowRow(result.rows[0]);
    }

    async deleteWorkflow(workflowId: string): Promise<void> {
        const result = await this.database.query(
            'DELETE FROM workflows WHERE id = $1 RETURNING id',
            [workflowId]
        );

        if (result.rows.length === 0) {
            throw new PlatformError(`Workflow not found: ${workflowId}`, 'NOT_FOUND', 404);
        }

        this.emit('workflow:deleted', { workflowId });
    }

    // Step Management

    async addStep(workflowId: string, step: Partial<WorkflowStep>): Promise<WorkflowStep> {
        const id = uuid();

        // Get max step order
        const orderResult = await this.database.query(
            'SELECT COALESCE(MAX(step_order), 0) + 1 as next_order FROM workflow_steps WHERE workflow_id = $1',
            [workflowId]
        );
        const stepOrder = step.stepOrder || orderResult.rows[0].next_order;

        const result = await this.database.query(
            `INSERT INTO workflow_steps (id, workflow_id, name, description, step_order, step_type, agent_type, task_config, retry_policy, timeout_ms, condition, on_success, on_failure, enabled)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             RETURNING *`,
            [
                id,
                workflowId,
                step.name,
                step.description || '',
                stepOrder,
                step.stepType,
                step.agentType || null,
                JSON.stringify(step.taskConfig || {}),
                JSON.stringify(step.retryPolicy || { maxRetries: 3, retryDelayMs: 5000, backoffMultiplier: 2 }),
                step.timeoutMs || 3600000,
                step.condition ? JSON.stringify(step.condition) : null,
                step.onSuccess || null,
                step.onFailure || null,
                step.enabled !== false
            ]
        );

        // Add dependencies
        if (step.dependencies && step.dependencies.length > 0) {
            for (const depId of step.dependencies) {
                await this.database.query(
                    'INSERT INTO workflow_step_dependencies (step_id, depends_on_step_id) VALUES ($1, $2)',
                    [id, depId]
                );
            }
        }

        return this.mapStepRow({ ...result.rows[0], dependencies: step.dependencies || [] });
    }

    // Workflow Execution

    async executeWorkflow(
        workflowId: string,
        options: {
            triggerType?: 'MANUAL' | 'SCHEDULED' | 'EVENT' | 'API' | 'WEBHOOK';
            triggeredBy?: string;
            variables?: Record<string, any>;
        } = {}
    ): Promise<WorkflowExecution> {
        const workflow = await this.getWorkflow(workflowId);
        if (!workflow) {
            throw new PlatformError(`Workflow not found: ${workflowId}`, 'NOT_FOUND', 404);
        }

        if (workflow.status !== 'ACTIVE') {
            throw new PlatformError(`Workflow is not active: ${workflow.status}`, 'VALIDATION_ERROR', 400);
        }

        const executionId = uuid();
        const inputVariables = { ...workflow.variables, ...options.variables };

        // Create execution record
        const result = await this.database.query(
            `INSERT INTO workflow_executions (id, workflow_id, status, trigger_type, triggered_by, input_variables, context)
             VALUES ($1, $2, 'PENDING', $3, $4, $5, $6)
             RETURNING *`,
            [
                executionId,
                workflowId,
                options.triggerType || 'MANUAL',
                options.triggeredBy || null,
                JSON.stringify(inputVariables),
                JSON.stringify({})
            ]
        );

        const execution = this.mapExecutionRow(result.rows[0]);

        // Create step execution records
        const stepsResult = await this.database.query(
            'SELECT * FROM workflow_steps WHERE workflow_id = $1 AND enabled = true ORDER BY step_order',
            [workflowId]
        );

        for (const step of stepsResult.rows) {
            await this.database.query(
                `INSERT INTO workflow_step_executions (execution_id, step_id, status, input_data)
                 VALUES ($1, $2, 'PENDING', $3)`,
                [executionId, step.id, JSON.stringify({})]
            );
        }

        // Execute hooks
        if (workflow.hooks.onStart) {
            await this.executeHook(workflow.hooks.onStart, execution);
        }

        // Start execution
        this.activeExecutions.set(executionId, execution);
        await this.startExecution(executionId);

        this.emit('workflow:started', { executionId, workflowId });

        return execution;
    }

    private async startExecution(executionId: string): Promise<void> {
        await this.database.query(
            `UPDATE workflow_executions SET status = 'RUNNING', started_at = NOW() WHERE id = $1`,
            [executionId]
        );

        const execution = this.activeExecutions.get(executionId);
        if (execution) {
            execution.status = 'RUNNING';
            execution.startedAt = new Date();
        }

        await this.processNextSteps(executionId);
    }

    private async processNextSteps(executionId: string): Promise<void> {
        try {
            // Get next executable steps using database function
            const result = await this.database.query(
                'SELECT * FROM get_next_workflow_steps($1)',
                [executionId]
            );

            if (result.rows.length === 0) {
                // Check if all steps are done
                const pending = await this.database.query(
                    `SELECT COUNT(*) FROM workflow_step_executions
                     WHERE execution_id = $1 AND status NOT IN ('COMPLETED', 'SKIPPED', 'FAILED', 'CANCELLED')`,
                    [executionId]
                );

                if (parseInt(pending.rows[0].count) === 0) {
                    await this.completeExecution(executionId);
                }
                return;
            }

            // Execute each ready step
            for (const stepInfo of result.rows) {
                await this.executeStep(executionId, stepInfo.step_id);
            }
        } catch (error) {
            this.logger.error(`Error processing next steps for execution ${executionId}`, error as Error);
            await this.failExecution(executionId, (error as Error).message);
        }
    }

    private async executeStep(executionId: string, stepId: string): Promise<void> {
        const stepResult = await this.database.query(
            'SELECT * FROM workflow_steps WHERE id = $1',
            [stepId]
        );

        if (stepResult.rows.length === 0) {
            throw new PlatformError(`Step not found: ${stepId}`, 'NOT_FOUND', 404);
        }

        const step = this.mapStepRow(stepResult.rows[0]);

        // Update step execution status
        await this.database.query(
            `UPDATE workflow_step_executions SET status = 'RUNNING', started_at = NOW() WHERE execution_id = $1 AND step_id = $2`,
            [executionId, stepId]
        );

        // Get execution context
        const execResult = await this.database.query(
            'SELECT * FROM workflow_executions WHERE id = $1',
            [executionId]
        );
        const execution = this.mapExecutionRow(execResult.rows[0]);

        // Check condition if present
        if (step.condition) {
            const shouldExecute = await this.evaluateCondition(step.condition, execution.context);
            if (!shouldExecute) {
                await this.skipStep(executionId, stepId, 'Condition not met');
                return;
            }
        }

        // Execute based on step type
        switch (step.stepType) {
            case 'TASK':
                await this.executeTaskStep(executionId, step, execution);
                break;
            case 'PARALLEL':
                await this.executeParallelStep(executionId, step, execution);
                break;
            case 'CONDITIONAL':
                await this.executeConditionalStep(executionId, step, execution);
                break;
            case 'WAIT':
                await this.executeWaitStep(executionId, step, execution);
                break;
            case 'APPROVAL':
                await this.executeApprovalStep(executionId, step, execution);
                break;
            default:
                throw new PlatformError(`Unknown step type: ${step.stepType}`, 'VALIDATION_ERROR', 400);
        }

        // Set timeout
        const timer = setTimeout(async () => {
            await this.handleStepTimeout(executionId, stepId);
        }, step.timeoutMs);

        this.executionTimers.set(`${executionId}:${stepId}`, timer);
    }

    private async executeTaskStep(executionId: string, step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
        const taskConfig = this.substituteVariables(step.taskConfig, execution.inputVariables);

        // Create task via orchestrator
        const task: AgentTask = {
            id: uuid(),
            title: taskConfig.title || step.name,
            description: taskConfig.description || step.description || '',
            type: taskConfig.type,
            priority: taskConfig.priority || 'MEDIUM',
            status: 'NOT_STARTED',
            projectId: execution.context.projectId,
            createdAt: new Date(),
            updatedAt: new Date(),
            dependencies: [],
            blockers: [],
            estimatedHours: 1,
            tags: ['workflow', executionId],
            metadata: {
                workflowExecutionId: executionId,
                stepId: step.id,
                ...taskConfig.metadata
            }
        };

        await this.orchestrator.submitTask(task);

        // Update step execution with task ID
        await this.database.query(
            `UPDATE workflow_step_executions SET task_id = $3 WHERE execution_id = $1 AND step_id = $2`,
            [executionId, step.id, task.id]
        );

        this.logger.info(`Task step started: ${step.name} -> Task ${task.id}`);
    }

    private async executeParallelStep(executionId: string, step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
        // Parallel steps are handled by the dependency graph - mark as complete immediately
        // The actual parallel execution happens when child steps have this as their dependency
        await this.completeStep(executionId, step.id, {});
    }

    private async executeConditionalStep(executionId: string, step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
        if (!step.condition) {
            await this.completeStep(executionId, step.id, { branch: 'default' });
            return;
        }

        const result = await this.evaluateCondition(step.condition, execution.context);
        const branch = result ? step.onSuccess : step.onFailure;

        await this.completeStep(executionId, step.id, { branch, conditionResult: result });
    }

    private async executeWaitStep(executionId: string, step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
        const waitMs = step.taskConfig.waitMs || 60000;

        await this.database.query(
            `UPDATE workflow_step_executions SET status = 'WAITING' WHERE execution_id = $1 AND step_id = $2`,
            [executionId, step.id]
        );

        setTimeout(async () => {
            await this.completeStep(executionId, step.id, { waited: waitMs });
        }, waitMs);
    }

    private async executeApprovalStep(executionId: string, step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
        // Create approval request
        const stepExecResult = await this.database.query(
            'SELECT id FROM workflow_step_executions WHERE execution_id = $1 AND step_id = $2',
            [executionId, step.id]
        );

        await this.database.query(
            `INSERT INTO workflow_approvals (step_execution_id, expires_at)
             VALUES ($1, NOW() + INTERVAL '24 hours')`,
            [stepExecResult.rows[0].id]
        );

        // Update execution status
        await this.database.query(
            `UPDATE workflow_executions SET status = 'WAITING_APPROVAL', current_step_id = $2 WHERE id = $1`,
            [executionId, step.id]
        );

        await this.database.query(
            `UPDATE workflow_step_executions SET status = 'WAITING' WHERE execution_id = $1 AND step_id = $2`,
            [executionId, step.id]
        );

        // Publish approval request event
        await this.messageBroker.publish('workflow.approval_required', {
            executionId,
            stepId: step.id,
            stepName: step.name,
            timestamp: new Date()
        });

        this.emit('workflow:approval_required', { executionId, stepId: step.id });
    }

    private async handleApproval(message: any): Promise<void> {
        const { stepExecutionId, approved, approverId, comments } = message;

        const stepExec = await this.database.query(
            `SELECT wse.*, ws.id as step_id, we.id as execution_id
             FROM workflow_step_executions wse
             JOIN workflow_steps ws ON ws.id = wse.step_id
             JOIN workflow_executions we ON we.id = wse.execution_id
             WHERE wse.id = $1`,
            [stepExecutionId]
        );

        if (stepExec.rows.length === 0) {
            return;
        }

        const { execution_id, step_id } = stepExec.rows[0];

        // Update approval record
        await this.database.query(
            `UPDATE workflow_approvals SET status = $2, approver_id = $3, comments = $4, approved_at = NOW()
             WHERE step_execution_id = $1`,
            [stepExecutionId, approved ? 'APPROVED' : 'REJECTED', approverId, comments]
        );

        if (approved) {
            await this.completeStep(execution_id, step_id, { approved: true, approverId });

            // Resume execution
            await this.database.query(
                `UPDATE workflow_executions SET status = 'RUNNING' WHERE id = $1`,
                [execution_id]
            );

            await this.processNextSteps(execution_id);
        } else {
            await this.failStep(execution_id, step_id, `Approval rejected: ${comments || 'No reason provided'}`);
        }
    }

    private async handleTaskCompletion(message: any): Promise<void> {
        const { taskId, result } = message;

        // Find step execution by task ID
        const stepExec = await this.database.query(
            `SELECT wse.*, ws.retry_policy
             FROM workflow_step_executions wse
             JOIN workflow_steps ws ON ws.id = wse.step_id
             WHERE wse.task_id = $1`,
            [taskId]
        );

        if (stepExec.rows.length === 0) {
            return; // Not a workflow task
        }

        const { execution_id, step_id, retry_policy, retry_count } = stepExec.rows[0];
        const policy = typeof retry_policy === 'string' ? JSON.parse(retry_policy) : retry_policy;

        // Clear timeout
        const timerKey = `${execution_id}:${step_id}`;
        if (this.executionTimers.has(timerKey)) {
            clearTimeout(this.executionTimers.get(timerKey)!);
            this.executionTimers.delete(timerKey);
        }

        if (result.status === 'SUCCESS') {
            await this.completeStep(execution_id, step_id, result.data);
            await this.processNextSteps(execution_id);
        } else {
            // Check retry policy
            if (retry_count < policy.maxRetries) {
                const delay = policy.retryDelayMs * Math.pow(policy.backoffMultiplier, retry_count);
                this.logger.info(`Retrying step ${step_id} in ${delay}ms (attempt ${retry_count + 1}/${policy.maxRetries})`);

                await this.database.query(
                    `UPDATE workflow_step_executions SET retry_count = retry_count + 1, status = 'PENDING' WHERE execution_id = $1 AND step_id = $2`,
                    [execution_id, step_id]
                );

                setTimeout(async () => {
                    await this.executeStep(execution_id, step_id);
                }, delay);
            } else {
                await this.failStep(execution_id, step_id, result.error || 'Task failed');
            }
        }
    }

    private async handleStepTimeout(executionId: string, stepId: string): Promise<void> {
        this.logger.warn(`Step timeout: ${executionId}:${stepId}`);
        await this.failStep(executionId, stepId, 'Step timed out');
    }

    private async completeStep(executionId: string, stepId: string, outputData: any): Promise<void> {
        await this.database.query(
            `UPDATE workflow_step_executions SET status = 'COMPLETED', output_data = $3, completed_at = NOW()
             WHERE execution_id = $1 AND step_id = $2`,
            [executionId, stepId, JSON.stringify(outputData)]
        );

        // Update execution context with step output
        await this.database.query(
            `UPDATE workflow_executions SET context = context || $2, progress = calculate_workflow_progress($1)
             WHERE id = $1`,
            [executionId, JSON.stringify({ [`step_${stepId}`]: outputData })]
        );

        this.emit('workflow:step_completed', { executionId, stepId, outputData });
    }

    private async skipStep(executionId: string, stepId: string, reason: string): Promise<void> {
        await this.database.query(
            `UPDATE workflow_step_executions SET status = 'SKIPPED', output_data = $3, completed_at = NOW()
             WHERE execution_id = $1 AND step_id = $2`,
            [executionId, stepId, JSON.stringify({ skipped: true, reason })]
        );

        await this.database.query(
            `UPDATE workflow_executions SET progress = calculate_workflow_progress($1) WHERE id = $1`,
            [executionId]
        );

        await this.processNextSteps(executionId);
    }

    private async failStep(executionId: string, stepId: string, errorMessage: string): Promise<void> {
        await this.database.query(
            `UPDATE workflow_step_executions SET status = 'FAILED', error_message = $3, completed_at = NOW()
             WHERE execution_id = $1 AND step_id = $2`,
            [executionId, stepId, errorMessage]
        );

        // Get workflow config to check failure strategy
        const execResult = await this.database.query(
            `SELECT we.*, w.config as workflow_config, w.hooks
             FROM workflow_executions we
             JOIN workflows w ON w.id = we.workflow_id
             WHERE we.id = $1`,
            [executionId]
        );

        const config = execResult.rows[0].workflow_config;
        const failureStrategy = config?.failureStrategy || 'FAIL_FAST';

        if (failureStrategy === 'FAIL_FAST') {
            await this.failExecution(executionId, `Step failed: ${errorMessage}`);
        } else if (failureStrategy === 'CONTINUE') {
            await this.processNextSteps(executionId);
        }

        this.emit('workflow:step_failed', { executionId, stepId, errorMessage });
    }

    private async completeExecution(executionId: string): Promise<void> {
        const execResult = await this.database.query(
            `SELECT we.*, w.hooks FROM workflow_executions we JOIN workflows w ON w.id = we.workflow_id WHERE we.id = $1`,
            [executionId]
        );

        // Check if any steps failed
        const failedSteps = await this.database.query(
            `SELECT COUNT(*) FROM workflow_step_executions WHERE execution_id = $1 AND status = 'FAILED'`,
            [executionId]
        );

        const hasFailed = parseInt(failedSteps.rows[0].count) > 0;

        await this.database.query(
            `UPDATE workflow_executions SET status = $2, progress = 100, completed_at = NOW() WHERE id = $1`,
            [executionId, hasFailed ? 'FAILED' : 'COMPLETED']
        );

        // Execute completion hook
        const hooks = execResult.rows[0].hooks;
        if (hasFailed && hooks?.onFailed) {
            await this.executeHook(hooks.onFailed, execResult.rows[0]);
        } else if (!hasFailed && hooks?.onComplete) {
            await this.executeHook(hooks.onComplete, execResult.rows[0]);
        }

        this.activeExecutions.delete(executionId);
        this.emit('workflow:completed', { executionId, status: hasFailed ? 'FAILED' : 'COMPLETED' });
    }

    private async failExecution(executionId: string, errorMessage: string): Promise<void> {
        await this.database.query(
            `UPDATE workflow_executions SET status = 'FAILED', error_message = $2, completed_at = NOW() WHERE id = $1`,
            [executionId, errorMessage]
        );

        // Cancel pending steps
        await this.database.query(
            `UPDATE workflow_step_executions SET status = 'CANCELLED' WHERE execution_id = $1 AND status IN ('PENDING', 'RUNNING', 'WAITING')`,
            [executionId]
        );

        // Get hooks
        const execResult = await this.database.query(
            `SELECT w.hooks FROM workflow_executions we JOIN workflows w ON w.id = we.workflow_id WHERE we.id = $1`,
            [executionId]
        );

        const hooks = execResult.rows[0]?.hooks;
        if (hooks?.onFailed) {
            await this.executeHook(hooks.onFailed, { executionId, errorMessage });
        }

        this.activeExecutions.delete(executionId);
        this.emit('workflow:failed', { executionId, errorMessage });
    }

    async pauseExecution(executionId: string): Promise<void> {
        await this.database.query(
            `UPDATE workflow_executions SET status = 'PAUSED' WHERE id = $1 AND status = 'RUNNING'`,
            [executionId]
        );

        this.emit('workflow:paused', { executionId });
    }

    async resumeExecution(executionId: string): Promise<void> {
        await this.database.query(
            `UPDATE workflow_executions SET status = 'RUNNING' WHERE id = $1 AND status = 'PAUSED'`,
            [executionId]
        );

        await this.processNextSteps(executionId);
        this.emit('workflow:resumed', { executionId });
    }

    async cancelExecution(executionId: string): Promise<void> {
        await this.database.query(
            `UPDATE workflow_executions SET status = 'CANCELLED', completed_at = NOW() WHERE id = $1`,
            [executionId]
        );

        await this.database.query(
            `UPDATE workflow_step_executions SET status = 'CANCELLED' WHERE execution_id = $1 AND status IN ('PENDING', 'RUNNING', 'WAITING')`,
            [executionId]
        );

        this.activeExecutions.delete(executionId);
        this.emit('workflow:cancelled', { executionId });
    }

    async getExecution(executionId: string): Promise<WorkflowExecution | null> {
        const result = await this.database.query(
            'SELECT * FROM workflow_executions WHERE id = $1',
            [executionId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapExecutionRow(result.rows[0]);
    }

    async getExecutionWithSteps(executionId: string): Promise<{ execution: WorkflowExecution; steps: StepExecution[] } | null> {
        const execution = await this.getExecution(executionId);
        if (!execution) {
            return null;
        }

        const stepsResult = await this.database.query(
            `SELECT wse.*, ws.name as step_name, ws.step_type
             FROM workflow_step_executions wse
             JOIN workflow_steps ws ON ws.id = wse.step_id
             WHERE wse.execution_id = $1
             ORDER BY ws.step_order`,
            [executionId]
        );

        const steps = stepsResult.rows.map(this.mapStepExecutionRow.bind(this));

        return { execution, steps };
    }

    async listExecutions(filters?: { workflowId?: string; status?: string; limit?: number; offset?: number }): Promise<WorkflowExecution[]> {
        let sql = 'SELECT * FROM workflow_executions WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if (filters?.workflowId) {
            sql += ` AND workflow_id = $${paramIndex++}`;
            params.push(filters.workflowId);
        }
        if (filters?.status) {
            sql += ` AND status = $${paramIndex++}`;
            params.push(filters.status);
        }

        sql += ' ORDER BY created_at DESC';

        if (filters?.limit) {
            sql += ` LIMIT $${paramIndex++}`;
            params.push(filters.limit);
        }
        if (filters?.offset) {
            sql += ` OFFSET $${paramIndex++}`;
            params.push(filters.offset);
        }

        const result = await this.database.query(sql, params);
        return result.rows.map(this.mapExecutionRow.bind(this));
    }

    // Template Operations

    async listTemplates(category?: string): Promise<any[]> {
        let sql = 'SELECT * FROM workflow_templates WHERE 1=1';
        const params: any[] = [];

        if (category) {
            sql += ' AND category = $1';
            params.push(category);
        }

        sql += ' ORDER BY usage_count DESC, name ASC';

        const result = await this.database.query(sql, params);
        return result.rows;
    }

    async instantiateTemplate(templateId: string, options: { name: string; projectId?: string; variables?: Record<string, any> }): Promise<Workflow> {
        try {
            const templateResult = await this.database.query(
                'SELECT * FROM workflow_templates WHERE id = $1',
                [templateId]
            );

            if (templateResult.rows.length === 0) {
                throw new PlatformError(`Template not found: ${templateId}`, 'NOT_FOUND', 404);
            }

            const template = templateResult.rows[0];
            const definition = template.workflow_definition;

            this.logger.debug('Instantiating template', { templateId, definition, options });

            // Create workflow from template
            const workflow = await this.createWorkflow({
                name: options.name,
                description: `Created from template: ${template.name}`,
                status: 'DRAFT',
                config: definition.config || {},
                variables: { ...definition.variables, ...options.variables },
                projectId: options.projectId
            });

            this.logger.debug('Workflow created from template', { workflowId: workflow.id });

            // Create steps from template
            if (definition.steps) {
                for (let i = 0; i < definition.steps.length; i++) {
                    const stepDef = definition.steps[i];
                    this.logger.debug('Adding step from template', { stepDef, index: i });
                    await this.addStep(workflow.id, {
                        name: stepDef.name,
                        description: stepDef.description,
                        stepOrder: i + 1,
                        stepType: stepDef.step_type,
                        agentType: stepDef.agent_type,
                        taskConfig: stepDef.task_config || {},
                        retryPolicy: stepDef.retry_policy || { maxRetries: 3, retryDelayMs: 5000, backoffMultiplier: 2 },
                        timeoutMs: stepDef.timeout_ms || 3600000,
                        enabled: true
                    });
                }
            }

            // Increment usage count
            await this.database.query(
                'UPDATE workflow_templates SET usage_count = usage_count + 1 WHERE id = $1',
                [templateId]
            );

            return workflow;
        } catch (error) {
            this.logger.error('Failed to instantiate template', error as Error);
            throw error;
        }
    }

    // Helper Methods

    private async resumeExecutions(): Promise<void> {
        const result = await this.database.query(
            `SELECT * FROM workflow_executions WHERE status IN ('RUNNING', 'PAUSED')`,
            []
        );

        for (const row of result.rows) {
            const execution = this.mapExecutionRow(row);
            this.activeExecutions.set(execution.id, execution);

            if (execution.status === 'RUNNING') {
                await this.processNextSteps(execution.id);
            }
        }

        if (result.rows.length > 0) {
            this.logger.info(`Resumed ${result.rows.length} workflow executions`);
        }
    }

    private async evaluateCondition(condition: StepCondition, context: Record<string, any>): Promise<boolean> {
        try {
            // Simple expression evaluation (can be enhanced with a proper expression parser)
            const expression = condition.expression;

            // Replace variable placeholders
            let evaluatable = expression;
            for (const [key, value] of Object.entries(context)) {
                evaluatable = evaluatable.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), JSON.stringify(value));
            }

            // Basic evaluation (for production, use a safe expression evaluator)
            return Boolean(eval(evaluatable));
        } catch (error) {
            this.logger.error('Failed to evaluate condition', error as Error);
            return false;
        }
    }

    private substituteVariables(obj: any, variables: Record<string, any>): any {
        const str = JSON.stringify(obj);
        let result = str;

        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
        }

        return JSON.parse(result);
    }

    private async executeHook(hookName: string, context: any): Promise<void> {
        try {
            await this.messageBroker.publish(`workflow.hook.${hookName}`, {
                hook: hookName,
                context,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error(`Failed to execute hook: ${hookName}`, error as Error);
        }
    }

    private mapWorkflowRow(row: any): Workflow {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            version: row.version,
            status: row.status,
            config: row.config || {},
            variables: row.variables || {},
            triggers: row.triggers || [],
            hooks: row.hooks || {},
            ownerId: row.owner_id,
            projectId: row.project_id,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    private mapStepRow(row: any): WorkflowStep {
        return {
            id: row.id,
            workflowId: row.workflow_id,
            name: row.name,
            description: row.description,
            stepOrder: row.step_order,
            stepType: row.step_type,
            agentType: row.agent_type,
            taskConfig: row.task_config || {},
            retryPolicy: row.retry_policy || { maxRetries: 3, retryDelayMs: 5000, backoffMultiplier: 2 },
            timeoutMs: row.timeout_ms,
            condition: row.condition,
            onSuccess: row.on_success,
            onFailure: row.on_failure,
            enabled: row.enabled,
            dependencies: row.dependencies || []
        };
    }

    private mapExecutionRow(row: any): WorkflowExecution {
        return {
            id: row.id,
            workflowId: row.workflow_id,
            status: row.status,
            triggerType: row.trigger_type,
            triggeredBy: row.triggered_by,
            inputVariables: row.input_variables || {},
            outputVariables: row.output_variables || {},
            context: row.context || {},
            progress: row.progress,
            currentStepId: row.current_step_id,
            errorMessage: row.error_message,
            startedAt: row.started_at ? new Date(row.started_at) : undefined,
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    private mapStepExecutionRow(row: any): StepExecution {
        return {
            id: row.id,
            executionId: row.execution_id,
            stepId: row.step_id,
            status: row.status,
            assignedAgentId: row.assigned_agent_id,
            taskId: row.task_id,
            inputData: row.input_data || {},
            outputData: row.output_data || {},
            errorMessage: row.error_message,
            retryCount: row.retry_count,
            startedAt: row.started_at ? new Date(row.started_at) : undefined,
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined
        };
    }
}
