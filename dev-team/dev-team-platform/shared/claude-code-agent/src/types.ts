import { AgentType, TaskType, AgentTask, TaskResult } from '@dev-team-platform/types';

/**
 * Execution mode for Claude Code
 * - 'cli': Full tool access via Claude Code CLI subprocess
 * - 'sdk': Quick queries via Anthropic SDK (coordination, reviews)
 */
export type ExecutionMode = 'cli' | 'sdk';

/**
 * Options for Claude Code execution
 */
export interface ExecutionOptions {
  /** Execution mode - CLI for heavy tasks, SDK for coordination */
  mode: ExecutionMode;

  /** System prompt defining agent role and capabilities */
  systemPrompt: string;

  /** User prompt/task description */
  userPrompt: string;

  /** Working directory for file operations */
  workingDirectory: string;

  /** Allowed tools for this execution */
  tools?: ToolPermission[];

  /** Maximum execution time in milliseconds */
  timeout?: number;

  /** Model to use (defaults to claude-sonnet-4-20250514) */
  model?: string;

  /** Maximum tokens for response */
  maxTokens?: number;

  /** Additional context from previous tasks */
  context?: TaskContext;

  /** Project ID for context retrieval */
  projectId?: string;
}

/**
 * Result from Claude Code execution
 */
export interface ExecutionResult {
  /** Whether execution succeeded */
  success: boolean;

  /** Response content from Claude */
  content: string;

  /** Structured output (if JSON was requested) */
  structuredOutput?: Record<string, unknown>;

  /** Files created or modified during execution */
  artifacts?: ExecutionArtifact[];

  /** Execution duration in milliseconds */
  duration: number;

  /** Token usage statistics */
  tokenUsage?: TokenUsage;

  /** Error message if execution failed */
  error?: string;

  /** Warnings generated during execution */
  warnings?: string[];
}

/**
 * File artifact from execution
 */
export interface ExecutionArtifact {
  path: string;
  operation: 'created' | 'modified' | 'deleted';
  content?: string;
  size?: number;
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Tool permission configuration
 */
export interface ToolPermission {
  /** Tool name (Read, Write, Edit, Bash, Glob, Grep, etc.) */
  name: string;

  /** Whether the tool is enabled */
  enabled: boolean;

  /** Restrictions on tool usage */
  restrictions?: ToolRestrictions;
}

/**
 * Restrictions on tool usage
 */
export interface ToolRestrictions {
  /** Allowed file patterns (for file tools) */
  allowedPaths?: string[];

  /** Blocked file patterns */
  blockedPaths?: string[];

  /** Allowed commands (for Bash) */
  allowedCommands?: string[];

  /** Blocked commands */
  blockedCommands?: string[];

  /** Read-only mode */
  readOnly?: boolean;
}

/**
 * Task context for inter-agent communication
 */
export interface TaskContext {
  /** Parent task ID if this is a subtask */
  parentTaskId?: string;

  /** Previous tasks in the workflow */
  previousTasks?: TaskSummary[];

  /** Architecture decisions relevant to this task */
  architectureDecisions?: ArchitectureDecisionRef[];

  /** Code standards to follow */
  codeStandards?: CodeStandardRef[];

  /** Custom context data */
  data?: Record<string, unknown>;
}

/**
 * Summary of a completed task for context
 */
export interface TaskSummary {
  taskId: string;
  type: TaskType;
  title: string;
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  output?: string;
  artifacts?: string[];
  completedAt: Date;
}

/**
 * Reference to an architecture decision
 */
export interface ArchitectureDecisionRef {
  id: string;
  title: string;
  decision: string;
  relevance: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Reference to a code standard
 */
export interface CodeStandardRef {
  id: string;
  category: string;
  rules: string[];
}

/**
 * Configuration for Claude Code Executor
 */
export interface ClaudeCodeExecutorConfig {
  /** Anthropic API key */
  apiKey: string;

  /** Default model to use */
  defaultModel?: string;

  /** Default timeout in milliseconds */
  defaultTimeout?: number;

  /** Maximum retries on failure */
  maxRetries?: number;

  /** Retry delay in milliseconds */
  retryDelay?: number;

  /** Path to Claude Code CLI binary */
  cliPath?: string;

  /** Logger instance */
  logger?: Logger;
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Context Manager configuration
 */
export interface ContextManagerConfig {
  /** Redis connection URL */
  redisUrl: string;

  /** Key prefix for context data */
  keyPrefix?: string;

  /** Default TTL for context data in seconds */
  defaultTtl?: number;

  /** Logger instance */
  logger?: Logger;
}

/**
 * Aggregated context for a task
 */
export interface AggregatedContext {
  /** Project-level context */
  project?: {
    id: string;
    name: string;
    framework: string;
    language: string;
  };

  /** Architecture decisions */
  decisions: ArchitectureDecisionRef[];

  /** Code standards */
  standards: CodeStandardRef[];

  /** Previous task summaries */
  previousTasks: TaskSummary[];

  /** Custom context data */
  custom?: Record<string, unknown>;
}

/**
 * Tool configuration by agent type
 */
export type AgentToolConfig = Record<AgentType, ToolPermission[]>;
