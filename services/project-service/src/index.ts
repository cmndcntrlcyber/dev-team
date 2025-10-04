import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { connect } from 'nats';

import { projectRoutes } from './routes/projectRoutes';
import { templateRoutes } from './routes/templateRoutes';
import { fileRoutes } from './routes/fileRoutes';

class ProjectService {
  private fastify: FastifyInstance;
  private database: Pool;
  private redis: any;
  private nats: any;

  constructor() {
    this.fastify = Fastify({
      logger: {
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      },
    });

    // Initialize database connection
    this.database = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.initializeConnections();
    this.registerPlugins();
    this.registerRoutes();
  }

  private async initializeConnections(): Promise<void> {
    try {
      // Redis connection
      this.redis = createClient({ url: process.env.REDIS_URL });
      this.redis.on('error', (err: Error) => this.fastify.log.error(err, 'Redis Client Error'));
      await this.redis.connect();

      // NATS connection
      this.nats = await connect({ servers: process.env.NATS_URL });
      
      this.fastify.log.info('Database and messaging connections initialized');
    } catch (error) {
      this.fastify.log.error(error as Error, 'Failed to initialize connections');
      throw error;
    }
  }

  private async registerPlugins(): Promise<void> {
    await this.fastify.register(helmet);
    await this.fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    await this.fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    await this.fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'dev-secret',
    });

    await this.fastify.register(multipart);

    // Add database and messaging to fastify context
    this.fastify.decorate('db', this.database);
    this.fastify.decorate('redis', this.redis);
    this.fastify.decorate('nats', this.nats);
  }

  private async registerRoutes(): Promise<void> {
    // Health check
    this.fastify.get('/health', async () => {
      try {
        await this.database.query('SELECT 1');
        await this.redis.ping();
        
        return {
          status: 'healthy',
          timestamp: new Date(),
          service: 'project-service',
        };
      } catch (error) {
        throw new Error('Health check failed');
      }
    });

    // Register route modules
    await this.fastify.register(projectRoutes, { prefix: '/api/projects' });
    await this.fastify.register(templateRoutes, { prefix: '/api/templates' });
    await this.fastify.register(fileRoutes, { prefix: '/api/files' });
  }

  async start(): Promise<void> {
    try {
      const port = parseInt(process.env.PORT || '3002', 10);
      const host = process.env.HOST || '0.0.0.0';

      await this.fastify.listen({ port, host });
      this.fastify.log.info(`🚀 Project Service running on http://${host}:${port}`);
    } catch (error) {
      this.fastify.log.error(error as Error, 'Failed to start Project Service');
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    try {
      await this.fastify.close();
      await this.database.end();
      if (this.redis) await this.redis.disconnect();
      if (this.nats) await this.nats.close();
      
      this.fastify.log.info('Project Service stopped gracefully');
    } catch (error) {
      this.fastify.log.error(error as Error, 'Error stopping Project Service');
      throw error;
    }
  }
}

const service = new ProjectService();

process.on('SIGTERM', async () => {
  await service.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await service.stop();
  process.exit(0);
});

if (require.main === module) {
  service.start();
}

export { ProjectService };
