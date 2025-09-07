import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { createClient } from 'redis';
import { v4 as uuid } from 'uuid';

import { GatewayConfig, ServiceHealth, MetricsData } from './types';
import { authenticationMiddleware, isPublicPath } from './middleware/authentication';

// Basic route configuration
const routeConfig = {
  routes: [
    {
      path: '/api/auth/*',
      service: 'auth-service',
      host: 'http://auth-service:3001',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      auth: false,
      websocket: false
    },
    {
      path: '/api/projects/*',
      service: 'project-service',
      host: 'http://project-service:3002',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      auth: true,
      websocket: false
    },
    {
      path: '/api/tasks/*',
      service: 'task-service',
      host: 'http://task-service:3003',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      auth: true,
      websocket: false
    }
  ],
  publicPaths: [
    '/health',
    '/metrics',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh'
  ]
};

// Simple circuit breaker implementation
class SimpleCircuitBreaker {
  private failures: Map<string, number> = new Map();
  private lastFailure: Map<string, number> = new Map();
  private readonly threshold = 5;
  private readonly resetTimeout = 60000; // 1 minute

  isOpen(service: string): boolean {
    const failures = this.failures.get(service) || 0;
    const lastFailure = this.lastFailure.get(service) || 0;
    
    if (failures >= this.threshold) {
      if (Date.now() - lastFailure > this.resetTimeout) {
        this.failures.set(service, 0);
        return false;
      }
      return true;
    }
    return false;
  }

  recordFailure(service: string): void {
    const current = this.failures.get(service) || 0;
    this.failures.set(service, current + 1);
    this.lastFailure.set(service, Date.now());
  }

  recordSuccess(service: string): void {
    this.failures.set(service, 0);
  }
}

class ApiGateway {
  private fastify: FastifyInstance;
  private config: GatewayConfig;
  private redis: any;
  private circuitBreaker: SimpleCircuitBreaker;
  private metrics: MetricsData;

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

    this.config = {
      port: parseInt(process.env.PORT || '3000', 10),
      host: process.env.HOST || '0.0.0.0',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
      corsOrigins: (process.env.CORS_ORIGINS || '*').split(','),
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      logLevel: process.env.LOG_LEVEL || 'info',
    };
    
    this.metrics = {
      requestsTotal: 0,
      requestsPerSecond: 0,
      averageResponseTime: 0,
      errorRate: 0,
      activeConnections: 0,
      serviceHealth: {},
    };

    this.circuitBreaker = new SimpleCircuitBreaker();
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

      // Register health checks
      await this.registerHealthChecks();

      // Start metrics collection
      this.startMetricsCollection();

      this.fastify.log.info('API Gateway initialized successfully');
    } catch (error) {
      this.fastify.log.error('Failed to initialize API Gateway: %s', (error as Error).message);
      throw error;
    }
  }

  private async registerPlugins(): Promise<void> {
    // Security plugins
    await this.fastify.register(helmet, {
      contentSecurityPolicy: false,
    });

    await this.fastify.register(cors, {
      origin: this.config.corsOrigins,
      credentials: true,
    });

    // Rate limiting
    await this.fastify.register(rateLimit, {
      max: this.config.rateLimitMax,
      timeWindow: this.config.rateLimitWindow,
      redis: this.redis,
      keyGenerator: (request: FastifyRequest) => {
        return (request.headers['x-forwarded-for'] as string) || request.ip;
      },
      skipOnError: true,
    });

    // JWT authentication
    await this.fastify.register(jwt, {
      secret: this.config.jwtSecret,
    });

    // Add request ID to all requests
    this.fastify.addHook('onRequest', async (request, reply) => {
      request.id = uuid();
      reply.header('X-Request-ID', request.id);
      this.metrics.requestsTotal++;
      this.metrics.activeConnections++;
    });

    // Add response time tracking
    this.fastify.addHook('onResponse', async (request, reply) => {
      this.metrics.activeConnections--;
      const responseTime = reply.getResponseTime();
      this.updateAverageResponseTime(responseTime);
      
      if (reply.statusCode >= 400) {
        this.metrics.errorRate = (this.metrics.errorRate + 1) / this.metrics.requestsTotal;
      }
    });
  }

  private async setupRoutes(): Promise<void> {
    // Authentication middleware for protected routes
    this.fastify.addHook('preHandler', async (request, reply) => {
      if (!isPublicPath(request.url, routeConfig.publicPaths)) {
        await authenticationMiddleware(request, reply);
      }
    });

    // Basic proxy routes (simplified version without @fastify/http-proxy)
    for (const route of routeConfig.routes) {
      const routePath = route.path.replace('/*', '/:splat*');
      
      this.fastify.all(routePath, async (request: FastifyRequest<{ Params: { splat?: string } }>, reply: FastifyReply) => {
        try {
          // Check circuit breaker
          if (this.circuitBreaker.isOpen(route.service)) {
            return reply.code(503).send({
              success: false,
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: `Service ${route.service} is currently unavailable`,
              },
            });
          }

          // Basic response for now - this would normally proxy to the actual service
          reply.code(200).send({
            success: true,
            message: `API Gateway received request for ${route.service}`,
            path: request.url,
            service: route.service,
            timestamp: new Date()
          });

        } catch (error) {
          this.circuitBreaker.recordFailure(route.service);
          this.fastify.log.error('Route error: %s', (error as Error).message);
          
          return reply.code(500).send({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error'
            }
          });
        }
      });
    }
  }

  private async registerHealthChecks(): Promise<void> {
    // Gateway health check
    this.fastify.get('/health', async (request, reply) => {
      const health = await this.getGatewayHealth();
      
      if (health.status === 'healthy') {
        return reply.code(200).send(health);
      } else {
        return reply.code(503).send(health);
      }
    });

    // Metrics endpoint
    this.fastify.get('/metrics', async (request, reply) => {
      return reply.code(200).send({
        gateway: this.metrics,
        services: await this.getAllServiceHealth(),
        timestamp: new Date(),
      });
    });

    // Service-specific health checks
    this.fastify.get('/health/:service', async (request: FastifyRequest<{ Params: { service: string } }>, reply) => {
      const { service } = request.params;
      const health = await this.checkServiceHealth(service);
      
      if (health.status === 'healthy') {
        return reply.code(200).send(health);
      } else {
        return reply.code(503).send(health);
      }
    });
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      // Calculate requests per second over the last minute
      // This is a simplified calculation
      this.metrics.requestsPerSecond = this.metrics.requestsTotal / 60;
    }, 60000); // Update every minute
  }

  private updateAverageResponseTime(responseTime: number): void {
    const currentAvg = this.metrics.averageResponseTime;
    const totalRequests = this.metrics.requestsTotal;
    
    this.metrics.averageResponseTime = 
      (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;
  }

  private async checkServiceHealth(service: string): Promise<ServiceHealth> {
    // Basic health check - would normally ping the actual service
    return {
      service,
      status: 'healthy',
      responseTime: 50,
      lastCheck: new Date(),
    };
  }

  private async getGatewayHealth(): Promise<any> {
    try {
      // Check Redis connection
      await this.redis.ping();
      
      // Check service health
      const serviceHealth = await this.getAllServiceHealth();
      const unhealthyServices = Object.values(serviceHealth)
        .filter((service: ServiceHealth) => service.status !== 'healthy');
      
      return {
        status: unhealthyServices.length === 0 ? 'healthy' : 'degraded',
        timestamp: new Date(),
        services: serviceHealth,
        metrics: this.metrics,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async getAllServiceHealth(): Promise<Record<string, ServiceHealth>> {
    const healthChecks: Record<string, ServiceHealth> = {};
    
    for (const route of routeConfig.routes) {
      if (!healthChecks[route.service]) {
        healthChecks[route.service] = await this.checkServiceHealth(route.service);
      }
    }
    
    return healthChecks;
  }

  async start(): Promise<void> {
    try {
      await this.fastify.listen({
        port: this.config.port,
        host: this.config.host,
      });
      
      this.fastify.log.info(`🚀 API Gateway running on http://${this.config.host}:${this.config.port}`);
    } catch (error) {
      this.fastify.log.error('Failed to start API Gateway: %s', (error as Error).message);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.disconnect();
      }
      
      await this.fastify.close();
      this.fastify.log.info('API Gateway stopped gracefully');
    } catch (error) {
      this.fastify.log.error('Error stopping API Gateway: %s', (error as Error).message);
      throw error;
    }
  }
}

// Create and start the gateway
const gateway = new ApiGateway();

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await gateway.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await gateway.stop();
  process.exit(0);
});

// Start the gateway if this file is run directly
if (require.main === module) {
  gateway.initialize().then(() => {
    return gateway.start();
  }).catch((error) => {
    console.error('Failed to start API Gateway:', error);
    process.exit(1);
  });
}

export { ApiGateway };
