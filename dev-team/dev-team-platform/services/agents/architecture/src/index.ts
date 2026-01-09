import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { createClient, RedisClientType } from 'redis';
import { connect, NatsConnection, JSONCodec, Subscription } from 'nats';
import pino from 'pino';
import { ArchitectureLeadAgent } from './agent/ArchitectureLeadAgent';
import {
  AgentTask,
  AgentConfig,
  TaskResult,
  AgentMessage,
  MessageType,
} from '@dev-team-platform/types';

interface ServiceConfig {
  port: number;
  host: string;
  redisUrl: string;
  natsUrl: string;
  anthropicApiKey: string;
  workingDirectory: string;
}

class ArchitectureAgentService {
  private fastify: FastifyInstance;
  private config: ServiceConfig;
  private redis: RedisClientType | null = null;
  private nats: NatsConnection | null = null;
  private logger: pino.Logger;
  private agent: ArchitectureLeadAgent;
  private subscriptions: Subscription[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private jsonCodec = JSONCodec<any>();

  constructor() {
    // Use different logging configuration for Docker vs development
    const isDocker = process.env.NODE_ENV === 'production' || process.env.DOCKER === 'true';

    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      ...(isDocker
        ? {}
        : {
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
      port: parseInt(process.env.PORT || '3010', 10),
      host: process.env.HOST || '0.0.0.0',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
      workingDirectory: process.env.WORKING_DIRECTORY || process.cwd(),
    };

    // Create the agent instance
    this.agent = new ArchitectureLeadAgent();
  }

  async initialize(): Promise<void> {
    try {
      // Validate required config
      if (!this.config.anthropicApiKey) {
        this.logger.warn('ANTHROPIC_API_KEY not set - agent will not be able to execute tasks');
      }

      // Initialize Redis connection
      this.redis = createClient({ url: this.config.redisUrl }) as RedisClientType;
      this.redis.on('error', (err: Error) => this.logger.error('Redis Client Error', err));
      await this.redis.connect();

      // Initialize NATS connection
      this.nats = await connect({
        servers: [this.config.natsUrl],
        maxReconnectAttempts: -1, // Infinite retries
        reconnectTimeWait: 2000,
      });

      this.logger.info('Connected to NATS');

      // Initialize the agent
      const agentConfig: AgentConfig = {
        anthropicApiKey: this.config.anthropicApiKey,
        maxRetries: 3,
        timeout: 600000, // 10 minutes
        logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
        workingDirectory: this.config.workingDirectory,
        natsUrl: this.config.natsUrl,
      };

      await this.agent.initialize(agentConfig);

      // Register plugins
      await this.registerPlugins();

      // Setup routes
      await this.setupRoutes();

      // Setup NATS subscriptions
      await this.setupNatsSubscriptions();

      // Register with orchestrator
      await this.registerWithOrchestrator();

      // Start heartbeat
      this.startHeartbeat();

      this.logger.info('Architecture Agent Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Architecture Agent Service', error);
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
    this.fastify.addHook('onRequest', async (request) => {
      this.logger.debug(`${request.method} ${request.url}`);
    });
  }

  private async setupRoutes(): Promise<void> {
    // Health check endpoint
    this.fastify.get('/health', async (_request, reply) => {
      try {
        const healthStatus = this.agent.getHealthStatus();
        const redisHealthy = await this.checkRedisHealth();
        const natsHealthy = this.nats?.isClosed() === false;

        const health = {
          status: healthStatus.status === 'HEALTHY' && redisHealthy && natsHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date(),
          version: '1.0.0',
          agent: {
            id: this.agent.id,
            type: this.agent.type,
            status: this.agent.status,
          },
          dependencies: {
            redis: redisHealthy ? 'connected' : 'disconnected',
            nats: natsHealthy ? 'connected' : 'disconnected',
          },
          uptime: healthStatus.uptime,
        };

        return reply.code(health.status === 'healthy' ? 200 : 503).send(health);
      } catch (error) {
        return reply.code(503).send({
          status: 'unhealthy',
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Status endpoint with capabilities
    this.fastify.get('/status', async (_request, reply) => {
      return reply.code(200).send({
        agent: {
          id: this.agent.id,
          type: this.agent.type,
          name: this.agent.name,
          status: this.agent.status,
        },
        capabilities: this.agent.capabilities,
        metrics: this.agent.getMetrics(),
        timestamp: new Date(),
      });
    });

    // Execute task endpoint (for manual task submission)
    this.fastify.post<{ Body: AgentTask }>('/execute', async (request, reply) => {
      try {
        const task = request.body;

        if (!task.id || !task.type || !task.title) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid task: missing required fields (id, type, title)',
          });
        }

        if (!this.agent.canHandleTask(task)) {
          return reply.code(400).send({
            success: false,
            error: `Agent cannot handle task type: ${task.type}`,
            supportedTypes: this.agent.capabilities.supportedTaskTypes,
          });
        }

        this.logger.info(`Received manual task execution request: ${task.id}`);

        // Execute the task
        const result = await this.agent.executeTask(task);

        // Publish result to NATS
        await this.publishTaskResult(task.id, result);

        return reply.code(200).send({
          success: true,
          result,
        });
      } catch (error) {
        this.logger.error('Failed to execute task', error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Get task progress
    this.fastify.get<{ Params: { taskId: string } }>('/tasks/:taskId/progress', async (request, reply) => {
      const progress = this.agent.getTaskProgress(request.params.taskId);

      if (!progress) {
        return reply.code(404).send({
          success: false,
          error: 'Task not found or not in progress',
        });
      }

      return reply.code(200).send({
        success: true,
        progress,
      });
    });

    // Get agent metrics
    this.fastify.get('/metrics', async (_request, reply) => {
      return reply.code(200).send(this.agent.getMetrics());
    });
  }

  private async setupNatsSubscriptions(): Promise<void> {
    if (!this.nats) {
      this.logger.warn('NATS not connected, skipping subscriptions');
      return;
    }

    // Subscribe to task assignments for this agent
    const taskSub = this.nats.subscribe(`agent.${this.agent.id}.tasks`);
    this.subscriptions.push(taskSub);

    // Also subscribe to the architecture agent type topic
    const typeSub = this.nats.subscribe('agent.architecture.tasks');
    this.subscriptions.push(typeSub);

    // Process task messages
    this.processTaskSubscription(taskSub);
    this.processTaskSubscription(typeSub);

    this.logger.info(`Subscribed to NATS topics: agent.${this.agent.id}.tasks, agent.architecture.tasks`);
  }

  private async processTaskSubscription(subscription: Subscription): Promise<void> {
    for await (const msg of subscription) {
      try {
        const message = this.jsonCodec.decode(msg.data) as AgentMessage;

        if (message.type === 'TASK_ASSIGNMENT') {
          const task = message.payload as AgentTask;
          this.logger.info(`Received task assignment: ${task.id} - ${task.title}`);

          // Execute the task
          const result = await this.agent.executeTask(task);

          // Publish the result
          await this.publishTaskResult(task.id, result);

          // Reply if required
          if (msg.reply) {
            this.nats?.publish(msg.reply, this.jsonCodec.encode({
              success: true,
              taskId: task.id,
              result,
            }));
          }
        }
      } catch (error) {
        this.logger.error('Error processing NATS message', error);
      }
    }
  }

  private async publishTaskResult(taskId: string, result: TaskResult): Promise<void> {
    if (!this.nats) return;

    // Publish to task completion topic
    const completionMessage: AgentMessage = {
      id: `${taskId}-result`,
      type: 'TASK_COMPLETION' as MessageType,
      sender: this.agent.id,
      timestamp: new Date(),
      payload: {
        taskId,
        result,
      },
      priority: 'HIGH',
      requiresResponse: false,
    };

    this.nats.publish('task.complete', this.jsonCodec.encode(completionMessage));
    this.logger.info(`Published task completion for: ${taskId}`);
  }

  private async registerWithOrchestrator(): Promise<void> {
    if (!this.nats) return;

    const registrationMessage: AgentMessage = {
      id: `${this.agent.id}-registration`,
      type: 'AGENT_REGISTRATION' as MessageType,
      sender: this.agent.id,
      timestamp: new Date(),
      payload: {
        agentId: this.agent.id,
        agentType: this.agent.type,
        name: this.agent.name,
        capabilities: this.agent.capabilities,
        status: this.agent.status,
        serviceUrl: `http://${this.config.host}:${this.config.port}`,
      },
      priority: 'HIGH',
      requiresResponse: false,
    };

    this.nats.publish('agent.register', this.jsonCodec.encode(registrationMessage));
    this.logger.info('Registered with orchestrator');
  }

  private startHeartbeat(): void {
    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(async () => {
      if (!this.nats) return;

      const heartbeatMessage: AgentMessage = {
        id: `${this.agent.id}-heartbeat-${Date.now()}`,
        type: 'HEALTH_CHECK' as MessageType,
        sender: this.agent.id,
        timestamp: new Date(),
        payload: {
          agentId: this.agent.id,
          status: this.agent.status,
          health: this.agent.getHealthStatus(),
          metrics: this.agent.getMetrics(),
        },
        priority: 'LOW',
        requiresResponse: false,
      };

      this.nats.publish('agent.heartbeat', this.jsonCodec.encode(heartbeatMessage));
    }, 30000);
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      if (!this.redis) return false;
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  async start(): Promise<void> {
    try {
      await this.agent.start();

      await this.fastify.listen({
        port: this.config.port,
        host: this.config.host,
      });

      this.logger.info(
        `🏗️  Architecture Agent Service running on http://${this.config.host}:${this.config.port}`
      );
    } catch (error) {
      this.logger.error('Failed to start Architecture Agent Service', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      // Unsubscribe from NATS
      for (const sub of this.subscriptions) {
        sub.unsubscribe();
      }

      // Stop agent
      await this.agent.stop();

      // Close connections
      if (this.redis) {
        await this.redis.disconnect();
      }

      if (this.nats) {
        await this.nats.close();
      }

      await this.fastify.close();
      this.logger.info('Architecture Agent Service stopped gracefully');
    } catch (error) {
      this.logger.error('Error stopping Architecture Agent Service', error);
      throw error;
    }
  }
}

// Create and start the service
const service = new ArchitectureAgentService();

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
  service
    .initialize()
    .then(() => {
      return service.start();
    })
    .catch((error) => {
      console.error('Failed to start Architecture Agent Service:', error);
      process.exit(1);
    });
}

export { ArchitectureAgentService };
