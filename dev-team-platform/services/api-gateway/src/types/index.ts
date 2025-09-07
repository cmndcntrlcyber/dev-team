import { FastifyRequest } from 'fastify';

export interface ServiceRoute {
  path: string;
  service: string;
  host: string;
  methods: string[];
  auth: boolean;
  rateLimit?: number;
  timeout?: number;
  websocket?: boolean;
}

export interface RouteConfig {
  routes: ServiceRoute[];
  publicPaths: string[];
}

export interface GatewayConfig {
  port: number;
  host: string;
  redisUrl: string;
  jwtSecret: string;
  corsOrigins: string[];
  rateLimitWindow: number;
  rateLimitMax: number;
  logLevel: string;
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

export interface UserPayload {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface JWTPayload {
  userId?: string;
  sub?: string;
  email?: string;
  role?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export type AuthenticatedRequest = FastifyRequest & {
  user?: UserPayload;
};

export interface ProxyOptions {
  upstream: string;
  prefix: string;
  rewritePrefix?: string;
  websocket?: boolean;
  preHandler?: any;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  keyGenerator?: (req: FastifyRequest) => string;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export interface LoadBalancerConfig {
  strategy: 'round-robin' | 'least-connections' | 'weighted';
  healthCheck: {
    interval: number;
    timeout: number;
    unhealthyThreshold: number;
    healthyThreshold: number;
  };
}

export interface MetricsData {
  requestsTotal: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  activeConnections: number;
  serviceHealth: Record<string, ServiceHealth>;
}

export interface ServiceDiscovery {
  registerService(name: string, host: string, port: number): Promise<void>;
  unregisterService(name: string): Promise<void>;
  discoverServices(): Promise<Record<string, string>>;
  healthCheck(service: string): Promise<ServiceHealth>;
}
