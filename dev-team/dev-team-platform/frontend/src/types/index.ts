// Agent Types
export type AgentStatus = 'online' | 'offline' | 'error' | 'idle' | 'pending' | 'active';

export type AgentType =
  | 'ARCHITECTURE_LEAD'
  | 'FRONTEND_CORE'
  | 'FRONTEND_UIUX'
  | 'BACKEND_INTEGRATION'
  | 'QUALITY_ASSURANCE'
  | 'QA'
  | 'DEVOPS'
  | 'MCP_INTEGRATION';

export type AgentProvider = 'anthropic' | 'burp' | 'local' | 'openai';

export interface AgentLoopConfig {
  partner?: string;
  maxIterations?: number;
  exitCondition?: string;
}

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  agentType: AgentProvider;
  status: AgentStatus;
  endpoint?: string;
  lastPing?: string;
  lastActive?: string;
  created?: string;
  createdAt?: string;
  currentTask?: string;
  progress?: number;
  customPrompt?: string;
  loopConfig?: AgentLoopConfig;
  capabilities?: string[];
  order?: number;
}

// Project Types
export type ProjectStatus =
  | 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'archived'
  | 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;
  ownerId?: string;
  teamMembers?: string[];
  tags?: string[];
  progress?: number;
  tasks?: number;
  repository?: string;
  framework?: string;
  language?: string;
}

// Task Types
export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'review' | 'testing' | 'completed' | 'cancelled';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskType = 'feature' | 'bug' | 'refactor' | 'documentation' | 'test' | 'chore';

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  dependencies?: string[];
  blockers?: string[];
  tags?: string[];
}

// User Types
export type UserRole = 'admin' | 'manager' | 'developer' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
}

// Dashboard Stats
export interface AgentStats {
  totalAgents: number;
  onlineAgents: number;
  errorAgents: number;
  offlineAgents: number;
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
}

export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
