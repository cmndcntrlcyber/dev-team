import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { createClient } from 'redis';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';

interface TaskServiceConfig {
  port: number;
  host: string;
  databaseUrl: string;
  redisUrl: string;
  natsUrl: string;
  jwtSecret: string;
  logLevel: string;
}

class TaskService {
  private fastify: any;
  private config: TaskServiceConfig;
  private redis: any;
  private database: Pool;

  constructor() {
    this.fastify = Fastify({
      logger: process.env.NODE_ENV === 'development' ? {
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      } : {
        level: process.env.LOG_LEVEL || 'info',
      },
    });

    this.config = {
      port: parseInt(process.env.PORT || '3003', 10),
      host: process.env.HOST || '0.0.0.0',
      databaseUrl: process.env.DATABASE_URL || '',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
      jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
      logLevel: process.env.LOG_LEVEL || 'info',
    };

    // Initialize database pool
    this.database = new Pool({
      connectionString: this.config.databaseUrl,
    });
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Redis connection
      this.redis = createClient({ url: this.config.redisUrl });
      this.redis.on('error', (err: Error) => {
        this.fastify.log.error('Redis Client Error: %s', err.message);
      });
      await this.redis.connect();

      // Test database connection
      await this.database.query('SELECT 1');
      this.fastify.log.info('Database connection established');

      // Register plugins
      await this.registerPlugins();

      // Setup routes
      await this.setupRoutes();

      this.fastify.log.info('Task Service initialized successfully');
    } catch (error) {
      this.fastify.log.error('Failed to initialize Task Service: %s', (error as Error).message);
      throw error;
    }
  }

  private async registerPlugins(): Promise<void> {
    // Security plugins
    await this.fastify.register(helmet, {
      contentSecurityPolicy: false,
    });

    await this.fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    // Rate limiting
    await this.fastify.register(rateLimit, {
      max: 100,
      timeWindow: 60000,
      redis: this.redis,
      skipOnError: true,
    });

    // JWT authentication
    await this.fastify.register(jwt, {
      secret: this.config.jwtSecret,
    });

    // Add request ID to all requests
    this.fastify.addHook('onRequest', async (request: any, reply: any) => {
      request.id = uuid();
      reply.header('X-Request-ID', request.id);
    });
  }

  private async setupRoutes(): Promise<void> {
    // Health check endpoint
    this.fastify.get('/health', async () => {
      return {
        status: 'healthy',
        timestamp: new Date(),
        service: 'task-service',
      };
    });

    // Basic task routes
    this.fastify.get('/tasks', async (request: any) => {
      try {
        const { projectId, status, priority, assignedTo } = request.query;

        let query = 'SELECT * FROM tasks';
        const conditions: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (projectId) {
          conditions.push(`project_id = $${paramIndex++}`);
          values.push(projectId);
        }
        if (status) {
          conditions.push(`status = $${paramIndex++}`);
          values.push(status);
        }
        if (priority) {
          conditions.push(`priority = $${paramIndex++}`);
          values.push(priority);
        }
        if (assignedTo) {
          conditions.push(`assigned_to = $${paramIndex++}`);
          values.push(assignedTo);
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        const result = await this.database.query(query, values);

        return {
          success: true,
          data: result.rows,
          meta: { total: result.rows.length },
        };
      } catch (error) {
        this.fastify.log.error('Failed to fetch tasks:', error);
        return {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tasks' },
        };
      }
    });

    this.fastify.post('/tasks', async (request: any, reply: any) => {
      const body = request.body as {
        title: string;
        description?: string;
        type?: string;
        priority?: string;
        projectId?: string;
        assignedTo?: string;
        dueDate?: string;
        tags?: string[];
        metadata?: Record<string, unknown>;
      };

      // Validate required fields
      if (!body.title || body.title.trim() === '') {
        return reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Task title is required' },
        });
      }

      // Validate type if provided
      const validTypes = ['FOUNDATION', 'AGENT_DEVELOPMENT', 'INTEGRATION', 'UI_DEVELOPMENT', 'TESTING', 'DOCUMENTATION', 'DEPLOYMENT', 'CODE_GENERATION', 'CODE_REVIEW', 'BUG_FIX', 'REFACTORING'];
      const taskType = body.type || 'CODE_GENERATION';
      if (!validTypes.includes(taskType)) {
        return reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `Invalid task type. Must be one of: ${validTypes.join(', ')}` },
        });
      }

      try {
        const taskId = uuid();

        const result = await this.database.query(
          `INSERT INTO tasks (id, title, description, type, priority, status, project_id, assigned_to, due_date, tags, metadata)
           VALUES ($1, $2, $3, $4, $5, 'NOT_STARTED', $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            taskId,
            body.title.trim(),
            body.description || '',
            taskType,
            body.priority || 'MEDIUM',
            body.projectId || null,
            body.assignedTo || null,
            body.dueDate ? new Date(body.dueDate) : null,
            JSON.stringify(body.tags || []),
            JSON.stringify(body.metadata || {}),
          ]
        );

        return reply.code(201).send({
          success: true,
          data: result.rows[0],
          message: 'Task created successfully',
        });
      } catch (error) {
        this.fastify.log.error('Failed to create task:', error);
        return reply.code(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to create task' },
        });
      }
    });
  }

  async start(): Promise<void> {
    try {
      await this.fastify.listen({
        port: this.config.port,
        host: this.config.host,
      });
      
      this.fastify.log.info(`🚀 Task Service running on http://${this.config.host}:${this.config.port}`);
    } catch (error) {
      this.fastify.log.error('Failed to start Task Service: %s', (error as Error).message);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.disconnect();
      }

      if (this.database) {
        await this.database.end();
      }

      await this.fastify.close();
      this.fastify.log.info('Task Service stopped gracefully');
    } catch (error) {
      this.fastify.log.error('Error stopping Task Service: %s', (error as Error).message);
      throw error;
    }
  }
}

// Create and start the service
const taskService = new TaskService();

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await taskService.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await taskService.stop();
  process.exit(0);
});

// Start the service if this file is run directly
if (require.main === module) {
  taskService.initialize().then(() => {
    return taskService.start();
  }).catch((error) => {
    console.error('Failed to start Task Service:', error);
    process.exit(1);
  });
}

export { TaskService };
