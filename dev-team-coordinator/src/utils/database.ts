import * as sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { DatabaseConnection, TaskRecord, AgentTask, TaskStatus, TaskPriority, TaskType } from '../types';
import { Logger } from '../types';

export class DatabaseManager implements DatabaseConnection {
    private db: sqlite3.Database | null = null;
    private logger?: Logger;

    constructor(private dbPath: string, logger?: Logger) {
        this.logger = logger;
    }

    async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    this.logger?.error('Failed to open database', err);
                    reject(err);
                    return;
                }

                this.logger?.info(`Database opened at ${this.dbPath}`);
                this.createTables()
                    .then(() => resolve())
                    .catch(reject);
            });
        });
    }

    private async createTables(): Promise<void> {
        const createTasksTable = `
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL,
                priority TEXT NOT NULL,
                status TEXT NOT NULL,
                assigned_to TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                due_date TEXT,
                dependencies TEXT,
                blockers TEXT,
                estimated_hours REAL NOT NULL DEFAULT 0,
                actual_hours REAL,
                tags TEXT,
                metadata TEXT
            )
        `;

        const createAgentsTable = `
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                status TEXT NOT NULL,
                capabilities TEXT,
                config TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_active TEXT
            )
        `;

        const createProjectsTable = `
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                template_id TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                metadata TEXT
            )
        `;

        const createMessagesTable = `
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                sender TEXT NOT NULL,
                recipient TEXT,
                timestamp TEXT NOT NULL,
                payload TEXT,
                priority TEXT NOT NULL,
                requires_response INTEGER DEFAULT 0,
                correlation_id TEXT,
                processed INTEGER DEFAULT 0
            )
        `;

        await this.execute(createTasksTable);
        await this.execute(createAgentsTable);
        await this.execute(createProjectsTable);
        await this.execute(createMessagesTable);

        this.logger?.info('Database tables created successfully');
    }

    async execute(query: string, params?: any[]): Promise<any> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            if (query.trim().toUpperCase().startsWith('SELECT')) {
                this.db.all(query, params || [], (err, rows) => {
                    if (err) {
                        this.logger?.error('Database query error', err);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            } else {
                this.db.run(query, params || [], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes, lastID: this.lastID });
                    }
                });
            }
        });
    }

    async close(): Promise<void> {
        if (!this.db) {
            return;
        }

        return new Promise((resolve, reject) => {
            this.db!.close((err) => {
                if (err) {
                    this.logger?.error('Error closing database', err);
                    reject(err);
                } else {
                    this.logger?.info('Database connection closed');
                    this.db = null;
                    resolve();
                }
            });
        });
    }

    // Task Management Methods
    async createTask(task: AgentTask): Promise<void> {
        const query = `
            INSERT INTO tasks (
                id, title, description, type, priority, status, assigned_to,
                created_at, updated_at, due_date, dependencies, blockers,
                estimated_hours, actual_hours, tags, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            task.id,
            task.title,
            task.description,
            task.type,
            task.priority,
            task.status,
            task.assignedTo || null,
            task.createdAt.toISOString(),
            task.updatedAt.toISOString(),
            task.dueDate?.toISOString() || null,
            JSON.stringify(task.dependencies),
            JSON.stringify(task.blockers),
            task.estimatedHours,
            task.actualHours || null,
            JSON.stringify(task.tags),
            JSON.stringify(task.metadata)
        ];

        await this.execute(query, params);
        this.logger?.info(`Task created: ${task.id} - ${task.title}`);
    }

    async updateTask(taskId: string, updates: Partial<AgentTask>): Promise<void> {
        const fields: string[] = [];
        const params: any[] = [];

        if (updates.title) {
            fields.push('title = ?');
            params.push(updates.title);
        }
        if (updates.description) {
            fields.push('description = ?');
            params.push(updates.description);
        }
        if (updates.status) {
            fields.push('status = ?');
            params.push(updates.status);
        }
        if (updates.assignedTo !== undefined) {
            fields.push('assigned_to = ?');
            params.push(updates.assignedTo);
        }
        if (updates.priority) {
            fields.push('priority = ?');
            params.push(updates.priority);
        }
        if (updates.actualHours !== undefined) {
            fields.push('actual_hours = ?');
            params.push(updates.actualHours);
        }
        if (updates.dependencies) {
            fields.push('dependencies = ?');
            params.push(JSON.stringify(updates.dependencies));
        }
        if (updates.blockers) {
            fields.push('blockers = ?');
            params.push(JSON.stringify(updates.blockers));
        }
        if (updates.metadata) {
            fields.push('metadata = ?');
            params.push(JSON.stringify(updates.metadata));
        }

        fields.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(taskId);

        const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
        await this.execute(query, params);
        
        this.logger?.info(`Task updated: ${taskId}`);
    }

    async getTask(taskId: string): Promise<AgentTask | null> {
        const query = 'SELECT * FROM tasks WHERE id = ?';
        const rows = await this.execute(query, [taskId]) as TaskRecord[];
        
        if (rows.length === 0) {
            return null;
        }

        return this.taskRecordToTask(rows[0]);
    }

    async getTasks(filters?: {
        status?: TaskStatus;
        assignedTo?: string;
        type?: TaskType;
        priority?: TaskPriority;
    }): Promise<AgentTask[]> {
        let query = 'SELECT * FROM tasks';
        const params: any[] = [];
        const conditions: string[] = [];

        if (filters?.status) {
            conditions.push('status = ?');
            params.push(filters.status);
        }
        if (filters?.assignedTo) {
            conditions.push('assigned_to = ?');
            params.push(filters.assignedTo);
        }
        if (filters?.type) {
            conditions.push('type = ?');
            params.push(filters.type);
        }
        if (filters?.priority) {
            conditions.push('priority = ?');
            params.push(filters.priority);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        const rows = await this.execute(query, params) as TaskRecord[];
        return rows.map(row => this.taskRecordToTask(row));
    }

    async deleteTask(taskId: string): Promise<void> {
        const query = 'DELETE FROM tasks WHERE id = ?';
        await this.execute(query, [taskId]);
        this.logger?.info(`Task deleted: ${taskId}`);
    }

    private taskRecordToTask(record: TaskRecord): AgentTask {
        return {
            id: record.id,
            title: record.title,
            description: record.description,
            type: record.type as TaskType,
            priority: record.priority as TaskPriority,
            status: record.status as TaskStatus,
            assignedTo: record.assigned_to || undefined,
            createdAt: new Date(record.created_at),
            updatedAt: new Date(record.updated_at),
            dueDate: record.due_date ? new Date(record.due_date) : undefined,
            dependencies: JSON.parse(record.dependencies || '[]'),
            blockers: JSON.parse(record.blockers || '[]'),
            estimatedHours: record.estimated_hours,
            actualHours: record.actual_hours || undefined,
            tags: JSON.parse(record.tags || '[]'),
            metadata: JSON.parse(record.metadata || '{}')
        };
    }

    // Agent Management Methods
    async updateAgentStatus(agentId: string, status: string): Promise<void> {
        const query = `
            INSERT OR REPLACE INTO agents (id, type, status, updated_at, last_active)
            VALUES (?, 'UNKNOWN', ?, ?, ?)
        `;
        const now = new Date().toISOString();
        await this.execute(query, [agentId, status, now, now]);
    }

    async getAgentStatus(agentId: string): Promise<string | null> {
        const query = 'SELECT status FROM agents WHERE id = ?';
        const rows = await this.execute(query, [agentId]);
        return rows.length > 0 ? rows[0].status : null;
    }

    // Project Management Methods
    async createProject(id: string, name: string, templateId: string): Promise<void> {
        const query = `
            INSERT INTO projects (id, name, template_id, status, created_at, updated_at)
            VALUES (?, ?, ?, 'ACTIVE', ?, ?)
        `;
        const now = new Date().toISOString();
        await this.execute(query, [id, name, templateId, now, now]);
        this.logger?.info(`Project created: ${id} - ${name}`);
    }

    // Message Management Methods
    async saveMessage(message: any): Promise<void> {
        const query = `
            INSERT INTO messages (
                id, type, sender, recipient, timestamp, payload, 
                priority, requires_response, correlation_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            message.id,
            message.type,
            message.sender,
            message.recipient || null,
            message.timestamp.toISOString(),
            JSON.stringify(message.payload),
            message.priority,
            message.requiresResponse ? 1 : 0,
            message.correlationId || null
        ];

        await this.execute(query, params);
    }

    async getUnprocessedMessages(agentId: string): Promise<any[]> {
        const query = `
            SELECT * FROM messages 
            WHERE (recipient = ? OR recipient IS NULL) 
            AND processed = 0 
            ORDER BY timestamp ASC
        `;
        
        const rows = await this.execute(query, [agentId]);
        return rows.map((row: any) => ({
            ...row,
            timestamp: new Date(row.timestamp),
            payload: JSON.parse(row.payload),
            requiresResponse: row.requires_response === 1
        }));
    }

    async markMessageProcessed(messageId: string): Promise<void> {
        const query = 'UPDATE messages SET processed = 1 WHERE id = ?';
        await this.execute(query, [messageId]);
    }
}
