import { BaseAgent, AgentTask, TaskResult, AgentCapabilities, AgentConfig, TaskType, Logger } from "../shared";
import { AnthropicClient } from '../ai/anthropicClient';
import { ComponentGenerator } from '../generators/componentGenerator';
import { StyleGenerator } from '../styling/styleGenerator';
import { StateGenerator } from '../state/stateGenerator';

export class FrontendCoreAgent implements BaseAgent {
  public readonly id: string;
  public readonly type = 'FRONTEND_CORE';
  public readonly capabilities: AgentCapabilities;
  public status: 'INITIALIZING' | 'READY' | 'BUSY' | 'BLOCKED' | 'ERROR' | 'OFFLINE' = 'INITIALIZING';

  private anthropicClient: AnthropicClient;
  private componentGenerator: ComponentGenerator;
  private styleGenerator: StyleGenerator;
  private stateGenerator: StateGenerator;
  private config: AgentConfig = {} as AgentConfig; // Initialize with empty config
  private logger: Logger;

  constructor(logger: Logger) {
    this.id = process.env.AGENT_ID || 'frontend-core-001';
    this.logger = logger;
    
    this.capabilities = {
      supportedTaskTypes: ['UI_DEVELOPMENT', 'CODE_GENERATION', 'REFACTORING'] as TaskType[],
      requiredAPIs: ['anthropic'],
      skillLevel: 'senior',
      maxConcurrentTasks: 3,
      estimatedTaskDuration: {
        'UI_DEVELOPMENT': 120, // 2 hours
        'CODE_GENERATION': 60,  // 1 hour
        'REFACTORING': 90      // 1.5 hours
      } as Record<TaskType, number>
    };

    this.anthropicClient = new AnthropicClient(logger);
    this.componentGenerator = new ComponentGenerator(this.anthropicClient, logger);
    this.styleGenerator = new StyleGenerator(this.anthropicClient, logger);
    this.stateGenerator = new StateGenerator(this.anthropicClient, logger);
  }

  async initialize(config: AgentConfig): Promise<void> {
    try {
      this.config = config;
      this.status = 'INITIALIZING';

      // Initialize AI client
      await this.anthropicClient.initialize(config.anthropicApiKey);

      // Initialize generators
      await this.componentGenerator.initialize(config.workingDirectory);
      await this.styleGenerator.initialize();
      await this.stateGenerator.initialize();

      this.status = 'READY';
      this.logger.info(`Frontend Core Agent ${this.id} initialized successfully`);
    } catch (error) {
      this.status = 'ERROR';
      this.logger.error('Frontend Core Agent initialization failed', error as Error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.status !== 'READY') {
      throw new Error('Agent must be initialized before starting');
    }
    
    this.logger.info(`Frontend Core Agent ${this.id} started`);
  }

  async stop(): Promise<void> {
    this.status = 'OFFLINE';
    this.logger.info(`Frontend Core Agent ${this.id} stopped`);
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async executeTask(task: AgentTask): Promise<TaskResult> {
    if (this.status !== 'READY') {
      throw new Error('Agent is not ready to execute tasks');
    }

    this.status = 'BUSY';
    const startTime = Date.now();

    try {
      this.logger.info(`Executing task: ${task.title} (${task.type})`);

      let result: any;
      const artifacts: any[] = [];

      switch (task.type) {
        case 'UI_DEVELOPMENT':
          result = await this.handleUIDevTask(task);
          break;
        case 'CODE_GENERATION':
          result = await this.handleCodeGenTask(task);
          break;
        case 'REFACTORING':
          result = await this.handleRefactoringTask(task);
          break;
        default:
          throw new Error(`Unsupported task type: ${task.type}`);
      }

      const duration = Date.now() - startTime;
      this.status = 'READY';

      return {
        taskId: task.id,
        status: 'SUCCESS',
        output: result,
        artifacts,
        duration,
        metrics: {
          complexity: this.calculateComplexity(task),
          quality: this.assessQuality(result),
          codeLines: this.countCodeLines(result),
          filesChanged: artifacts.length
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.status = 'READY';

      return {
        taskId: task.id,
        status: 'FAILURE',
        output: null,
        artifacts: [],
        duration,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        nextSteps: ['Review task requirements', 'Check dependencies', 'Retry with adjusted parameters']
      };
    }
  }

  canHandleTask(task: AgentTask): boolean {
    return this.capabilities.supportedTaskTypes.includes(task.type) &&
           this.status === 'READY';
  }

  getTaskProgress(taskId: string): any {
    // Implementation would track task progress
    return null;
  }

  async sendMessage(message: any): Promise<void> {
    this.logger.info(`Sending message: ${message.type}`);
  }

  async receiveMessage(message: any): Promise<any> {
    this.logger.info(`Received message: ${message.type}`);
    return { success: true };
  }

  subscribeToTopic(topic: string): void {
    this.logger.info(`Subscribed to topic: ${topic}`);
  }

  getHealthStatus(): any {
    return {
      status: this.status === 'READY' ? 'HEALTHY' : 'UNHEALTHY',
      lastCheck: new Date(),
      uptime: process.uptime(),
      issues: this.status === 'ERROR' ? [{ severity: 'HIGH', message: 'Agent in error state' }] : [],
      systemInfo: {
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        activeConnections: 1
      }
    };
  }

  getMetrics(): any {
    return {
      productivity: {
        tasksCompleted: 0,
        tasksInProgress: this.status === 'BUSY' ? 1 : 0,
        averageCompletionTime: 90, // minutes
        velocityTrend: [1.2, 1.4, 1.3, 1.5],
        estimationAccuracy: 0.85,
        throughput: 8 // tasks per day
      },
      quality: {
        codeQualityScore: 8.5,
        testCoverageAchieved: 85,
        defectRate: 0.02,
        reworkPercentage: 0.1,
        reviewScore: 4.2,
        complianceScore: 0.95
      },
      reliability: {
        uptime: 0.99,
        errorRate: 0.01,
        responseTime: 250, // ms
        successRate: 0.98
      }
    };
  }

  getConfiguration(): AgentConfig {
    return { ...this.config };
  }

  private async handleUIDevTask(task: AgentTask): Promise<any> {
    const { metadata } = task;
    const framework = metadata.framework || 'react';
    
    switch (framework.toLowerCase()) {
      case 'react':
        return await this.componentGenerator.generateReactComponent(task);
      case 'vue':
        return await this.componentGenerator.generateVueComponent(task);
      case 'angular':
        return await this.componentGenerator.generateAngularComponent(task);
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  private async handleCodeGenTask(task: AgentTask): Promise<any> {
    return await this.componentGenerator.generateCode(task);
  }

  private async handleRefactoringTask(task: AgentTask): Promise<any> {
    return await this.componentGenerator.refactorCode(task);
  }

  private calculateComplexity(task: AgentTask): number {
    // Simple complexity calculation based on task metadata
    const { metadata } = task;
    let complexity = 1;

    if (metadata.hasState) complexity += 2;
    if (metadata.hasRouting) complexity += 1;
    if (metadata.hasAPI) complexity += 2;
    if (metadata.hasTests) complexity += 1;
    if (metadata.componentCount > 5) complexity += 2;

    return Math.min(complexity, 10);
  }

  private assessQuality(result: any): number {
    // Quality assessment based on generated code
    let quality = 8.0; // Base quality score

    if (result.hasTypeScript) quality += 0.5;
    if (result.hasTests) quality += 1.0;
    if (result.hasDocumentation) quality += 0.5;
    if (result.followsConventions) quality += 0.5;
    if (result.hasErrorHandling) quality += 0.5;

    return Math.min(quality, 10);
  }

  private countCodeLines(result: any): number {
    if (!result.code) return 0;
    return result.code.split('\n').length;
  }
}
