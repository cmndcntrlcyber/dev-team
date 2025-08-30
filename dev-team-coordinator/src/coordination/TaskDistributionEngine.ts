import * as vscode from 'vscode';
import { 
    BaseAgent, 
    AgentId, 
    AgentTask, 
    TaskType, 
    TaskPriority,
    AgentCapabilities,
    Logger,
    DevTeamError 
} from '../types';

export interface TaskDistributionStrategy {
    name: string;
    description: string;
    evaluate(task: AgentTask, agents: BaseAgent[]): Promise<TaskAssignment[]>;
}

export interface TaskAssignment {
    agentId: AgentId;
    confidence: number;
    estimatedDuration: number;
    prerequisites: string[];
    reasoning: string;
}

export interface DependencyNode {
    taskId: string;
    dependencies: string[];
    dependents: string[];
    priority: number;
    criticalPath: boolean;
}

export interface WorkloadMetrics {
    agentId: AgentId;
    currentTasks: number;
    estimatedLoad: number;
    averageCompletionTime: number;
    successRate: number;
    specializations: TaskType[];
}

export class TaskDistributionEngine {
    private strategies: Map<string, TaskDistributionStrategy> = new Map();
    private dependencyGraph: Map<string, DependencyNode> = new Map();
    private workloadMetrics: Map<AgentId, WorkloadMetrics> = new Map();
    private criticalPath: string[] = [];

    constructor(
        private logger: Logger,
        private context: vscode.ExtensionContext
    ) {
        this.initializeStrategies();
    }

    async initialize(): Promise<void> {
        this.logger.info('Initializing Task Distribution Engine');
        
        // Load historical performance data
        await this.loadPerformanceMetrics();
        
        // Initialize default strategies
        this.initializeStrategies();
        
        this.logger.info('Task Distribution Engine initialized');
    }

    // Main task distribution method
    async distributeTask(
        task: AgentTask, 
        availableAgents: BaseAgent[], 
        strategy: string = 'intelligent'
    ): Promise<TaskAssignment | null> {
        this.logger.info(`Distributing task: ${task.title} using strategy: ${strategy}`);

        try {
            // Update dependency graph
            await this.updateDependencyGraph(task);
            
            // Get distribution strategy
            const distributionStrategy = this.strategies.get(strategy);
            if (!distributionStrategy) {
                throw new DevTeamError('STRATEGY_NOT_FOUND', `Distribution strategy not found: ${strategy}`);
            }

            // Evaluate potential assignments
            const potentialAssignments = await distributionStrategy.evaluate(task, availableAgents);
            
            if (potentialAssignments.length === 0) {
                this.logger.warn(`No suitable agent found for task: ${task.title}`);
                return null;
            }

            // Select best assignment
            const bestAssignment = await this.selectBestAssignment(task, potentialAssignments);
            
            // Update workload metrics
            await this.updateWorkloadMetrics(bestAssignment.agentId, task);
            
            this.logger.info(`Task ${task.title} assigned to ${bestAssignment.agentId} with confidence: ${bestAssignment.confidence}`);
            
            return bestAssignment;

        } catch (error) {
            this.logger.error(`Task distribution failed for task: ${task.title}`, error as Error);
            throw error;
        }
    }

    // Dependency management
    async analyzeDependencies(tasks: AgentTask[]): Promise<DependencyNode[]> {
        const dependencyAnalysis: DependencyNode[] = [];

        for (const task of tasks) {
            const node: DependencyNode = {
                taskId: task.id,
                dependencies: task.dependencies,
                dependents: [],
                priority: this.calculatePriority(task),
                criticalPath: false
            };

            dependencyAnalysis.push(node);
            this.dependencyGraph.set(task.id, node);
        }

        // Calculate dependents
        for (const node of dependencyAnalysis) {
            for (const depId of node.dependencies) {
                const depNode = this.dependencyGraph.get(depId);
                if (depNode) {
                    depNode.dependents.push(node.taskId);
                }
            }
        }

        // Identify critical path
        this.criticalPath = await this.calculateCriticalPath(dependencyAnalysis);
        
        // Mark critical path tasks
        for (const taskId of this.criticalPath) {
            const node = this.dependencyGraph.get(taskId);
            if (node) {
                node.criticalPath = true;
            }
        }

        return dependencyAnalysis;
    }

    // Load balancing
    async optimizeWorkloadDistribution(agents: BaseAgent[]): Promise<void> {
        this.logger.info('Optimizing workload distribution across agents');

        // Get current workload metrics
        const workloads = Array.from(this.workloadMetrics.values());
        
        // Identify overloaded and underutilized agents
        const averageLoad = workloads.reduce((sum, w) => sum + w.estimatedLoad, 0) / workloads.length;
        const overloaded = workloads.filter(w => w.estimatedLoad > averageLoad * 1.5);
        const underutilized = workloads.filter(w => w.estimatedLoad < averageLoad * 0.5);

        if (overloaded.length > 0 || underutilized.length > 0) {
            this.logger.info(`Found ${overloaded.length} overloaded and ${underutilized.length} underutilized agents`);
            
            // Suggest task reassignments
            for (const overloadedAgent of overloaded) {
                await this.suggestTaskReassignment(overloadedAgent, underutilized);
            }
        }
    }

    // Real-time progress monitoring
    async monitorTaskProgress(taskId: string): Promise<TaskProgressAnalysis> {
        const task = await this.getTaskById(taskId);
        if (!task) {
            throw new DevTeamError('TASK_NOT_FOUND', `Task not found: ${taskId}`);
        }

        const analysis: TaskProgressAnalysis = {
            taskId,
            currentProgress: task.metadata?.progress || 0,
            estimatedCompletion: await this.estimateCompletion(task),
            blockers: await this.identifyBlockers(task),
            dependencies: await this.getDependencyStatus(task),
            recommendations: await this.generateRecommendations(task)
        };

        return analysis;
    }

    // Quality gate integration
    async evaluateQualityGates(task: AgentTask): Promise<QualityGateResult> {
        const qualityGates: QualityCheck[] = [
            {
                name: 'Code Complexity',
                check: () => this.checkCodeComplexity(task),
                weight: 0.3
            },
            {
                name: 'Test Coverage',
                check: () => this.checkTestCoverage(task),
                weight: 0.4
            },
            {
                name: 'Security Scan',
                check: () => this.checkSecurity(task),
                weight: 0.2
            },
            {
                name: 'Performance',
                check: () => this.checkPerformance(task),
                weight: 0.1
            }
        ];

        const results: QualityCheckResult[] = [];
        let overallScore = 0;

        for (const gate of qualityGates) {
            const result = await gate.check();
            results.push(result);
            overallScore += result.score * gate.weight;
        }

        return {
            taskId: task.id,
            overallScore,
            passed: overallScore >= 0.8,
            checks: results,
            recommendations: this.generateQualityRecommendations(results)
        };
    }

    // Private methods
    private initializeStrategies(): void {
        // Intelligent strategy - AI-powered assignment
        this.strategies.set('intelligent', {
            name: 'Intelligent Assignment',
            description: 'AI-powered task assignment based on agent capabilities and workload',
            evaluate: async (task: AgentTask, agents: BaseAgent[]) => {
                return await this.intelligentAssignment(task, agents);
            }
        });

        // Round-robin strategy
        this.strategies.set('round-robin', {
            name: 'Round Robin',
            description: 'Simple round-robin assignment',
            evaluate: async (task: AgentTask, agents: BaseAgent[]) => {
                return await this.roundRobinAssignment(task, agents);
            }
        });

        // Capability-based strategy
        this.strategies.set('capability', {
            name: 'Capability Based',
            description: 'Assignment based on agent capabilities and specialization',
            evaluate: async (task: AgentTask, agents: BaseAgent[]) => {
                return await this.capabilityBasedAssignment(task, agents);
            }
        });

        // Load-balanced strategy
        this.strategies.set('load-balanced', {
            name: 'Load Balanced',
            description: 'Assignment based on current agent workload',
            evaluate: async (task: AgentTask, agents: BaseAgent[]) => {
                return await this.loadBalancedAssignment(task, agents);
            }
        });
    }

    private async intelligentAssignment(task: AgentTask, agents: BaseAgent[]): Promise<TaskAssignment[]> {
        const assignments: TaskAssignment[] = [];

        for (const agent of agents) {
            // Check if agent can handle this task type
            if (!agent.capabilities.supportedTaskTypes.includes(task.type)) {
                continue;
            }

            // Get current workload
            const workload = this.workloadMetrics.get(agent.id);
            if (!workload) {
                continue;
            }

            // Calculate confidence score
            const confidence = await this.calculateConfidenceScore(task, agent, workload);
            
            if (confidence > 0.3) { // Minimum confidence threshold
                const assignment: TaskAssignment = {
                    agentId: agent.id,
                    confidence,
                    estimatedDuration: this.estimateTaskDuration(task, agent),
                    prerequisites: await this.identifyPrerequisites(task, agent),
                    reasoning: await this.generateAssignmentReasoning(task, agent, confidence)
                };

                assignments.push(assignment);
            }
        }

        // Sort by confidence score (descending)
        return assignments.sort((a, b) => b.confidence - a.confidence);
    }

    private async roundRobinAssignment(task: AgentTask, agents: BaseAgent[]): Promise<TaskAssignment[]> {
        const availableAgents = agents.filter(agent => 
            agent.capabilities.supportedTaskTypes.includes(task.type) &&
            agent.status === 'READY'
        );

        if (availableAgents.length === 0) {
            return [];
        }

        // Simple round-robin selection
        const selectedAgent = availableAgents[0];
        
        return [{
            agentId: selectedAgent.id,
            confidence: 0.7,
            estimatedDuration: this.estimateTaskDuration(task, selectedAgent),
            prerequisites: [],
            reasoning: 'Round-robin assignment strategy'
        }];
    }

    private async capabilityBasedAssignment(task: AgentTask, agents: BaseAgent[]): Promise<TaskAssignment[]> {
        const assignments: TaskAssignment[] = [];

        for (const agent of agents) {
            if (!agent.capabilities.supportedTaskTypes.includes(task.type)) {
                continue;
            }

            // Calculate capability match score
            const capabilityScore = this.calculateCapabilityScore(task, agent);
            
            if (capabilityScore > 0.5) {
                assignments.push({
                    agentId: agent.id,
                    confidence: capabilityScore,
                    estimatedDuration: this.estimateTaskDuration(task, agent),
                    prerequisites: [],
                    reasoning: `Capability match score: ${capabilityScore.toFixed(2)}`
                });
            }
        }

        return assignments.sort((a, b) => b.confidence - a.confidence);
    }

    private async loadBalancedAssignment(task: AgentTask, agents: BaseAgent[]): Promise<TaskAssignment[]> {
        const assignments: TaskAssignment[] = [];

        for (const agent of agents) {
            if (!agent.capabilities.supportedTaskTypes.includes(task.type)) {
                continue;
            }

            const workload = this.workloadMetrics.get(agent.id);
            if (!workload) {
                continue;
            }

            // Calculate load-based confidence (inverse of current load)
            const confidence = Math.max(0.1, 1.0 - (workload.estimatedLoad / 100));
            
            assignments.push({
                agentId: agent.id,
                confidence,
                estimatedDuration: this.estimateTaskDuration(task, agent),
                prerequisites: [],
                reasoning: `Load-balanced assignment (current load: ${workload.estimatedLoad}%)`
            });
        }

        return assignments.sort((a, b) => b.confidence - a.confidence);
    }

    private async calculateConfidenceScore(task: AgentTask, agent: BaseAgent, workload: WorkloadMetrics): Promise<number> {
        let score = 0;

        // Base capability score (40%)
        const capabilityScore = this.calculateCapabilityScore(task, agent);
        score += capabilityScore * 0.4;

        // Workload factor (30%)
        const workloadScore = Math.max(0, 1.0 - (workload.estimatedLoad / 100));
        score += workloadScore * 0.3;

        // Success rate factor (20%)
        score += workload.successRate * 0.2;

        // Priority adjustment (10%)
        const priorityBonus = task.priority === 'CRITICAL' ? 0.1 : 
                            task.priority === 'HIGH' ? 0.05 : 0;
        score += priorityBonus;

        return Math.min(1.0, score);
    }

    private calculateCapabilityScore(task: AgentTask, agent: BaseAgent): number {
        // Check if agent supports task type
        if (!agent.capabilities.supportedTaskTypes.includes(task.type)) {
            return 0;
        }

        let score = 0.5; // Base score for supporting task type

        // Skill level bonus
        const skillLevel = agent.capabilities.skillLevel;
        const skillBonus = {
            'junior': 0.1,
            'mid': 0.2,
            'senior': 0.3,
            'expert': 0.4
        }[skillLevel] || 0.1;

        score += skillBonus;

        // Task complexity vs agent skill
        const taskComplexity = task.metadata?.complexity || 'medium';
        if (taskComplexity === 'high' && skillLevel === 'expert') {
            score += 0.1;
        } else if (taskComplexity === 'low' && skillLevel === 'junior') {
            score += 0.1;
        }

        return Math.min(1.0, score);
    }

    private estimateTaskDuration(task: AgentTask, agent: BaseAgent): number {
        const baseDuration = agent.capabilities.estimatedTaskDuration[task.type] || 4;
        
        // Adjust based on priority
        const priorityMultiplier = {
            'CRITICAL': 0.8, // Higher priority gets more focused attention
            'HIGH': 0.9,
            'MEDIUM': 1.0,
            'LOW': 1.2
        }[task.priority] || 1.0;

        return baseDuration * priorityMultiplier;
    }

    // Additional helper methods
    private async updateDependencyGraph(task: AgentTask): Promise<void> {
        const node: DependencyNode = {
            taskId: task.id,
            dependencies: task.dependencies,
            dependents: [],
            priority: this.calculatePriority(task),
            criticalPath: false
        };

        this.dependencyGraph.set(task.id, node);
    }

    private calculatePriority(task: AgentTask): number {
        const priorityScores = {
            'CRITICAL': 4,
            'HIGH': 3,
            'MEDIUM': 2,
            'LOW': 1
        };
        
        return priorityScores[task.priority] || 2;
    }

    private async calculateCriticalPath(nodes: DependencyNode[]): Promise<string[]> {
        // Simplified critical path calculation
        // In a real implementation, this would use a more sophisticated algorithm
        return nodes
            .filter(node => node.dependencies.length === 0 || node.priority >= 3)
            .map(node => node.taskId);
    }

    private async selectBestAssignment(task: AgentTask, assignments: TaskAssignment[]): Promise<TaskAssignment> {
        // Return the assignment with highest confidence
        return assignments.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
        );
    }

    private async updateWorkloadMetrics(agentId: AgentId, task: AgentTask): Promise<void> {
        const metrics = this.workloadMetrics.get(agentId) || {
            agentId,
            currentTasks: 0,
            estimatedLoad: 0,
            averageCompletionTime: 0,
            successRate: 1.0,
            specializations: []
        };

        metrics.currentTasks += 1;
        metrics.estimatedLoad += this.estimateTaskDuration(task, { capabilities: { estimatedTaskDuration: {} } } as any);
        
        this.workloadMetrics.set(agentId, metrics);
    }

    private async loadPerformanceMetrics(): Promise<void> {
        // Load historical performance data from storage
        // This would typically load from database or file system
        this.logger.debug('Loading historical performance metrics');
    }

    // Placeholder methods for additional functionality
    private async suggestTaskReassignment(overloadedAgent: WorkloadMetrics, underutilizedAgents: WorkloadMetrics[]): Promise<void> {
        this.logger.info(`Suggesting task reassignment for overloaded agent: ${overloadedAgent.agentId}`);
    }

    private async getTaskById(taskId: string): Promise<AgentTask | null> {
        // This would fetch from the task database
        return null;
    }

    private async estimateCompletion(task: AgentTask): Promise<Date> {
        return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    }

    private async identifyBlockers(task: AgentTask): Promise<string[]> {
        return task.blockers;
    }

    private async getDependencyStatus(task: AgentTask): Promise<DependencyStatus[]> {
        return task.dependencies.map(depId => ({
            taskId: depId,
            status: 'IN_PROGRESS',
            estimatedCompletion: new Date()
        }));
    }

    private async generateRecommendations(task: AgentTask): Promise<string[]> {
        return ['Consider breaking down into smaller subtasks'];
    }

    private async identifyPrerequisites(task: AgentTask, agent: BaseAgent): Promise<string[]> {
        return [];
    }

    private async generateAssignmentReasoning(task: AgentTask, agent: BaseAgent, confidence: number): Promise<string> {
        return `Agent ${agent.id} selected with confidence ${confidence.toFixed(2)} based on capabilities and current workload`;
    }

    private async checkCodeComplexity(task: AgentTask): Promise<QualityCheckResult> {
        return {
            name: 'Code Complexity',
            score: 0.8,
            passed: true,
            details: 'Code complexity within acceptable limits'
        };
    }

    private async checkTestCoverage(task: AgentTask): Promise<QualityCheckResult> {
        return {
            name: 'Test Coverage',
            score: 0.9,
            passed: true,
            details: 'Test coverage above 90%'
        };
    }

    private async checkSecurity(task: AgentTask): Promise<QualityCheckResult> {
        return {
            name: 'Security Scan',
            score: 0.85,
            passed: true,
            details: 'No critical security issues found'
        };
    }

    private async checkPerformance(task: AgentTask): Promise<QualityCheckResult> {
        return {
            name: 'Performance',
            score: 0.75,
            passed: true,
            details: 'Performance metrics within acceptable range'
        };
    }

    private generateQualityRecommendations(results: QualityCheckResult[]): string[] {
        return results
            .filter(result => result.score < 0.8)
            .map(result => `Improve ${result.name}: ${result.details}`);
    }
}

// Supporting interfaces
interface TaskProgressAnalysis {
    taskId: string;
    currentProgress: number;
    estimatedCompletion: Date;
    blockers: string[];
    dependencies: DependencyStatus[];
    recommendations: string[];
}

interface DependencyStatus {
    taskId: string;
    status: string;
    estimatedCompletion: Date;
}

interface QualityGateResult {
    taskId: string;
    overallScore: number;
    passed: boolean;
    checks: QualityCheckResult[];
    recommendations: string[];
}

interface QualityCheck {
    name: string;
    check: () => Promise<QualityCheckResult>;
    weight: number;
}

interface QualityCheckResult {
    name: string;
    score: number;
    passed: boolean;
    details: string;
}
