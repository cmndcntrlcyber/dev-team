// Minimal shared types to get the service running
export type AgentId = string;
export type TaskType = 'FOUNDATION' | 'AGENT_DEVELOPMENT' | 'INTEGRATION' | 'UI_DEVELOPMENT' | 'TESTING';

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: string;
  assignedTo?: AgentId;
  createdAt: Date;
}

export interface AgentMessage {
  id: string;
  type: string;
  sender: AgentId | 'orchestrator' | 'user';
  timestamp: Date;
  payload: any;
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error, ...args: any[]): void;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
}

export interface PlatformConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  nodeEnv: string;
  corsOrigins: string[];
  rateLimit: RateLimitConfig;
  jwtSecret: string;
  databaseUrl: string;
  natsUrl: string;
  redisUrl: string;
  anthropicApiKey: string;
  tavilyApiKey?: string;
  maxConcurrentTasks: number;
  agentTimeout: number;
  enableTelemetry: boolean;
  enableMonitoring: boolean;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
}

export interface BaseAgent {
  id: AgentId;
  type: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
}

export class PlatformError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}
