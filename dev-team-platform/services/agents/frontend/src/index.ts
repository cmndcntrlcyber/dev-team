import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { createClient } from 'redis';
import { connect, NatsConnection, StringCodec, JSONCodec } from 'nats';
import pino from 'pino';

import { FrontendCoreAgent } from './agent/FrontendCoreAgent';
import { ComponentGenerator } from './generators/componentGenerator';
import { StyleGenerator } from './styling/styleGenerator';
import { StateGenerator } from './state/stateGenerator';
import { AnthropicClient } from './ai/anthropicClient';
import { AgentTask } from './shared';

interface FrontendAgentConfig {
  port: number;
  host: string;
  redisUrl: string;
  natsUrl: string;
  anthropicApiKey: string;
  logLevel: string;
}

class FrontendAgentService {
  private fastify: FastifyInstance;
  private config: FrontendAgentConfig;
  private redis: any;
  private nats: NatsConnection | null = null;
  private logger: any;
  private agent: FrontendCoreAgent;
  private componentGenerator: ComponentGenerator;
  private styleGenerator: StyleGenerator;
  private stateGenerator: StateGenerator;
  private aiClient: AnthropicClient;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    });

    this.fastify = Fastify({
      logger: this.logger,
    });

    this.config = {
      port: parseInt(process.env.PORT || '3001', 10),
      host: process.env.HOST || '0.0.0.0',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
      logLevel: process.env.LOG_LEVEL || 'info',
    };

    // Initialize AI client
    this.aiClient = new AnthropicClient(this.logger);

    // Initialize generators
    this.componentGenerator = new ComponentGenerator(this.aiClient, this.logger);
    this.styleGenerator = new StyleGenerator(this.aiClient, this.logger);
    this.stateGenerator = new StateGenerator(this.aiClient, this.logger);

    // Initialize core agent
    this.agent = new FrontendCoreAgent(this.logger);
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

      // Initialize agent
      const agentConfig = {
        anthropicApiKey: this.config.anthropicApiKey,
        maxRetries: 3,
        timeout: 30000,
        logLevel: 'info' as const,
        workingDirectory: './workspace'
      };
      await this.agent.initialize(agentConfig);

      // Setup message handlers
      await this.setupMessageHandlers();

      this.logger.info('Frontend Agent Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Frontend Agent Service', error);
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

    // Add request logging
    this.fastify.addHook('onRequest', async (request, reply) => {
      this.logger.info(`${request.method} ${request.url}`);
    });
  }

  private async setupRoutes(): Promise<void> {
    // Health check endpoint
    this.fastify.get('/health', async (request, reply) => {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date(),
          version: '1.0.0',
          dependencies: {
            redis: await this.checkRedisHealth(),
            nats: this.nats?.isClosed() === false,
            anthropic: this.aiClient ? 'connected' : 'disconnected',
          },
        };
        
        return reply.code(200).send(health);
      } catch (error) {
        return reply.code(503).send({
          status: 'unhealthy',
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Agent status endpoint
    this.fastify.get('/status', async (request, reply) => {
      return reply.code(200).send({
        agent: 'FrontendCoreAgent',
        status: 'active',
        capabilities: [
          'React component generation',
          'Vue component generation', 
          'Angular component generation',
          'CSS/SCSS styling',
          'State management',
          'Code refactoring',
        ],
        timestamp: new Date(),
      });
    });

    // Manual task execution endpoint
    this.fastify.post('/execute', async (request, reply) => {
      try {
        const task = request.body as any;
        const result = await this.agent.executeTask(task);
        
        return reply.code(200).send({
          success: true,
          result,
          timestamp: new Date(),
        });
      } catch (error) {
        this.logger.error('Task execution failed', error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
      }
    });
  }

  private async setupMessageHandlers(): Promise<void> {
    if (!this.nats) {
      throw new Error('NATS connection not established');
    }

    const sc = StringCodec();
    const jc = JSONCodec();

    // Subscribe to frontend agent tasks
    const subscription = this.nats.subscribe('agent.frontend.tasks');
    
    (async () => {
      for await (const message of subscription) {
        try {
          const task = jc.decode(message.data) as AgentTask;
          this.logger.info('Received task', { task });
          
          const result = await this.agent.executeTask(task);
          
          // Send response back
          if (message.reply) {
            this.nats?.publish(message.reply, jc.encode({
              success: true,
              result,
              timestamp: new Date(),
            }));
          }
          
          // Publish completion notification
          this.nats?.publish('agent.frontend.completed', jc.encode({
            taskId: task.id,
            result,
            timestamp: new Date(),
          }));
          
        } catch (error) {
          this.logger.error('Error processing task', error);
          
          if (message.reply) {
            this.nats?.publish(message.reply, jc.encode({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date(),
            }));
          }
        }
      }
    })();

    this.logger.info('Message handlers setup complete');
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  async start(): Promise<void> {
    try {
      await this.fastify.listen({
        port: this.config.port,
        host: this.config.host,
      });
      
      this.logger.info(`🎨 Frontend Agent Service running on http://${this.config.host}:${this.config.port}`);
    } catch (error) {
      this.logger.error('Failed to start Frontend Agent Service', error);
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
      this.logger.info('Frontend Agent Service stopped gracefully');
    } catch (error) {
      this.logger.error('Error stopping Frontend Agent Service', error);
      throw error;
    }
  }
}

// Create and start the service
const service = new FrontendAgentService();

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
    console.error('Failed to start Frontend Agent Service:', error);
    process.exit(1);
  });
}

export { FrontendAgentService };
