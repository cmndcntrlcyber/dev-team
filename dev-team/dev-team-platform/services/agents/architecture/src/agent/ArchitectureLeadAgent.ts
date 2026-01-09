import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import {
  BaseAgent,
  AgentTask,
  TaskResult,
  AgentConfig,
  AgentCapabilities,
  AgentStatus,
  AgentMessage,
  AgentResponse,
  HealthStatus,
  AgentMetrics,
  TaskProgress,
  TaskType,
  ArchitectureDecision,
  TaskBlueprint,
  CodeStandard,
  ArchitectureReview,
  ArchitectureAgentOutput,
  TaskBlueprintSubtask,
} from '@dev-team-platform/types';
import {
  ClaudeCodeExecutor,
  ContextManager,
  getToolsForAgent,
  ExecutionResult,
  AggregatedContext,
} from '@dev-team-platform/claude-code-agent';

/**
 * ArchitectureLeadAgent - Core agent for architectural decisions
 *
 * Responsibilities:
 * - Technology evaluation and selection
 * - System design and architecture decisions
 * - Task decomposition for other agents
 * - Code standard definition
 * - Architecture review of completed work
 *
 * Uses Claude Opus for complex reasoning and decision making.
 */
export class ArchitectureLeadAgent implements BaseAgent {
  readonly id: string;
  readonly type = 'ARCHITECTURE_LEAD' as const;
  name = 'Architecture Lead';

  readonly capabilities: AgentCapabilities = {
    supportedTaskTypes: ['FOUNDATION', 'AGENT_DEVELOPMENT', 'CODE_REVIEW', 'REFACTORING'] as TaskType[],
    requiredAPIs: ['anthropic'],
    skillLevel: 'expert',
    maxConcurrentTasks: 1, // Focus on one architectural decision at a time
    estimatedTaskDuration: {
      FOUNDATION: 180,
      AGENT_DEVELOPMENT: 240,
      CODE_REVIEW: 60,
      REFACTORING: 120,
      // Other task types (not supported, but required by interface)
      INTEGRATION: 0,
      UI_DEVELOPMENT: 0,
      TESTING: 0,
      DOCUMENTATION: 0,
      DEPLOYMENT: 0,
      CODE_GENERATION: 0,
      BUG_FIX: 0,
    },
  };

  status: AgentStatus = 'INITIALIZING';

  private config!: AgentConfig;
  private executor!: ClaudeCodeExecutor;
  private contextManager!: ContextManager;
  private logger: pino.Logger;
  private systemPrompt!: string;
  private taskProgress: Map<string, TaskProgress> = new Map();
  private startTime: number = Date.now();
  private tasksCompleted: number = 0;
  private tasksFailed: number = 0;

  constructor(id?: string) {
    this.id = id || `architecture-lead-${uuidv4().slice(0, 8)}`;
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      name: this.id,
    });
  }

  // ============================================
  // Lifecycle Methods
  // ============================================

  async initialize(config: AgentConfig): Promise<void> {
    this.logger.info('Initializing Architecture Lead Agent');
    this.config = config;

    // Initialize Claude Code executor with Opus model for complex reasoning
    this.executor = new ClaudeCodeExecutor({
      apiKey: config.anthropicApiKey,
      defaultModel: 'claude-opus-4-1-20250805', // Use Opus for architecture decisions
      defaultTimeout: 600000, // 10 minutes for complex decisions
      maxRetries: 3,
      logger: this.logger,
    });

    // Initialize context manager
    if (config.natsUrl) {
      // Extract Redis URL from config or use default
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.contextManager = new ContextManager({
        redisUrl,
        keyPrefix: 'devteam:',
        logger: this.logger,
      });
      await this.contextManager.connect();
    }

    // Load system prompt
    this.systemPrompt = this.getSystemPrompt();

    this.status = 'READY';
    this.logger.info('Architecture Lead Agent initialized successfully');
  }

  async start(): Promise<void> {
    this.logger.info('Starting Architecture Lead Agent');
    this.status = 'READY';
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Architecture Lead Agent');
    this.status = 'OFFLINE';
    if (this.contextManager) {
      await this.contextManager.disconnect();
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  // ============================================
  // Task Execution
  // ============================================

  async executeTask(task: AgentTask): Promise<TaskResult> {
    const startTime = Date.now();
    this.logger.info(`Executing task ${task.id}: ${task.title}`);

    if (this.status !== 'READY') {
      return this.createFailureResult(task, 'Agent is not ready to execute tasks');
    }

    if (!this.canHandleTask(task)) {
      return this.createFailureResult(task, `Cannot handle task type: ${task.type}`);
    }

    this.status = 'BUSY';
    this.initializeTaskProgress(task);

    try {
      // Get context from previous tasks and decisions
      const context = await this.getTaskContext(task);

      // Build the prompt based on task type
      const prompt = this.buildTaskPrompt(task, context);

      // Execute via Claude Code
      const result = await this.executor.execute({
        mode: task.type === 'CODE_REVIEW' ? 'sdk' : 'cli',
        systemPrompt: this.systemPrompt,
        userPrompt: prompt,
        workingDirectory: this.config.workingDirectory || task.metadata?.projectPath || process.cwd(),
        tools: getToolsForAgent('ARCHITECTURE_LEAD'),
        context: {
          architectureDecisions: context.decisions,
          codeStandards: context.standards,
          previousTasks: context.previousTasks,
        },
        projectId: task.projectId,
        model: 'claude-opus-4-1-20250805',
      });

      // Process the result based on task type
      const taskResult = await this.processExecutionResult(task, result, startTime);

      // Store context for future tasks
      await this.storeTaskContext(task, taskResult);

      this.tasksCompleted++;
      this.status = 'READY';

      return taskResult;
    } catch (error) {
      this.tasksFailed++;
      this.status = 'READY';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Task ${task.id} failed: ${errorMessage}`);
      return this.createFailureResult(task, errorMessage, Date.now() - startTime);
    }
  }

  canHandleTask(task: AgentTask): boolean {
    return this.capabilities.supportedTaskTypes.includes(task.type);
  }

  getTaskProgress(taskId: string): TaskProgress | null {
    return this.taskProgress.get(taskId) || null;
  }

  // ============================================
  // Communication
  // ============================================

  async sendMessage(message: AgentMessage): Promise<void> {
    this.logger.debug(`Sending message: ${message.type}`);
    // Implementation depends on NATS integration in the service layer
  }

  async receiveMessage(message: AgentMessage): Promise<AgentResponse> {
    this.logger.debug(`Received message: ${message.type}`);
    return {
      messageId: message.id,
      success: true,
      timestamp: new Date(),
      processingTime: 0,
    };
  }

  subscribeToTopic(topic: string): void {
    this.logger.debug(`Subscribing to topic: ${topic}`);
    // Implementation depends on NATS integration in the service layer
  }

  // ============================================
  // Health and Monitoring
  // ============================================

  getHealthStatus(): HealthStatus {
    return {
      status: this.status === 'ERROR' ? 'UNHEALTHY' : this.status === 'BUSY' ? 'DEGRADED' : 'HEALTHY',
      lastCheck: new Date(),
      uptime: Date.now() - this.startTime,
      issues: [],
      systemInfo: {
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        cpuUsage: 0, // Would need os module
        activeConnections: this.taskProgress.size,
      },
    };
  }

  getMetrics(): AgentMetrics {
    return {
      productivity: {
        tasksCompleted: this.tasksCompleted,
        tasksInProgress: this.taskProgress.size,
        averageCompletionTime: 0,
        velocityTrend: [],
        estimationAccuracy: 0,
        throughput: 0,
      },
      quality: {
        codeQualityScore: 0,
        testCoverageAchieved: 0,
        defectRate: 0,
        reworkPercentage: 0,
        reviewScore: 0,
        complianceScore: 0,
      },
      reliability: {
        uptime: Date.now() - this.startTime,
        errorRate: this.tasksCompleted > 0 ? this.tasksFailed / (this.tasksCompleted + this.tasksFailed) : 0,
        responseTime: 0,
        successRate: this.tasksCompleted > 0 ? this.tasksCompleted / (this.tasksCompleted + this.tasksFailed) : 1,
        mtbf: 0,
        mttr: 0,
      },
      coordination: {
        communicationEfficiency: 0,
        conflictResolutionTime: 0,
        dependencyResolutionRate: 0,
        collaborationScore: 0,
        knowledgeSharingRate: 0,
      },
      performance: {
        averageResponseTime: 0,
        peakResponseTime: 0,
        requestsPerSecond: 0,
        concurrentTasks: this.taskProgress.size,
        resourceUtilization: 0,
      },
    };
  }

  getConfiguration(): AgentConfig {
    return this.config;
  }

  // ============================================
  // Private Methods
  // ============================================

  private getSystemPrompt(): string {
    return `# Architecture Lead Agent

You are the Architecture Lead for the Dev Team Platform, a senior software architect with deep expertise in:
- System design and distributed architectures
- Technology selection and evaluation
- Code quality standards and best practices
- Cross-team coordination and technical leadership

## Core Responsibilities

1. **Technology Decisions**: Evaluate and select frameworks, libraries, and tools based on project requirements
2. **System Design**: Create architecture diagrams, data flow designs, API contracts
3. **Code Standards**: Define and enforce coding standards, patterns, and conventions
4. **Task Decomposition**: Break down high-level requirements into actionable tasks for specialized agents
5. **Quality Gates**: Review architectural decisions and implementations from other agents
6. **Knowledge Sharing**: Document decisions with clear rationale for the team

## Decision-Making Framework

When making architectural decisions:
1. Consider scalability, maintainability, security, and performance
2. Evaluate trade-offs explicitly with pros/cons for each option
3. Ensure alignment with existing patterns in the codebase
4. Document decisions using Architecture Decision Records (ADRs)
5. Consider security implications at every layer
6. Think about developer experience and learning curve
7. Prefer proven, well-maintained technologies over cutting-edge ones

## Output Formats

You produce structured outputs that other agents and the orchestrator can process:

### Architecture Decision (ADR)
\`\`\`json
{
  "type": "DECISION",
  "data": {
    "id": "unique-id",
    "title": "Decision Title",
    "status": "PROPOSED|ACCEPTED|DEPRECATED|SUPERSEDED",
    "context": "Why this decision is needed",
    "decision": "What was decided",
    "consequences": ["consequence1", "consequence2"],
    "alternatives": [
      {
        "option": "Alternative name",
        "pros": ["pro1"],
        "cons": ["con1"],
        "rejected": true,
        "reason": "Why rejected"
      }
    ],
    "affectedAgents": ["FRONTEND_CORE", "BACKEND_INTEGRATION"],
    "affectedAreas": ["api", "database"]
  }
}
\`\`\`

### Task Blueprint (for task decomposition)
\`\`\`json
{
  "type": "BLUEPRINT",
  "data": {
    "id": "unique-id",
    "parentTaskId": "original-task-id",
    "subtasks": [
      {
        "title": "Subtask title",
        "description": "What needs to be done",
        "type": "CODE_GENERATION",
        "assignedAgentType": "BACKEND_INTEGRATION",
        "priority": "HIGH",
        "estimatedHours": 4,
        "dependencies": [],
        "acceptanceCriteria": ["criterion1", "criterion2"]
      }
    ],
    "sequencingStrategy": "DEPENDENCY_GRAPH",
    "criticalPath": ["task1", "task2"],
    "estimatedTotalHours": 20
  }
}
\`\`\`

### Code Standard
\`\`\`json
{
  "type": "STANDARD",
  "data": {
    "id": "unique-id",
    "category": "NAMING|STRUCTURE|PATTERN|TESTING|DOCUMENTATION|SECURITY",
    "language": "TypeScript",
    "framework": "React",
    "rules": [
      {
        "name": "Rule name",
        "description": "What the rule enforces",
        "examples": [
          { "good": "good example", "bad": "bad example" }
        ],
        "severity": "ERROR|WARNING|INFO"
      }
    ],
    "appliesTo": ["src/**/*.tsx"]
  }
}
\`\`\`

### Architecture Review
\`\`\`json
{
  "type": "REVIEW",
  "data": {
    "id": "unique-id",
    "taskId": "reviewed-task-id",
    "reviewerId": "architecture-lead-001",
    "verdict": "APPROVED|CHANGES_REQUESTED|REJECTED",
    "findings": [
      {
        "type": "ISSUE|SUGGESTION|PRAISE",
        "severity": "CRITICAL|MAJOR|MINOR|INFO",
        "location": "src/file.ts:42",
        "description": "What was found",
        "recommendation": "How to fix/improve"
      }
    ],
    "architecturalConcerns": ["concern1"],
    "approvalConditions": ["condition1"],
    "summary": "Overall assessment"
  }
}
\`\`\`

## Agent Collaboration

You coordinate with these specialized agents:
- **FRONTEND_CORE**: React/Vue UI implementation
- **FRONTEND_UIUX**: Styling and user experience
- **BACKEND_INTEGRATION**: APIs, databases, services
- **QUALITY_ASSURANCE**: Testing and code review
- **DEVOPS**: CI/CD, infrastructure, deployment
- **MCP_INTEGRATION**: MCP server development

When decomposing tasks, assign to the appropriate agent based on their specialization.

## Best Practices

1. **Be Thorough**: Analyze requirements completely before proposing solutions
2. **Be Explicit**: Document all assumptions and constraints
3. **Be Practical**: Favor simple solutions over clever ones
4. **Be Forward-Thinking**: Consider future maintenance and scaling
5. **Be Collaborative**: Write clear outputs that other agents can act on
6. **Be Secure**: Always consider security implications

Always respond with valid JSON in one of the output formats above.`;
  }

  private async getTaskContext(task: AgentTask): Promise<AggregatedContext> {
    if (!this.contextManager) {
      return { decisions: [], standards: [], previousTasks: [] };
    }
    return this.contextManager.getContextForTask(task);
  }

  private buildTaskPrompt(task: AgentTask, context: AggregatedContext): string {
    let prompt = `# Task: ${task.title}\n\n`;
    prompt += `**Type**: ${task.type}\n`;
    prompt += `**Priority**: ${task.priority}\n`;
    prompt += `**Description**: ${task.description}\n\n`;

    // Add context
    if (context.decisions.length > 0) {
      prompt += `## Relevant Architecture Decisions\n`;
      for (const decision of context.decisions) {
        prompt += `- **${decision.title}**: ${decision.decision}\n`;
      }
      prompt += '\n';
    }

    if (context.standards.length > 0) {
      prompt += `## Code Standards to Follow\n`;
      for (const standard of context.standards) {
        prompt += `### ${standard.category}\n`;
        for (const rule of standard.rules) {
          prompt += `- ${rule}\n`;
        }
      }
      prompt += '\n';
    }

    if (context.previousTasks.length > 0) {
      prompt += `## Previous Task Results\n`;
      for (const prevTask of context.previousTasks) {
        prompt += `- **${prevTask.title}** (${prevTask.status})\n`;
      }
      prompt += '\n';
    }

    // Add task-specific instructions
    switch (task.type) {
      case 'FOUNDATION':
        prompt += `## Instructions\n`;
        prompt += `Analyze the requirements and produce either:\n`;
        prompt += `1. A Task Blueprint decomposing this into subtasks for specialized agents, OR\n`;
        prompt += `2. An Architecture Decision if this requires a technology/design choice\n`;
        break;

      case 'AGENT_DEVELOPMENT':
        prompt += `## Instructions\n`;
        prompt += `This involves agent development work. Analyze the requirements and produce:\n`;
        prompt += `1. A Task Blueprint with subtasks assigned to appropriate agents\n`;
        prompt += `2. Any necessary Architecture Decisions for the agent design\n`;
        break;

      case 'CODE_REVIEW':
        prompt += `## Instructions\n`;
        prompt += `Review the implementation for architectural soundness. Produce an Architecture Review with:\n`;
        prompt += `- Verdict (APPROVED, CHANGES_REQUESTED, or REJECTED)\n`;
        prompt += `- Specific findings with locations and recommendations\n`;
        prompt += `- Any architectural concerns\n`;
        break;

      case 'REFACTORING':
        prompt += `## Instructions\n`;
        prompt += `Analyze the refactoring requirements. Produce:\n`;
        prompt += `1. An Architecture Decision documenting the refactoring approach\n`;
        prompt += `2. A Task Blueprint with ordered subtasks if complex\n`;
        break;
    }

    // Add metadata if present
    if (task.metadata && Object.keys(task.metadata).length > 0) {
      prompt += `\n## Additional Context\n`;
      prompt += `\`\`\`json\n${JSON.stringify(task.metadata, null, 2)}\n\`\`\`\n`;
    }

    return prompt;
  }

  private async processExecutionResult(
    task: AgentTask,
    result: ExecutionResult,
    startTime: number
  ): Promise<TaskResult> {
    const duration = Date.now() - startTime;

    if (!result.success) {
      return this.createFailureResult(task, result.error || 'Execution failed', duration);
    }

    // Try to parse structured output
    let output: ArchitectureAgentOutput | null = null;

    if (result.structuredOutput) {
      output = result.structuredOutput as ArchitectureAgentOutput;
    } else {
      // Try to extract JSON from the content
      try {
        const jsonMatch = result.content.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          output = JSON.parse(jsonMatch[1]) as ArchitectureAgentOutput;
        }
      } catch {
        // Not valid JSON
      }
    }

    // Store decisions and standards in context
    if (output && this.contextManager) {
      await this.storeOutput(task, output);
    }

    return {
      taskId: task.id,
      status: 'SUCCESS',
      output: output || result.content,
      artifacts: result.artifacts?.map((a) => ({
        id: uuidv4(),
        type: 'DOCUMENTATION' as const,
        name: a.path.split('/').pop() || 'artifact',
        path: a.path,
        size: a.size || 0,
        mimeType: 'application/json',
        createdAt: new Date(),
      })) || [],
      duration,
      warnings: result.warnings,
      metrics: {
        complexity: this.estimateComplexity(task),
        quality: 0,
        codeLines: 0,
        filesChanged: result.artifacts?.length || 0,
      },
    };
  }

  private async storeOutput(task: AgentTask, output: ArchitectureAgentOutput): Promise<void> {
    if (!task.projectId) return;

    switch (output.type) {
      case 'DECISION':
        await this.contextManager.storeArchitectureDecision(task.projectId, {
          id: output.data.id,
          title: output.data.title,
          decision: output.data.decision,
          relevance: 'HIGH',
        });
        break;

      case 'STANDARD':
        await this.contextManager.storeCodeStandard(task.projectId, {
          id: output.data.id,
          category: output.data.category,
          rules: output.data.rules.map((r) => r.description),
        });
        break;
    }
  }

  private async storeTaskContext(task: AgentTask, result: TaskResult): Promise<void> {
    if (!this.contextManager || !task.projectId) return;

    const summary = this.contextManager.buildTaskSummary(
      task,
      result.status,
      typeof result.output === 'string' ? result.output : JSON.stringify(result.output),
      result.artifacts?.map((a) => a.path)
    );

    await this.contextManager.storeTaskSummary(summary);
    await this.contextManager.addProjectTask(task.projectId, task.id);
  }

  private initializeTaskProgress(task: AgentTask): void {
    this.taskProgress.set(task.id, {
      taskId: task.id,
      percentage: 0,
      currentStep: 'Starting',
      totalSteps: 3,
      completedSteps: 0,
      timeSpent: 0,
      estimatedRemaining: task.estimatedHours * 60 * 60 * 1000,
      lastUpdate: new Date(),
    });
  }

  private estimateComplexity(task: AgentTask): number {
    // Simple complexity estimation based on task type
    switch (task.type) {
      case 'FOUNDATION':
        return 8;
      case 'AGENT_DEVELOPMENT':
        return 9;
      case 'CODE_REVIEW':
        return 5;
      case 'REFACTORING':
        return 7;
      default:
        return 5;
    }
  }

  private createFailureResult(task: AgentTask, error: string, duration = 0): TaskResult {
    return {
      taskId: task.id,
      status: 'FAILURE',
      output: null,
      artifacts: [],
      duration,
      errors: [error],
    };
  }
}
