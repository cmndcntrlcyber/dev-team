// Core Types for Dev Team Coordinator Extension

import * as vscode from 'vscode';

// Agent Types
export type AgentId = string;
export type AgentType = 
  | 'ARCHITECTURE_LEAD'
  | 'FRONTEND_CORE'
  | 'FRONTEND_UIUX'
  | 'FRONTEND_VISUALIZATION'
  | 'BACKEND_INTEGRATION'
  | 'QUALITY_ASSURANCE'
  | 'DEVOPS'
  | 'MCP_INTEGRATION';

export type AgentStatus = 
  | 'INITIALIZING'
  | 'READY'
  | 'BUSY'
  | 'BLOCKED'
  | 'ERROR'
  | 'OFFLINE';

export interface AgentCapabilities {
  supportedTaskTypes: TaskType[];
  requiredAPIs: string[];
  skillLevel: 'junior' | 'mid' | 'senior' | 'expert';
  maxConcurrentTasks: number;
  estimatedTaskDuration: Record<TaskType, number>;
}

export interface AgentConfig {
  anthropicApiKey: string;
  tavilyApiKey: string;
  maxRetries: number;
  timeout: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  workingDirectory: string;
}

export interface BaseAgent {
  readonly id: AgentId;
  readonly type: AgentType;
  readonly capabilities: AgentCapabilities;
  readonly status: AgentStatus;
  
  // Core lifecycle methods
  initialize(config: AgentConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  
  // Task execution
  executeTask(task: AgentTask): Promise<TaskResult>;
  canHandleTask(task: AgentTask): boolean;
  getTaskProgress(taskId: string): TaskProgress;
  
  // Communication
  sendMessage(message: AgentMessage): Promise<void>;
  receiveMessage(message: AgentMessage): Promise<AgentResponse>;
  subscribeToTopic(topic: string): void;
  
  // Health and monitoring
  getHealthStatus(): HealthStatus;
  getMetrics(): AgentMetrics;
  getConfiguration(): AgentConfig;
}

// Task Types
export type TaskType = 
  | 'FOUNDATION'
  | 'AGENT_DEVELOPMENT'
  | 'INTEGRATION'
  | 'UI_DEVELOPMENT'
  | 'TESTING'
  | 'DOCUMENTATION'
  | 'DEPLOYMENT';

export type TaskStatus = 
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'REVIEW'
  | 'TESTING'
  | 'COMPLETED'
  | 'DEFERRED';

export type TaskPriority = 
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW';

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: AgentId;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  dependencies: string[];
  blockers: string[];
  estimatedHours: number;
  actualHours?: number;
  tags: string[];
  metadata: Record<string, any>;
}

export interface TaskResult {
  taskId: string;
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  output: any;
  artifacts: string[];
  duration: number;
  errors?: string[];
  warnings?: string[];
  nextSteps?: string[];
}

export interface TaskProgress {
  taskId: string;
  percentage: number;
  currentStep: string;
  timeSpent: number;
  estimatedRemaining: number;
  lastUpdate: Date;
}

// Communication Types
export type MessageType = 
  | 'TASK_ASSIGNMENT'
  | 'STATUS_UPDATE'
  | 'COORDINATION_REQUEST'
  | 'DEPENDENCY_NOTIFICATION'
  | 'QUALITY_GATE_RESULT'
  | 'HUMAN_INPUT_REQUIRED'
  | 'ERROR_REPORT'
  | 'KNOWLEDGE_SHARING';

export type MessagePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AgentMessage {
  id: string;
  type: MessageType;
  sender: AgentId;
  recipient?: AgentId; // undefined for broadcast
  timestamp: Date;
  payload: MessagePayload;
  priority: MessagePriority;
  requiresResponse: boolean;
  correlationId?: string;
}

export interface AgentResponse {
  messageId: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

export type MessagePayload = Record<string, any>;

// Health and Monitoring Types
export interface HealthStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  lastCheck: Date;
  uptime: number;
  issues: string[];
  memoryUsage: number;
  cpuUsage: number;
}

export interface AgentMetrics {
  productivity: ProductivityMetrics;
  quality: QualityMetrics;
  reliability: ReliabilityMetrics;
  coordination: CoordinationMetrics;
}

export interface ProductivityMetrics {
  tasksCompleted: number;
  averageCompletionTime: number;
  velocityTrend: number[];
  estimationAccuracy: number;
}

export interface QualityMetrics {
  codeQualityScore: number;
  testCoverageAchieved: number;
  defectRate: number;
  reworkPercentage: number;
}

export interface ReliabilityMetrics {
  uptime: number;
  errorRate: number;
  responseTime: number;
  successRate: number;
}

export interface CoordinationMetrics {
  communicationEfficiency: number;
  conflictResolutionTime: number;
  dependencyResolutionRate: number;
  collaborationScore: number;
}

// Project and Template Types
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  technologies: string[];
  agents: Record<AgentType, string[]>;
  phases: ProjectPhase[];
  estimatedDuration: number;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ProjectPhase {
  name: string;
  duration: string;
  tasks: string[];
  dependencies: string[];
}

// Configuration Types
export interface ExtensionConfig {
  anthropicApiKey: string;
  tavilyApiKey: string;
  maxConcurrentTasks: number;
  logLevel: string;
  databasePath: string;
  agentTimeout: number;
  enableTelemetry: boolean;
}

// VS Code Integration Types
export interface VSCodeIntegrations {
  workspace: vscode.WorkspaceFolder[];
  terminal: vscode.Terminal;
  outputChannel: vscode.OutputChannel;
  secretStorage: vscode.SecretStorage;
  globalState: vscode.Memento;
  workspaceState: vscode.Memento;
}

// Database Types
export interface DatabaseConnection {
  execute(query: string, params?: any[]): Promise<any>;
  close(): Promise<void>;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  dependencies: string;
  blockers: string;
  estimated_hours: number;
  actual_hours: number | null;
  tags: string;
  metadata: string;
}

// Event Types
export interface ExtensionEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export type EventHandler = (event: ExtensionEvent) => void;

// Error Types
export class DevTeamError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'DevTeamError';
  }
}

// Utility Types
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error, ...args: any[]): void;
}
