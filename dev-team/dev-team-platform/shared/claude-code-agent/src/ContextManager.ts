import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { AgentTask } from '@dev-team-platform/types';
import {
  ContextManagerConfig,
  TaskContext,
  TaskSummary,
  ArchitectureDecisionRef,
  CodeStandardRef,
  AggregatedContext,
  Logger,
} from './types';

/**
 * ContextManager - Redis-based context sharing for inter-agent communication
 *
 * Manages:
 * - Task context storage and retrieval
 * - Architecture decisions per project
 * - Code standards per project
 * - Task summaries for handoffs between agents
 */
export class ContextManager {
  private redis: RedisClientType;
  private config: Required<ContextManagerConfig>;
  private logger: Logger;
  private connected: boolean = false;

  // Redis key prefixes
  private readonly KEY_TASK_CONTEXT = 'task:context:';
  private readonly KEY_PROJECT_DECISIONS = 'project:decisions:';
  private readonly KEY_PROJECT_STANDARDS = 'project:standards:';
  private readonly KEY_PROJECT_TASKS = 'project:tasks:';
  private readonly KEY_TASK_SUMMARY = 'task:summary:';

  constructor(config: ContextManagerConfig) {
    this.config = {
      redisUrl: config.redisUrl,
      keyPrefix: config.keyPrefix || 'devteam:',
      defaultTtl: config.defaultTtl || 86400, // 24 hours
      logger: config.logger || pino({ level: 'info' }),
    };

    this.logger = this.config.logger;
    this.redis = createClient({ url: this.config.redisUrl });

    // Set up error handling
    this.redis.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });

    this.redis.on('connect', () => {
      this.connected = true;
      this.logger.info('Connected to Redis');
    });

    this.redis.on('disconnect', () => {
      this.connected = false;
      this.logger.warn('Disconnected from Redis');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.connected) {
      await this.redis.connect();
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.redis.disconnect();
    }
  }

  /**
   * Build a full Redis key with prefix
   */
  private key(suffix: string): string {
    return `${this.config.keyPrefix}${suffix}`;
  }

  // ============================================
  // Task Context Management
  // ============================================

  /**
   * Store task context after completion
   */
  async storeTaskContext(taskId: string, context: TaskContext): Promise<void> {
    const key = this.key(`${this.KEY_TASK_CONTEXT}${taskId}`);
    await this.redis.setEx(
      key,
      this.config.defaultTtl,
      JSON.stringify(context)
    );
    this.logger.debug(`Stored context for task ${taskId}`);
  }

  /**
   * Retrieve task context
   */
  async getTaskContext(taskId: string): Promise<TaskContext | null> {
    const key = this.key(`${this.KEY_TASK_CONTEXT}${taskId}`);
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as TaskContext;
  }

  /**
   * Store a task summary (used for handoffs)
   */
  async storeTaskSummary(summary: TaskSummary): Promise<void> {
    const key = this.key(`${this.KEY_TASK_SUMMARY}${summary.taskId}`);
    await this.redis.setEx(
      key,
      this.config.defaultTtl,
      JSON.stringify(summary)
    );
    this.logger.debug(`Stored summary for task ${summary.taskId}`);
  }

  /**
   * Get a task summary
   */
  async getTaskSummary(taskId: string): Promise<TaskSummary | null> {
    const key = this.key(`${this.KEY_TASK_SUMMARY}${taskId}`);
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as TaskSummary;
  }

  // ============================================
  // Architecture Decisions
  // ============================================

  /**
   * Store an architecture decision for a project
   */
  async storeArchitectureDecision(
    projectId: string,
    decision: ArchitectureDecisionRef
  ): Promise<void> {
    const key = this.key(`${this.KEY_PROJECT_DECISIONS}${projectId}`);

    // Get existing decisions
    const existing = await this.getArchitectureDecisions(projectId);

    // Add or update the decision
    const updated = existing.filter((d) => d.id !== decision.id);
    updated.push(decision);

    await this.redis.setEx(
      key,
      this.config.defaultTtl * 7, // Decisions last longer (7 days)
      JSON.stringify(updated)
    );

    this.logger.info(`Stored architecture decision ${decision.id} for project ${projectId}`);
  }

  /**
   * Get all architecture decisions for a project
   */
  async getArchitectureDecisions(projectId: string): Promise<ArchitectureDecisionRef[]> {
    const key = this.key(`${this.KEY_PROJECT_DECISIONS}${projectId}`);
    const data = await this.redis.get(key);
    if (!data) return [];
    return JSON.parse(data) as ArchitectureDecisionRef[];
  }

  /**
   * Get relevant architecture decisions for a task
   * Filters by relevance based on task type and content
   */
  async getRelevantDecisions(
    projectId: string,
    taskType?: string,
    keywords?: string[]
  ): Promise<ArchitectureDecisionRef[]> {
    const decisions = await this.getArchitectureDecisions(projectId);

    if (!taskType && !keywords?.length) {
      return decisions;
    }

    // Filter by relevance (simple keyword matching)
    return decisions.filter((decision) => {
      if (keywords?.length) {
        const decisionText = `${decision.title} ${decision.decision}`.toLowerCase();
        return keywords.some((kw) => decisionText.includes(kw.toLowerCase()));
      }
      return true;
    });
  }

  // ============================================
  // Code Standards
  // ============================================

  /**
   * Store code standards for a project
   */
  async storeCodeStandard(
    projectId: string,
    standard: CodeStandardRef
  ): Promise<void> {
    const key = this.key(`${this.KEY_PROJECT_STANDARDS}${projectId}`);

    // Get existing standards
    const existing = await this.getCodeStandards(projectId);

    // Add or update the standard
    const updated = existing.filter((s) => s.id !== standard.id);
    updated.push(standard);

    await this.redis.setEx(
      key,
      this.config.defaultTtl * 30, // Standards last even longer (30 days)
      JSON.stringify(updated)
    );

    this.logger.info(`Stored code standard ${standard.id} for project ${projectId}`);
  }

  /**
   * Get all code standards for a project
   */
  async getCodeStandards(projectId: string): Promise<CodeStandardRef[]> {
    const key = this.key(`${this.KEY_PROJECT_STANDARDS}${projectId}`);
    const data = await this.redis.get(key);
    if (!data) return [];
    return JSON.parse(data) as CodeStandardRef[];
  }

  /**
   * Get standards for a specific category
   */
  async getStandardsByCategory(
    projectId: string,
    category: string
  ): Promise<CodeStandardRef[]> {
    const standards = await this.getCodeStandards(projectId);
    return standards.filter((s) => s.category === category);
  }

  // ============================================
  // Project Task Tracking
  // ============================================

  /**
   * Add a task to the project's task list
   */
  async addProjectTask(projectId: string, taskId: string): Promise<void> {
    const key = this.key(`${this.KEY_PROJECT_TASKS}${projectId}`);
    await this.redis.sAdd(key, taskId);
    await this.redis.expire(key, this.config.defaultTtl * 7);
  }

  /**
   * Get all task IDs for a project
   */
  async getProjectTaskIds(projectId: string): Promise<string[]> {
    const key = this.key(`${this.KEY_PROJECT_TASKS}${projectId}`);
    return this.redis.sMembers(key);
  }

  /**
   * Get task summaries for a project
   */
  async getProjectTaskSummaries(projectId: string): Promise<TaskSummary[]> {
    const taskIds = await this.getProjectTaskIds(projectId);
    const summaries: TaskSummary[] = [];

    for (const taskId of taskIds) {
      const summary = await this.getTaskSummary(taskId);
      if (summary) {
        summaries.push(summary);
      }
    }

    // Sort by completion date
    return summaries.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  }

  // ============================================
  // Context Aggregation
  // ============================================

  /**
   * Get aggregated context for a task
   * Combines architecture decisions, code standards, and previous task summaries
   */
  async getContextForTask(task: AgentTask): Promise<AggregatedContext> {
    const projectId = task.projectId;

    if (!projectId) {
      return {
        decisions: [],
        standards: [],
        previousTasks: [],
      };
    }

    // Get all relevant context in parallel
    const [decisions, standards, previousTasks] = await Promise.all([
      this.getRelevantDecisions(projectId, task.type, task.tags),
      this.getCodeStandards(projectId),
      this.getPreviousTaskSummaries(task),
    ]);

    return {
      decisions,
      standards,
      previousTasks,
    };
  }

  /**
   * Get summaries of previous tasks that this task depends on
   */
  private async getPreviousTaskSummaries(task: AgentTask): Promise<TaskSummary[]> {
    const summaries: TaskSummary[] = [];

    // Get summaries for explicit dependencies
    if (task.dependencies?.length) {
      for (const depId of task.dependencies) {
        const summary = await this.getTaskSummary(depId);
        if (summary) {
          summaries.push(summary);
        }
      }
    }

    // Also get recent project tasks for context
    if (task.projectId) {
      const projectSummaries = await this.getProjectTaskSummaries(task.projectId);
      // Add up to 5 recent tasks that aren't already included
      for (const summary of projectSummaries.slice(0, 5)) {
        if (!summaries.find((s) => s.taskId === summary.taskId)) {
          summaries.push(summary);
        }
      }
    }

    return summaries;
  }

  /**
   * Build a context object from a completed task result
   */
  buildTaskSummary(
    task: AgentTask,
    status: 'SUCCESS' | 'FAILURE' | 'PARTIAL',
    output?: string,
    artifacts?: string[]
  ): TaskSummary {
    return {
      taskId: task.id,
      type: task.type,
      title: task.title,
      status,
      output,
      artifacts,
      completedAt: new Date(),
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Clear all context for a project
   */
  async clearProjectContext(projectId: string): Promise<void> {
    const keys = [
      this.key(`${this.KEY_PROJECT_DECISIONS}${projectId}`),
      this.key(`${this.KEY_PROJECT_STANDARDS}${projectId}`),
      this.key(`${this.KEY_PROJECT_TASKS}${projectId}`),
    ];

    // Get all task IDs and clear their contexts too
    const taskIds = await this.getProjectTaskIds(projectId);
    for (const taskId of taskIds) {
      keys.push(this.key(`${this.KEY_TASK_CONTEXT}${taskId}`));
      keys.push(this.key(`${this.KEY_TASK_SUMMARY}${taskId}`));
    }

    if (keys.length > 0) {
      await this.redis.del(keys);
    }

    this.logger.info(`Cleared all context for project ${projectId}`);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }
}
