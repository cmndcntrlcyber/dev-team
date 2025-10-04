import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { createClient } from 'redis';
import { connect, NatsConnection, StringCodec, JSONCodec } from 'nats';
import pino from 'pino';

class MCPAgentService {
  private fastify: FastifyInstance;
  private config: any;
  private redis: any;
  private nats: NatsConnection | null = null;
  private logger: any;

  constructor() {
    // Use different logging configuration for Docker vs development
    const isDocker = process.env.NODE_ENV === 'production' || process.env.DOCKER === 'true';
    
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      ...(isDocker ? {} : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }),
    });

    this.fastify = Fastify({
      logger: this.logger,
    });

    this.config = {
      port: parseInt(process.env.PORT || '3015', 10),
      host: process.env.HOST || '0.0.0.0',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
    };
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Redis connection
      this.redis = createClient({ url: this.config.redisUrl });
      this.redis.on('error', (err: Error) => this.logger.error('Redis Client Error', err));
      await this.redis.connect();

      // Initialize NATS connection
      this.nats = await connect({ 
        servers: [this.config.natsUrl],
        maxReconnectAttempts: 10,
        reconnectTimeWait: 2000,
      });

      // Register plugins
      await this.registerPlugins();

      // Setup routes
      await this.setupRoutes();

      this.logger.info('MCP Agent Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MCP Agent Service', error);
      throw error;
    }
  }

  private async registerPlugins(): Promise<void> {
    await this.fastify.register(helmet, {
      contentSecurityPolicy: false,
    });

    await this.fastify.register(cors, {
      origin: true,
      credentials: true,
    });
  }

  private async setupRoutes(): Promise<void> {
    this.fastify.get('/health', async (request, reply) => {
      return reply.code(200).send({
        status: 'healthy',
        timestamp: new Date(),
        version: '1.0.0',
        agent: 'MCPAgent',
      });
    });

    this.fastify.get('/status', async (request, reply) => {
      return reply.code(200).send({
        agent: 'MCPAgent',
        status: 'active',
        capabilities: ['MCP Integration', 'Tool Management', 'Protocol Bridging'],
        timestamp: new Date(),
      });
    });
  }

  async start(): Promise<void> {
    try {
      await this.fastify.listen({
        port: this.config.port,
        host: this.config.host,
      });
      
      this.logger.info(`🔗 MCP Agent Service running on http://${this.config.host}:${this.config.port}`);
    } catch (error) {
      this.logger.error('Failed to start MCP Agent Service', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.disconnect();
      }
      
      if (this.nats) {
        await this.nats.close();
      }
      
      await this.fastify.close();
      this.logger.info('MCP Agent Service stopped gracefully');
    } catch (error) {
      this.logger.error('Error stopping MCP Agent Service', error);
      throw error;
    }
  }
}

// Create and start the service
const service = new MCPAgentService();

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await service.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await service.stop();
  process.exit(0);
});

// Start the service if this file is run directly
if (require.main === module) {
  service.initialize().then(() => {
    return service.start();
  }).catch((error) => {
    console.error('Failed to start MCP Agent Service:', error);
    process.exit(1);
  });
}

export { MCPAgentService };
