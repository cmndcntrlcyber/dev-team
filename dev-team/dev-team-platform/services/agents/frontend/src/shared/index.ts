// Shared types for Frontend Agent (imported from orchestrator-service)

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
  tavilyApiKey?: string;
  maxRetries: number;
  timeout: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  workingDirectory: string;
  serviceUrl?: string;
  natsUrl?: string;
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
  getTaskProgress(taskId: string): TaskProgress | null;
  
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
  | 'DEPLOYMENT'
  | 'CODE_GENERATION'
  | 'CODE_REVIEW'
  | 'BUG_FIX'
  | 'REFACTORING';

export type TaskStatus = 
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'REVIEW'
  | 'TESTING'
  | 'COMPLETED'
  | 'DEFERRED'
  | 'CANCELLED';

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
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
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
  artifacts: TaskArtifact[];
  duration: number;
  errors?: string[];
  warnings?: string[];
  nextSteps?: string[];
  metrics?: TaskMetrics;
}

export interface TaskArtifact {
  id: string;
  type: 'FILE' | 'CODE' | 'DOCUMENTATION' | 'TEST' | 'CONFIG';
  name: string;
  path: string;
  content?: string;
  size: number;
  mimeType: string;
  createdAt: Date;
}

export interface TaskProgress {
  taskId: string;
  percentage: number;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  timeSpent: number;
  estimatedRemaining: number;
  lastUpdate: Date;
  details?: string[];
}

export interface TaskMetrics {
  complexity: number;
  quality: number;
  testCoverage?: number;
  codeLines: number;
  filesChanged: number;
}

// Communication Types
export type MessageType = 
  | 'TASK_ASSIGNMENT'
  | 'TASK_COMPLETION'
  | 'TASK_UPDATE'
  | 'STATUS_UPDATE'
  | 'COORDINATION_REQUEST'
  | 'DEPENDENCY_NOTIFICATION'
  | 'QUALITY_GATE_RESULT'
  | 'HUMAN_INPUT_REQUIRED'
  | 'ERROR_REPORT'
  | 'KNOWLEDGE_SHARING'
  | 'AGENT_REGISTRATION'
  | 'HEALTH_CHECK'
  | 'WORKFLOW_EVENT';

export type MessagePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AgentMessage {
  id: string;
  type: MessageType;
  sender: AgentId | 'orchestrator' | 'user';
  recipient?: AgentId;
  timestamp: Date;
  payload: MessagePayload;
  priority: MessagePriority;
  requiresResponse: boolean;
  correlationId?: string;
  ttl?: number;
}

export interface AgentResponse {
  messageId: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
  processingTime: number;
}

export type MessagePayload = Record<string, any>;

// Health and Monitoring Types
export interface HealthStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  lastCheck: Date;
  uptime: number;
  issues: HealthIssue[];
  systemInfo: SystemInfo;
}

export interface HealthIssue {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  code: string;
  timestamp: Date;
}

export interface SystemInfo {
  memoryUsage: number;
  cpuUsage: number;
  diskUsage?: number;
  networkLatency?: number;
  activeConnections: number;
}

export interface AgentMetrics {
  productivity: ProductivityMetrics;
  quality: QualityMetrics;
  reliability: ReliabilityMetrics;
  coordination: CoordinationMetrics;
  performance: PerformanceMetrics;
}

export interface ProductivityMetrics {
  tasksCompleted: number;
  tasksInProgress: number;
  averageCompletionTime: number;
  velocityTrend: number[];
  estimationAccuracy: number;
  throughput: number;
}

export interface QualityMetrics {
  codeQualityScore: number;
  testCoverageAchieved: number;
  defectRate: number;
  reworkPercentage: number;
  reviewScore: number;
  complianceScore: number;
}

export interface ReliabilityMetrics {
  uptime: number;
  errorRate: number;
  responseTime: number;
  successRate: number;
  mtbf: number;
  mttr: number;
}

export interface CoordinationMetrics {
  communicationEfficiency: number;
  conflictResolutionTime: number;
  dependencyResolutionRate: number;
  collaborationScore: number;
  knowledgeSharingRate: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  peakResponseTime: number;
  requestsPerSecond: number;
  concurrentTasks: number;
  resourceUtilization: number;
}

// Logger interface
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error, ...args: any[]): void;
}
