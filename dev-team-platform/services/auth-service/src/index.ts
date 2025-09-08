import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import oauth2 from '@fastify/oauth2';
import { Pool } from 'pg';
import { createClient } from 'redis';

import { authRoutes } from './routes/authRoutes';
import { userRoutes } from './routes/userRoutes';
import { oauthRoutes } from './routes/oauthRoutes';
import { AuthService } from './services/AuthService';
import { UserService } from './services/UserService';
import { EmailService } from './services/EmailService';

class AuthenticationService {
  private fastify: FastifyInstance;
  private database: Pool;
  private redis: any;
  private authService!: AuthService;
  private userService!: UserService;
  private emailService!: EmailService;

  constructor() {
    // Use different logging configuration for Docker vs development
    const isDocker = process.env.NODE_ENV === 'production' || process.env.DOCKER === 'true';
    
    this.fastify = Fastify({
      logger: isDocker ? {
        level: process.env.LOG_LEVEL || 'info',
      } : {
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

    this.initializeServices();
    this.registerPlugins();
    this.registerRoutes();
  }

  private async initializeServices(): Promise<void> {
    try {
      // Redis connection for sessions and caching
      this.redis = createClient({ url: process.env.REDIS_URL });
      this.redis.on('error', (err: Error) => {
        this.fastify.log.error('Redis Client Error: %s', err.message);
      });
      await this.redis.connect();

      // Initialize core services
      this.authService = new AuthService(this.database, this.redis, this.fastify.log);
      this.userService = new UserService(this.database, this.fastify.log);
      this.emailService = new EmailService(this.fastify.log);

      this.fastify.log.info('Authentication service initialized');
    } catch (error) {
      this.fastify.log.error('Failed to initialize authentication service: %s', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async registerPlugins(): Promise<void> {
    // Security plugins
    await this.fastify.register(helmet);
    
    await this.fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    // Rate limiting - more restrictive for auth endpoints
    await this.fastify.register(rateLimit, {
      max: 50, // 50 requests per minute
      timeWindow: '1 minute',
      keyGenerator: (request: any) => {
        return request.headers['x-forwarded-for'] as string || request.ip;
      },
      skipOnError: true,
    });

    // JWT configuration
    await this.fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
      sign: {
        algorithm: 'HS256',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m', // Short access token
      },
    });

    // OAuth2 providers
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      await this.fastify.register(oauth2, {
        name: 'github',
        scope: ['user:email'],
        credentials: {
          client: {
            id: process.env.GITHUB_CLIENT_ID,
            secret: process.env.GITHUB_CLIENT_SECRET,
          },
          auth: oauth2.GITHUB_CONFIGURATION,
        },
        startRedirectPath: '/oauth/github',
        callbackUri: `${process.env.BASE_URL || 'http://localhost:3004'}/oauth/github/callback`,
      });
    }

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      await this.fastify.register(oauth2, {
        name: 'google',
        scope: ['profile', 'email'],
        credentials: {
          client: {
            id: process.env.GOOGLE_CLIENT_ID,
            secret: process.env.GOOGLE_CLIENT_SECRET,
          },
          auth: oauth2.GOOGLE_CONFIGURATION,
        },
        startRedirectPath: '/oauth/google',
        callbackUri: `${process.env.BASE_URL || 'http://localhost:3004'}/oauth/google/callback`,
      });
    }

    // Decorate fastify with services
    this.fastify.decorate('db', this.database);
    this.fastify.decorate('redis', this.redis);
    this.fastify.decorate('authService', this.authService);
    this.fastify.decorate('userService', this.userService);
    this.fastify.decorate('emailService', this.emailService);
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
          service: 'auth-service',
        };
      } catch (error) {
        throw new Error('Health check failed');
      }
    });

    // Authentication routes
    await this.fastify.register(authRoutes, { prefix: '/api/auth' });
    await this.fastify.register(userRoutes, { prefix: '/api/users' });
    await this.fastify.register(oauthRoutes, { prefix: '/oauth' });

    // Public endpoint for token verification (used by API Gateway)
    this.fastify.post('/api/verify', async (request, reply) => {
      try {
        const { token } = request.body as { token: string };
        
        if (!token) {
          return reply.code(400).send({
            success: false,
            error: { code: 'MISSING_TOKEN', message: 'Token is required' }
          });
        }

        const decoded = this.fastify.jwt.verify(token) as any;
        const userId = decoded.userId || decoded.sub || decoded.id;
        const user = await this.userService.getUserById(userId);
        
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: { code: 'USER_NOT_FOUND', message: 'User not found' }
          });
        }

        return reply.send({
          success: true,
          data: {
            userId: user.id,
            email: user.email,
            role: user.role,
            permissions: user.permissions
          }
        });
      } catch (error) {
        return reply.code(401).send({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
        });
      }
    });
  }

  async start(): Promise<void> {
    try {
      const port = parseInt(process.env.PORT || '3004', 10);
      const host = process.env.HOST || '0.0.0.0';

      await this.fastify.listen({ port, host });
      this.fastify.log.info(`🔐 Authentication Service running on http://${host}:${port}`);
    } catch (error) {
      this.fastify.log.error('Failed to start Authentication Service: %s', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    try {
      await this.fastify.close();
      await this.database.end();
      if (this.redis) await this.redis.disconnect();
      
      this.fastify.log.info('Authentication Service stopped gracefully');
    } catch (error) {
      this.fastify.log.error('Error stopping Authentication Service: %s', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

const service = new AuthenticationService();

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

export { AuthenticationService };
