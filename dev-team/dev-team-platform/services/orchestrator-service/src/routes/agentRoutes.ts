import { FastifyInstance } from 'fastify';
import { AgentOrchestrator } from '../orchestrator/AgentOrchestrator';
import { DatabaseManager } from '../database/DatabaseManager';
import {
    Logger,
    ApiResponse,
    ValidationError,
    NotFoundError,
    PlatformError
} from '../shared';

// Validation schemas
const agentCreateSchema = {
    body: {
        type: 'object',
        required: ['id', 'type'],
        properties: {
            id: { type: 'string', minLength: 1, maxLength: 100 },
            type: {
                type: 'string',
                enum: ['ARCHITECTURE_LEAD', 'FRONTEND_CORE', 'FRONTEND_UIUX', 'FRONTEND_VISUALIZATION',
                       'BACKEND_INTEGRATION', 'QUALITY_ASSURANCE', 'DEVOPS', 'MCP_INTEGRATION']
            },
            name: { type: 'string', maxLength: 255 },
            description: { type: 'string' },
            serviceUrl: { type: 'string', format: 'uri' },
            capabilities: { type: 'object' },
            configuration: { type: 'object' },
            priority: { type: 'integer', minimum: 0, maximum: 100 },
            enabled: { type: 'boolean' },
            tags: { type: 'array', items: { type: 'string' } }
        }
    }
};

const agentUpdateSchema = {
    body: {
        type: 'object',
        properties: {
            name: { type: 'string', maxLength: 255 },
            description: { type: 'string' },
            serviceUrl: { type: 'string', format: 'uri' },
            capabilities: { type: 'object' },
            configuration: { type: 'object' },
            priority: { type: 'integer', minimum: 0, maximum: 100 },
            tags: { type: 'array', items: { type: 'string' } }
        }
    }
};

export async function registerAgentRoutes(
    fastify: FastifyInstance,
    orchestrator: AgentOrchestrator,
    database: DatabaseManager,
    logger: Logger
): Promise<void> {

    // Create agent configuration
    fastify.post('/api/agents', { schema: agentCreateSchema }, async (request, reply) => {
        const agentData = request.body as any;

        try {
            // Check if agent already exists
            const existing = await database.query(
                'SELECT id FROM agents WHERE id = $1',
                [agentData.id]
            );

            if (existing.rows.length > 0) {
                throw new ValidationError(`Agent with ID ${agentData.id} already exists`);
            }

            // Insert agent into database
            await database.query(
                `INSERT INTO agents (id, type, name, description, service_url, capabilities,
                 configuration, priority, enabled, tags, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'OFFLINE', NOW(), NOW())`,
                [
                    agentData.id,
                    agentData.type,
                    agentData.name || agentData.id,
                    agentData.description || '',
                    agentData.serviceUrl || null,
                    JSON.stringify(agentData.capabilities || {}),
                    JSON.stringify(agentData.configuration || {}),
                    agentData.priority || 0,
                    agentData.enabled !== false,
                    JSON.stringify(agentData.tags || [])
                ]
            );

            // Log the action
            await database.query(
                `SELECT log_agent_action($1, 'CREATED', $2, $3)`,
                [agentData.id, null, JSON.stringify({ type: agentData.type })]
            );

            const response: ApiResponse = {
                success: true,
                data: {
                    id: agentData.id,
                    type: agentData.type,
                    name: agentData.name || agentData.id,
                    status: 'OFFLINE',
                    enabled: agentData.enabled !== false,
                    message: 'Agent configuration created. Agent will become available when it registers via heartbeat.'
                },
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.code(201).send(response);
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            logger.error('Failed to create agent', error as Error);
            throw new PlatformError('Failed to create agent', 'AGENT_CREATE_ERROR', 500);
        }
    });

    // Update agent configuration
    fastify.put('/api/agents/:agentId', { schema: agentUpdateSchema }, async (request, reply) => {
        const { agentId } = request.params as { agentId: string };
        const updates = request.body as any;

        try {
            // Check if agent exists
            const existing = await database.query(
                'SELECT * FROM agents WHERE id = $1',
                [agentId]
            );

            if (existing.rows.length === 0) {
                throw new NotFoundError(`Agent not found: ${agentId}`);
            }

            // Build update query dynamically
            const updateFields: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (updates.name !== undefined) {
                updateFields.push(`name = $${paramIndex++}`);
                values.push(updates.name);
            }
            if (updates.description !== undefined) {
                updateFields.push(`description = $${paramIndex++}`);
                values.push(updates.description);
            }
            if (updates.serviceUrl !== undefined) {
                updateFields.push(`service_url = $${paramIndex++}`);
                values.push(updates.serviceUrl);
            }
            if (updates.capabilities !== undefined) {
                updateFields.push(`capabilities = $${paramIndex++}`);
                values.push(JSON.stringify(updates.capabilities));
            }
            if (updates.configuration !== undefined) {
                updateFields.push(`configuration = $${paramIndex++}`);
                values.push(JSON.stringify(updates.configuration));
            }
            if (updates.priority !== undefined) {
                updateFields.push(`priority = $${paramIndex++}`);
                values.push(updates.priority);
            }
            if (updates.tags !== undefined) {
                updateFields.push(`tags = $${paramIndex++}`);
                values.push(JSON.stringify(updates.tags));
            }

            if (updateFields.length === 0) {
                throw new ValidationError('No valid fields to update');
            }

            updateFields.push(`updated_at = NOW()`);
            values.push(agentId);

            await database.query(
                `UPDATE agents SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
                values
            );

            // Log the action
            await database.query(
                `SELECT log_agent_action($1, 'UPDATED', $2, $3)`,
                [agentId, null, JSON.stringify(updates)]
            );

            // Get updated agent
            const result = await database.query(
                'SELECT * FROM agents WHERE id = $1',
                [agentId]
            );

            const response: ApiResponse = {
                success: true,
                data: result.rows[0],
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ValidationError) {
                throw error;
            }
            logger.error(`Failed to update agent ${agentId}`, error as Error);
            throw new PlatformError(`Failed to update agent: ${agentId}`, 'AGENT_UPDATE_ERROR', 500);
        }
    });

    // Delete agent (soft delete - sets enabled=false)
    fastify.delete('/api/agents/:agentId', async (request, reply) => {
        const { agentId } = request.params as { agentId: string };
        const { hard } = request.query as { hard?: string };

        try {
            const existing = await database.query(
                'SELECT * FROM agents WHERE id = $1',
                [agentId]
            );

            if (existing.rows.length === 0) {
                throw new NotFoundError(`Agent not found: ${agentId}`);
            }

            if (hard === 'true') {
                // Hard delete - remove from database
                await database.query('DELETE FROM agents WHERE id = $1', [agentId]);
                await database.query(
                    `SELECT log_agent_action($1, 'DELETED', $2, $3)`,
                    [agentId, null, JSON.stringify({ hardDelete: true })]
                );
            } else {
                // Soft delete - disable the agent
                await database.query(
                    `UPDATE agents SET enabled = false, status = 'OFFLINE', updated_at = NOW() WHERE id = $1`,
                    [agentId]
                );
                await database.query(
                    `SELECT log_agent_action($1, 'DISABLED', $2, $3)`,
                    [agentId, null, JSON.stringify({ reason: 'deleted' })]
                );
            }

            // Unregister from in-memory registry if present
            try {
                await orchestrator.unregisterAgent(agentId);
            } catch (e) {
                // Agent may not be registered in memory - that's ok
            }

            const response: ApiResponse = {
                success: true,
                data: {
                    message: hard === 'true'
                        ? `Agent ${agentId} permanently deleted`
                        : `Agent ${agentId} disabled`
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
            logger.error(`Failed to delete agent ${agentId}`, error as Error);
            throw new PlatformError(`Failed to delete agent: ${agentId}`, 'AGENT_DELETE_ERROR', 500);
        }
    });

    // Enable agent
    fastify.post('/api/agents/:agentId/enable', async (request, reply) => {
        const { agentId } = request.params as { agentId: string };

        try {
            const existing = await database.query(
                'SELECT * FROM agents WHERE id = $1',
                [agentId]
            );

            if (existing.rows.length === 0) {
                throw new NotFoundError(`Agent not found: ${agentId}`);
            }

            await database.query(
                `UPDATE agents SET enabled = true, updated_at = NOW() WHERE id = $1`,
                [agentId]
            );

            await database.query(
                `SELECT log_agent_action($1, 'ENABLED', $2, $3)`,
                [agentId, null, '{}']
            );

            const response: ApiResponse = {
                success: true,
                data: { message: `Agent ${agentId} enabled`, agentId, enabled: true },
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
            logger.error(`Failed to enable agent ${agentId}`, error as Error);
            throw new PlatformError(`Failed to enable agent: ${agentId}`, 'AGENT_ENABLE_ERROR', 500);
        }
    });

    // Disable agent
    fastify.post('/api/agents/:agentId/disable', async (request, reply) => {
        const { agentId } = request.params as { agentId: string };

        try {
            const existing = await database.query(
                'SELECT * FROM agents WHERE id = $1',
                [agentId]
            );

            if (existing.rows.length === 0) {
                throw new NotFoundError(`Agent not found: ${agentId}`);
            }

            await database.query(
                `UPDATE agents SET enabled = false, updated_at = NOW() WHERE id = $1`,
                [agentId]
            );

            await database.query(
                `SELECT log_agent_action($1, 'DISABLED', $2, $3)`,
                [agentId, null, '{}']
            );

            // Unregister from in-memory registry
            try {
                await orchestrator.unregisterAgent(agentId);
            } catch (e) {
                // May not be registered - that's ok
            }

            const response: ApiResponse = {
                success: true,
                data: { message: `Agent ${agentId} disabled`, agentId, enabled: false },
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
            logger.error(`Failed to disable agent ${agentId}`, error as Error);
            throw new PlatformError(`Failed to disable agent: ${agentId}`, 'AGENT_DISABLE_ERROR', 500);
        }
    });

    // Get agent audit log
    fastify.get('/api/agents/:agentId/audit', async (request, reply) => {
        const { agentId } = request.params as { agentId: string };
        const { limit, offset } = request.query as { limit?: string; offset?: string };

        try {
            const result = await database.query(
                `SELECT * FROM agent_audit_log
                 WHERE agent_id = $1
                 ORDER BY created_at DESC
                 LIMIT $2 OFFSET $3`,
                [agentId, parseInt(limit || '50'), parseInt(offset || '0')]
            );

            const response: ApiResponse = {
                success: true,
                data: result.rows,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0'
                }
            };

            reply.send(response);
        } catch (error) {
            logger.error(`Failed to get agent audit log ${agentId}`, error as Error);
            throw new PlatformError(`Failed to retrieve agent audit log: ${agentId}`, 'AGENT_AUDIT_ERROR', 500);
        }
    });

    // List all agents from database (includes disabled)
    fastify.get('/api/agents/all', async (request, reply) => {
        const { enabled, type } = request.query as { enabled?: string; type?: string };

        try {
            let sql = 'SELECT * FROM agents WHERE 1=1';
            const params: any[] = [];
            let paramIndex = 1;

            if (enabled !== undefined) {
                sql += ` AND enabled = $${paramIndex++}`;
                params.push(enabled === 'true');
            }
            if (type) {
                sql += ` AND type = $${paramIndex++}`;
                params.push(type);
            }

            sql += ' ORDER BY priority DESC, name ASC';

            const result = await database.query(sql, params);

            const response: ApiResponse = {
                success: true,
                data: result.rows,
                meta: {
                    timestamp: new Date(),
                    requestId: request.requestId,
                    version: '1.0.0',
                    total: result.rows.length
                }
            };

            reply.send(response);
        } catch (error) {
            logger.error('Failed to list all agents', error as Error);
            throw new PlatformError('Failed to retrieve agents', 'AGENTS_LIST_ERROR', 500);
        }
    });

    logger.info('Agent CRUD routes registered successfully');
}
