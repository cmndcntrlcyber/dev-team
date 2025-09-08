import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { createClient } from 'redis';
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
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Redis connection
      this.redis = createClient({ url: this.config.redisUrl });
      this.redis.on('error', (err: Error) => {
        this.fastify.log.error('Redis Client Error: %s', err.message);
      });
      await this.redis.connect();

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
    this.fastify.get('/tasks', async () => {
      return {
        success: true,
        data: [],
        message: 'Task service is running',
      };
    });

    this.fastify.post('/tasks', async (request: any) => {
      return {
        success: true,
        data: { id: uuid(), ...request.body },
        message: 'Task created successfully',
      };
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
