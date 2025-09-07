import { Pool, PoolClient, QueryResult } from 'pg';
import { 
    Logger, 
    AgentTask, 
    Project, 
    HealthStatus, 
    PlatformError,
    TaskRecord,
    ProjectRecord 
} from '../shared';

export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
    maxConnections?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}

export class DatabaseManager {
    private pool: Pool | null = null;
    private logger: Logger;
    private config: DatabaseConfig;
    private isInitialized: boolean = false;

    constructor(connectionString: string, logger: Logger) {
        this.logger = logger;
        this.config = this.parseConnectionString(connectionString);
    }

    async initialize(): Promise<void> {
        try {
            this.logger.info('Initializing Database Manager...');

            this.pool = new Pool({
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
                user: this.config.user,
                password: this.config.password,
                ssl: this.config.ssl,
                max: this.config.maxConnections || 20,
                idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
                connectionTimeoutMillis: this.config.connectionTimeoutMillis || 10000,
            });

            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            this.isInitialized = true;
            this.logger.info('Database Manager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Database Manager', error as Error);
            throw new PlatformError('Database initialization failed', 'DB_INIT_ERROR', 500, { error });
        }
    }

    async close(): Promise<void> {
        if (this.pool) {
            this.logger.info('Closing database connections...');
            await this.pool.end();
            this.pool = null;
            this.isInitialized = false;
            this.logger.info('Database connections closed');
        }
    }

    async healthCheck(): Promise<HealthStatus> {
        const issues: any[] = [];

        try {
            if (!this.pool || !this.isInitialized) {
                issues.push({
                    severity: 'HIGH',
                    message: 'Database connection not initialized',
                    code: 'DB_NOT_INITIALIZED',
                    timestamp: new Date()
                });
            } else {
                // Test query
                const start = Date.now();
                await this.query('SELECT 1');
                const responseTime = Date.now() - start;

                if (responseTime > 1000) {
                    issues.push({
                        severity: 'MEDIUM',
                        message: `Slow database response time: ${responseTime}ms`,
                        code: 'DB_SLOW_RESPONSE',
                        timestamp: new Date()
                    });
                }

                // Check connection pool
                const poolInfo = this.getPoolInfo();
                if (poolInfo.totalCount > (poolInfo.max * 0.8)) {
                    issues.push({
                        severity: 'MEDIUM',
                        message: `High connection pool usage: ${poolInfo.totalCount}/${poolInfo.max}`,
                        code: 'DB_HIGH_CONNECTION_USAGE',
                        timestamp: new Date()
                    });
                }
            }
        } catch (error) {
            issues.push({
                severity: 'HIGH',
                message: `Database health check failed: ${(error as Error).message}`,
                code: 'DB_HEALTH_CHECK_FAILED',
                timestamp: new Date()
            });
        }

        const status = issues.length === 0 ? 'HEALTHY' : 
                      issues.some(i => i.severity === 'HIGH') ? 'UNHEALTHY' : 'DEGRADED';

        return {
            status,
            lastCheck: new Date(),
            uptime: this.isInitialized ? process.uptime() : 0,
            issues,
            systemInfo: {
                memoryUsage: 0,
                cpuUsage: 0,
                activeConnections: this.pool ? this.getPoolInfo().totalCount : 0
            }
        };
    }

    // Task Management Methods
    async createTask(task: AgentTask): Promise<void> {
        const query = `
            INSERT INTO tasks (
                id, title, description, type, priority, status, 
                assigned_to, project_id, created_at, updated_at,
                due_date, dependencies, blockers, estimated_hours,
                tags, metadata
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16
            )
        `;

        const values = [
            task.id,
            task.title,
            task.description,
            task.type,
            task.priority,
            task.status,
            task.assignedTo || null,
            task.projectId || null,
            task.createdAt,
            task.updatedAt,
            task.dueDate || null,
            JSON.stringify(task.dependencies),
            JSON.stringify(task.blockers),
            task.estimatedHours,
            JSON.stringify(task.tags),
            JSON.stringify(task.metadata)
        ];

        try {
            await this.query(query, values);
            this.logger.debug(`Task created in database: ${task.id}`);
        } catch (error) {
            this.logger.error(`Failed to create task ${task.id}`, error as Error);
            throw new PlatformError(
                `Failed to create task: ${task.id}`, 
                'DB_TASK_CREATE_ERROR', 
                500, 
                { taskId: task.id, error }
            );
        }
    }

    async updateTask(task: AgentTask): Promise<void> {
        const query = `
            UPDATE tasks SET 
                title = $2, description = $3, type = $4, priority = $5,
                status = $6, assigned_to = $7, project_id = $8,
                updated_at = $9, started_at = $10, completed_at = $11,
                due_date = $12, dependencies = $13, blockers = $14,
                estimated_hours = $15, actual_hours = $16, tags = $17,
                metadata = $18
            WHERE id = $1
        `;

        const values = [
            task.id,
            task.title,
            task.description,
            task.type,
            task.priority,
            task.status,
            task.assignedTo || null,
            task.projectId || null,
            task.updatedAt,
            task.startedAt || null,
            task.completedAt || null,
            task.dueDate || null,
            JSON.stringify(task.dependencies),
            JSON.stringify(task.blockers),
            task.estimatedHours,
            task.actualHours || null,
            JSON.stringify(task.tags),
            JSON.stringify(task.metadata)
        ];

        try {
            const result = await this.query(query, values);
            if (result.rowCount === 0) {
                throw new PlatformError(
                    `Task not found: ${task.id}`, 
                    'DB_TASK_NOT_FOUND', 
                    404, 
                    { taskId: task.id }
                );
            }
            this.logger.debug(`Task updated in database: ${task.id}`);
        } catch (error) {
            if (error instanceof PlatformError) {
                throw error;
            }
            this.logger.error(`Failed to update task ${task.id}`, error as Error);
            throw new PlatformError(
                `Failed to update task: ${task.id}`, 
                'DB_TASK_UPDATE_ERROR', 
                500, 
                { taskId: task.id, error }
            );
        }
    }

    async getTask(taskId: string): Promise<AgentTask | null> {
        const query = 'SELECT * FROM tasks WHERE id = $1';

        try {
            const result = await this.query(query, [taskId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return this.mapTaskRecordToTask(result.rows[0] as TaskRecord);
        } catch (error) {
            this.logger.error(`Failed to get task ${taskId}`, error as Error);
            throw new PlatformError(
                `Failed to get task: ${taskId}`, 
                'DB_TASK_GET_ERROR', 
                500, 
                { taskId, error }
            );
        }
    }

    async getTasks(filters: {
        status?: string;
        assignedTo?: string;
        projectId?: string;
        type?: string;
        limit?: number;
        offset?: number;
    } = {}): Promise<AgentTask[]> {
        let query = 'SELECT * FROM tasks WHERE 1=1';
        const values: any[] = [];
        let paramIndex = 1;

        if (filters.status) {
            query += ` AND status = $${paramIndex++}`;
            values.push(filters.status);
        }

        if (filters.assignedTo) {
            query += ` AND assigned_to = $${paramIndex++}`;
            values.push(filters.assignedTo);
        }

        if (filters.projectId) {
            query += ` AND project_id = $${paramIndex++}`;
            values.push(filters.projectId);
        }

        if (filters.type) {
            query += ` AND type = $${paramIndex++}`;
            values.push(filters.type);
        }

        query += ' ORDER BY created_at DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramIndex++}`;
            values.push(filters.limit);
        }

        if (filters.offset) {
            query += ` OFFSET $${paramIndex++}`;
            values.push(filters.offset);
        }

        try {
            const result = await this.query(query, values);
            return result.rows.map(row => this.mapTaskRecordToTask(row as TaskRecord));
        } catch (error) {
            this.logger.error('Failed to get tasks', error as Error);
            throw new PlatformError('Failed to get tasks', 'DB_TASKS_GET_ERROR', 500, { error });
        }
    }

    async deleteTask(taskId: string): Promise<void> {
        const query = 'DELETE FROM tasks WHERE id = $1';

        try {
            const result = await this.query(query, [taskId]);
            
            if (result.rowCount === 0) {
                throw new PlatformError(
                    `Task not found: ${taskId}`, 
                    'DB_TASK_NOT_FOUND', 
                    404, 
                    { taskId }
                );
            }

            this.logger.debug(`Task deleted from database: ${taskId}`);
        } catch (error) {
            if (error instanceof PlatformError) {
                throw error;
            }
            this.logger.error(`Failed to delete task ${taskId}`, error as Error);
            throw new PlatformError(
                `Failed to delete task: ${taskId}`, 
                'DB_TASK_DELETE_ERROR', 
                500, 
                { taskId, error }
            );
        }
    }

    // Project Management Methods
    async createProject(project: Project): Promise<void> {
        const query = `
            INSERT INTO projects (
                id, name, description, template_id, status, owner_id,
                team_members, tags, metadata, configuration,
                created_at, updated_at, due_date
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            )
        `;

        const values = [
            project.id,
            project.name,
            project.description,
            project.templateId || null,
            project.status,
            project.ownerId,
            JSON.stringify(project.teamMembers),
            JSON.stringify(project.tags),
            JSON.stringify(project.metadata),
            JSON.stringify(project.configuration),
            project.createdAt,
            project.updatedAt,
            project.dueDate || null
        ];

        try {
            await this.query(query, values);
            this.logger.debug(`Project created in database: ${project.id}`);
        } catch (error) {
            this.logger.error(`Failed to create project ${project.id}`, error as Error);
            throw new PlatformError(
                `Failed to create project: ${project.id}`, 
                'DB_PROJECT_CREATE_ERROR', 
                500, 
                { projectId: project.id, error }
            );
        }
    }

    async updateProject(project: Project): Promise<void> {
        const query = `
            UPDATE projects SET 
                name = $2, description = $3, template_id = $4, status = $5,
                owner_id = $6, team_members = $7, tags = $8, metadata = $9,
                configuration = $10, updated_at = $11, started_at = $12,
                completed_at = $13, due_date = $14
            WHERE id = $1
        `;

        const values = [
            project.id,
            project.name,
            project.description,
            project.templateId || null,
            project.status,
            project.ownerId,
            JSON.stringify(project.teamMembers),
            JSON.stringify(project.tags),
            JSON.stringify(project.metadata),
            JSON.stringify(project.configuration),
            project.updatedAt,
            project.startedAt || null,
            project.completedAt || null,
            project.dueDate || null
        ];

        try {
            const result = await this.query(query, values);
            if (result.rowCount === 0) {
                throw new PlatformError(
                    `Project not found: ${project.id}`, 
                    'DB_PROJECT_NOT_FOUND', 
                    404, 
                    { projectId: project.id }
                );
            }
            this.logger.debug(`Project updated in database: ${project.id}`);
        } catch (error) {
            if (error instanceof PlatformError) {
                throw error;
            }
            this.logger.error(`Failed to update project ${project.id}`, error as Error);
            throw new PlatformError(
                `Failed to update project: ${project.id}`, 
                'DB_PROJECT_UPDATE_ERROR', 
                500, 
                { projectId: project.id, error }
            );
        }
    }

    async getProject(projectId: string): Promise<Project | null> {
        const query = 'SELECT * FROM projects WHERE id = $1';

        try {
            const result = await this.query(query, [projectId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return this.mapProjectRecordToProject(result.rows[0] as ProjectRecord);
        } catch (error) {
            this.logger.error(`Failed to get project ${projectId}`, error as Error);
            throw new PlatformError(
                `Failed to get project: ${projectId}`, 
                'DB_PROJECT_GET_ERROR', 
                500, 
                { projectId, error }
            );
        }
    }

    // Generic query method
    async query(text: string, params?: any[]): Promise<QueryResult> {
        if (!this.pool || !this.isInitialized) {
            throw new PlatformError('Database not initialized', 'DB_NOT_INITIALIZED', 500);
        }

        const client = await this.pool.connect();
        try {
            const start = Date.now();
            const result = await client.query(text, params);
            const duration = Date.now() - start;

            this.logger.debug(`Query executed in ${duration}ms`, { query: text, params });
            return result;
        } finally {
            client.release();
        }
    }

    // Transaction support
    async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        if (!this.pool || !this.isInitialized) {
            throw new PlatformError('Database not initialized', 'DB_NOT_INITIALIZED', 500);
        }

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Private helper methods
    private parseConnectionString(connectionString: string): DatabaseConfig {
        // Parse PostgreSQL connection string
        // Format: postgresql://user:password@host:port/database
        const url = new URL(connectionString);
        
        return {
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            database: url.pathname.slice(1), // Remove leading slash
            user: url.username,
            password: url.password,
            ssl: url.searchParams.get('sslmode') === 'require'
        };
    }

    private getPoolInfo() {
        if (!this.pool) {
            return { totalCount: 0, idleCount: 0, waitingCount: 0, max: 0 };
        }

        return {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount,
            max: (this.pool as any).options?.max || 20
        };
    }

    private mapTaskRecordToTask(record: TaskRecord): AgentTask {
        return {
            id: record.id,
            title: record.title,
            description: record.description,
            type: record.type as any,
            priority: record.priority as any,
            status: record.status as any,
            assignedTo: record.assignedTo || undefined,
            projectId: record.projectId || undefined,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            startedAt: record.startedAt || undefined,
            completedAt: record.completedAt || undefined,
            dueDate: record.dueDate || undefined,
            dependencies: JSON.parse(record.dependencies || '[]'),
            blockers: JSON.parse(record.blockers || '[]'),
            estimatedHours: record.estimatedHours,
            actualHours: record.actualHours || undefined,
            tags: JSON.parse(record.tags || '[]'),
            metadata: JSON.parse(record.metadata || '{}')
        };
    }

    private mapProjectRecordToProject(record: ProjectRecord): Project {
        return {
            id: record.id,
            name: record.name,
            description: record.description,
            templateId: record.templateId || undefined,
            status: record.status as any,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            startedAt: record.startedAt || undefined,
            completedAt: record.completedAt || undefined,
            dueDate: record.dueDate || undefined,
            ownerId: record.ownerId,
            teamMembers: JSON.parse(record.teamMembers || '[]'),
            tags: JSON.parse(record.tags || '[]'),
            metadata: JSON.parse(record.metadata || '{}'),
            configuration: JSON.parse(record.configuration || '{}')
        };
    }
}
