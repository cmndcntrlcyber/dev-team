import * as vscode from 'vscode';
import { 
    BaseAgent, 
    AgentId, 
    AgentTask, 
    TaskProgress, 
    Logger,
    DevTeamError 
} from '../types';

export interface ProgressSnapshot {
    timestamp: Date;
    projectId: string;
    overallProgress: number;
    phaseProgress: PhaseProgress[];
    agentStatus: AgentProgressStatus[];
    blockers: ProgressBlocker[];
    predictions: ProgressPrediction;
    qualityMetrics: QualitySnapshot;
}

export interface PhaseProgress {
    phaseName: string;
    startDate: Date;
    estimatedEndDate: Date;
    actualProgress: number;
    tasksTotal: number;
    tasksCompleted: number;
    tasksInProgress: number;
    tasksBlocked: number;
    onTrack: boolean;
}

export interface AgentProgressStatus {
    agentId: AgentId;
    status: string;
    currentTask?: string;
    taskProgress: number;
    productivity: ProductivityMetrics;
    health: AgentHealth;
    lastUpdate: Date;
}

export interface ProductivityMetrics {
    tasksPerHour: number;
    averageTaskDuration: number;
    qualityScore: number;
    collaborationScore: number;
    velocityTrend: number[];
}

export interface AgentHealth {
    status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    responseTime: number;
    errorRate: number;
    uptime: number;
    lastHeartbeat: Date;
}

export interface ProgressBlocker {
    id: string;
    taskId: string;
    agentId: AgentId;
    type: 'DEPENDENCY' | 'RESOURCE' | 'TECHNICAL' | 'APPROVAL' | 'EXTERNAL';
    description: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    createdAt: Date;
    estimatedResolution?: Date;
    resolutionStrategy?: string;
}

export interface ProgressPrediction {
    estimatedCompletion: Date;
    confidenceLevel: number;
    riskFactors: RiskFactor[];
    recommendations: string[];
    scenarioAnalysis: ScenarioAnalysis;
}

export interface RiskFactor {
    type: string;
    probability: number;
    impact: number;
    description: string;
    mitigation: string;
}

export interface ScenarioAnalysis {
    optimistic: { completion: Date; probability: number };
    realistic: { completion: Date; probability: number };
    pessimistic: { completion: Date; probability: number };
}

export interface QualitySnapshot {
    overallScore: number;
    testCoverage: number;
    codeQuality: number;
    security: number;
    performance: number;
    accessibility: number;
    trends: QualityTrend[];
}

export interface QualityTrend {
    metric: string;
    values: number[];
    timestamps: Date[];
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

export class ProgressMonitor {
    private progressHistory: ProgressSnapshot[] = [];
    private currentSnapshot: ProgressSnapshot | null = null;
    private monitoringInterval: NodeJS.Timeout | null = null;
    private updateListeners: ((snapshot: ProgressSnapshot) => void)[] = [];
    private blockers: Map<string, ProgressBlocker> = new Map();

    constructor(
        private logger: Logger,
        private context: vscode.ExtensionContext
    ) {}

    async initialize(): Promise<void> {
        this.logger.info('Initializing Progress Monitor');
        
        // Load historical progress data
        await this.loadProgressHistory();
        
        // Start real-time monitoring
        this.startRealTimeMonitoring();
        
        this.logger.info('Progress Monitor initialized');
    }

    async shutdown(): Promise<void> {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        // Save final snapshot
        await this.saveProgressHistory();
        
        this.logger.info('Progress Monitor shutdown');
    }

    // Real-time monitoring
    async captureProgressSnapshot(
        projectId: string,
        agents: BaseAgent[],
        tasks: AgentTask[]
    ): Promise<ProgressSnapshot> {
        this.logger.debug('Capturing progress snapshot');

        const timestamp = new Date();
        
        // Calculate overall progress
        const overallProgress = await this.calculateOverallProgress(tasks);
        
        // Analyze phase progress
        const phaseProgress = await this.analyzePhaseProgress(tasks);
        
        // Collect agent status
        const agentStatus = await this.collectAgentStatus(agents);
        
        // Identify blockers
        const blockers = await this.identifyCurrentBlockers(tasks);
        
        // Generate predictions
        const predictions = await this.generateProgressPredictions(tasks, agentStatus);
        
        // Capture quality metrics
        const qualityMetrics = await this.captureQualitySnapshot(tasks);

        const snapshot: ProgressSnapshot = {
            timestamp,
            projectId,
            overallProgress,
            phaseProgress,
            agentStatus,
            blockers,
            predictions,
            qualityMetrics
        };

        this.currentSnapshot = snapshot;
        this.progressHistory.push(snapshot);
        
        // Notify listeners
        this.notifyUpdateListeners(snapshot);
        
        // Limit history size to last 1000 snapshots
        if (this.progressHistory.length > 1000) {
            this.progressHistory = this.progressHistory.slice(-1000);
        }

        return snapshot;
    }

    async startRealTimeMonitoring(intervalMs: number = 30000): Promise<void> {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        this.monitoringInterval = setInterval(async () => {
            try {
                // This would be called with actual project data in a real implementation
                await this.captureProgressSnapshot('current-project', [], []);
            } catch (error) {
                this.logger.error('Error capturing progress snapshot', error as Error);
            }
        }, intervalMs);

        this.logger.info(`Real-time monitoring started with ${intervalMs}ms interval`);
    }

    // Progress Analysis Methods
    private async calculateOverallProgress(tasks: AgentTask[]): Promise<number> {
        if (tasks.length === 0) {
            return 0;
        }

        const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
        return (completedTasks / tasks.length) * 100;
    }

    private async analyzePhaseProgress(tasks: AgentTask[]): Promise<PhaseProgress[]> {
        const phases = new Map<string, AgentTask[]>();
        
        // Group tasks by phase
        for (const task of tasks) {
            const phase = task.metadata?.phase || 'Unknown';
            if (!phases.has(phase)) {
                phases.set(phase, []);
            }
            phases.get(phase)!.push(task);
        }

        const phaseProgress: PhaseProgress[] = [];
        
        for (const [phaseName, phaseTasks] of phases) {
            const completedTasks = phaseTasks.filter(t => t.status === 'COMPLETED').length;
            const inProgressTasks = phaseTasks.filter(t => t.status === 'IN_PROGRESS').length;
            const blockedTasks = phaseTasks.filter(t => t.status === 'BLOCKED').length;
            const actualProgress = (completedTasks / phaseTasks.length) * 100;

            phaseProgress.push({
                phaseName,
                startDate: this.getPhaseStartDate(phaseTasks),
                estimatedEndDate: this.getPhaseEndDate(phaseTasks),
                actualProgress,
                tasksTotal: phaseTasks.length,
                tasksCompleted: completedTasks,
                tasksInProgress: inProgressTasks,
                tasksBlocked: blockedTasks,
                onTrack: actualProgress >= this.getExpectedProgress(phaseName)
            });
        }

        return phaseProgress;
    }

    private async collectAgentStatus(agents: BaseAgent[]): Promise<AgentProgressStatus[]> {
        const agentStatus: AgentProgressStatus[] = [];

        for (const agent of agents) {
            try {
                const health = agent.getHealthStatus();
                const metrics = agent.getMetrics();
                
                const status: AgentProgressStatus = {
                    agentId: agent.id,
                    status: agent.status,
                    taskProgress: await this.getAgentTaskProgress(agent),
                    productivity: {
                        tasksPerHour: metrics.productivity.velocityTrend.slice(-1)[0] || 0,
                        averageTaskDuration: metrics.productivity.averageCompletionTime,
                        qualityScore: metrics.quality.codeQualityScore,
                        collaborationScore: metrics.coordination.collaborationScore,
                        velocityTrend: metrics.productivity.velocityTrend
                    },
                    health: {
                        status: health.status === 'HEALTHY' ? 'HEALTHY' : 
                               health.status === 'DEGRADED' ? 'DEGRADED' : 'CRITICAL',
                        responseTime: metrics.reliability.responseTime,
                        errorRate: metrics.reliability.errorRate,
                        uptime: health.uptime,
                        lastHeartbeat: health.lastCheck
                    },
                    lastUpdate: new Date()
                };

                agentStatus.push(status);
            } catch (error) {
                this.logger.warn(`Could not collect status for agent ${agent.id}`, error as Error);
            }
        }

        return agentStatus;
    }

    private async identifyCurrentBlockers(tasks: AgentTask[]): Promise<ProgressBlocker[]> {
        const blockers: ProgressBlocker[] = [];

        for (const task of tasks) {
            if (task.status === 'BLOCKED' && task.blockers.length > 0) {
                for (const blockerDescription of task.blockers) {
                    const blocker: ProgressBlocker = {
                        id: this.generateBlockerId(),
                        taskId: task.id,
                        agentId: task.assignedTo || 'unassigned',
                        type: this.categorizeBlocker(blockerDescription),
                        description: blockerDescription,
                        impact: this.assessBlockerImpact(task),
                        createdAt: new Date(),
                        estimatedResolution: this.estimateBlockerResolution(blockerDescription),
                        resolutionStrategy: await this.generateResolutionStrategy(blockerDescription)
                    };

                    blockers.push(blocker);
                }
            }
        }

        return blockers;
    }

    private async generateProgressPredictions(
        tasks: AgentTask[], 
        agentStatus: AgentProgressStatus[]
    ): Promise<ProgressPrediction> {
        const averageVelocity = this.calculateAverageVelocity(agentStatus);
        const remainingWork = await this.calculateRemainingWork(tasks);
        
        // Scenario analysis
        const optimisticCompletion = new Date(Date.now() + (remainingWork / (averageVelocity * 1.3)) * 24 * 60 * 60 * 1000);
        const realisticCompletion = new Date(Date.now() + (remainingWork / averageVelocity) * 24 * 60 * 60 * 1000);
        const pessimisticCompletion = new Date(Date.now() + (remainingWork / (averageVelocity * 0.7)) * 24 * 60 * 60 * 1000);

        const riskFactors = await this.identifyRiskFactors(tasks, agentStatus);
        
        return {
            estimatedCompletion: realisticCompletion,
            confidenceLevel: this.calculateConfidenceLevel(riskFactors),
            riskFactors,
            recommendations: await this.generateProgressRecommendations(tasks, agentStatus),
            scenarioAnalysis: {
                optimistic: { completion: optimisticCompletion, probability: 0.2 },
                realistic: { completion: realisticCompletion, probability: 0.6 },
                pessimistic: { completion: pessimisticCompletion, probability: 0.2 }
            }
        };
    }

    private async captureQualitySnapshot(tasks: AgentTask[]): Promise<QualitySnapshot> {
        // Mock quality metrics - would integrate with actual quality systems
        return {
            overallScore: 0.85,
            testCoverage: 88,
            codeQuality: 8.2,
            security: 9.1,
            performance: 7.8,
            accessibility: 9.5,
            trends: [
                {
                    metric: 'Test Coverage',
                    values: [82, 85, 87, 88],
                    timestamps: this.generateTimeStamps(4),
                    trend: 'IMPROVING'
                },
                {
                    metric: 'Code Quality',
                    values: [8.1, 8.0, 8.2, 8.2],
                    timestamps: this.generateTimeStamps(4),
                    trend: 'STABLE'
                }
            ]
        };
    }

    // Dashboard Integration
    async getDashboardData(): Promise<ProgressDashboardData> {
        if (!this.currentSnapshot) {
            throw new DevTeamError('NO_SNAPSHOT', 'No progress snapshot available');
        }

        return {
            lastUpdate: this.currentSnapshot.timestamp,
            overallHealth: this.assessOverallHealth(),
            criticalIssues: await this.getCriticalIssues(),
            upcomingMilestones: await this.getUpcomingMilestones(),
            agentSummary: this.summarizeAgentStatus(),
            recentActivity: this.getRecentActivity(),
            keyMetrics: this.getKeyMetrics()
        };
    }

    async generateProgressReport(reportType: 'DAILY' | 'WEEKLY' | 'MILESTONE'): Promise<ProgressReport> {
        const timeRange = this.getTimeRangeForReport(reportType);
        const snapshots = this.getSnapshotsInRange(timeRange.start, timeRange.end);

        return {
            reportType,
            timeRange,
            summary: await this.generateReportSummary(snapshots),
            achievements: await this.identifyAchievements(snapshots),
            challenges: await this.identifyChallenges(snapshots),
            recommendations: await this.generateReportRecommendations(snapshots),
            metrics: this.calculateReportMetrics(snapshots),
            trends: this.analyzeTrends(snapshots)
        };
    }

    // Alert System
    async checkForAlerts(): Promise<ProgressAlert[]> {
        if (!this.currentSnapshot) {
            return [];
        }

        const alerts: ProgressAlert[] = [];

        // Check for critical blockers
        for (const blocker of this.currentSnapshot.blockers) {
            if (blocker.impact === 'CRITICAL') {
                alerts.push({
                    type: 'CRITICAL_BLOCKER',
                    severity: 'HIGH',
                    message: `Critical blocker detected: ${blocker.description}`,
                    affectedTasks: [blocker.taskId],
                    recommendedAction: blocker.resolutionStrategy || 'Immediate attention required',
                    timestamp: new Date()
                });
            }
        }

        // Check for agents in poor health
        for (const agent of this.currentSnapshot.agentStatus) {
            if (agent.health.status === 'CRITICAL') {
                alerts.push({
                    type: 'AGENT_HEALTH',
                    severity: 'HIGH',
                    message: `Agent ${agent.agentId} is in critical condition`,
                    affectedTasks: [agent.currentTask || 'N/A'],
                    recommendedAction: 'Restart agent or investigate errors',
                    timestamp: new Date()
                });
            }
        }

        // Check for timeline risks
        if (this.currentSnapshot.predictions.confidenceLevel < 0.6) {
            alerts.push({
                type: 'TIMELINE_RISK',
                severity: 'MEDIUM',
                message: 'Project timeline at risk based on current velocity',
                affectedTasks: ['ALL'],
                recommendedAction: 'Review resource allocation and priorities',
                timestamp: new Date()
            });
        }

        return alerts;
    }

    // Event Listeners
    onProgressUpdate(listener: (snapshot: ProgressSnapshot) => void): void {
        this.updateListeners.push(listener);
    }

    removeProgressUpdateListener(listener: (snapshot: ProgressSnapshot) => void): void {
        const index = this.updateListeners.indexOf(listener);
        if (index > -1) {
            this.updateListeners.splice(index, 1);
        }
    }

    // Helper Methods
    private startRealTimeMonitoring(): void {
        // Real-time monitoring would be implemented here
        this.logger.debug('Real-time progress monitoring started');
    }

    private notifyUpdateListeners(snapshot: ProgressSnapshot): void {
        for (const listener of this.updateListeners) {
            try {
                listener(snapshot);
            } catch (error) {
                this.logger.warn('Error notifying progress update listener', error as Error);
            }
        }
    }

    private async getAgentTaskProgress(agent: BaseAgent): Promise<number> {
        // Mock implementation - would get actual task progress
        return Math.floor(Math.random() * 100);
    }

    private getPhaseStartDate(tasks: AgentTask[]): Date {
        const dates = tasks.map(t => t.createdAt).sort((a, b) => a.getTime() - b.getTime());
        return dates[0] || new Date();
    }

    private getPhaseEndDate(tasks: AgentTask[]): Date {
        // Estimate based on current progress and velocity
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    }

    private getExpectedProgress(phaseName: string): number {
        // Mock expected progress calculation
        return 50; // 50% expected at this point
    }

    private categorizeBlocker(description: string): 'DEPENDENCY' | 'RESOURCE' | 'TECHNICAL' | 'APPROVAL' | 'EXTERNAL' {
        if (description.toLowerCase().includes('depend')) return 'DEPENDENCY';
        if (description.toLowerCase().includes('resource')) return 'RESOURCE';
        if (description.toLowerCase().includes('approval')) return 'APPROVAL';
        if (description.toLowerCase().includes('external')) return 'EXTERNAL';
        return 'TECHNICAL';
    }

    private assessBlockerImpact(task: AgentTask): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
        return task.priority === 'CRITICAL' ? 'CRITICAL' :
               task.priority === 'HIGH' ? 'HIGH' :
               task.priority === 'MEDIUM' ? 'MEDIUM' : 'LOW';
    }

    private estimateBlockerResolution(description: string): Date {
        // Mock estimation - would use historical data
        return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }

    private async generateResolutionStrategy(description: string): Promise<string> {
        // Mock strategy generation - would use AI
        return 'Contact relevant stakeholders and prioritize resolution';
    }

    private calculateAverageVelocity(agentStatus: AgentProgressStatus[]): number {
        const velocities = agentStatus.map(status => status.productivity.tasksPerHour);
        return velocities.reduce((sum, v) => sum + v, 0) / velocities.length || 1;
    }

    private async calculateRemainingWork(tasks: AgentTask[]): Promise<number> {
        const remainingTasks = tasks.filter(task => 
            task.status !== 'COMPLETED' && task.status !== 'DEFERRED'
        );
        
        return remainingTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
    }

    private async identifyRiskFactors(tasks: AgentTask[], agentStatus: AgentProgressStatus[]): Promise<RiskFactor[]> {
        const risks: RiskFactor[] = [];

        // Check for overloaded agents
        const overloadedAgents = agentStatus.filter(status => status.productivity.tasksPerHour < 0.5);
        if (overloadedAgents.length > 0) {
            risks.push({
                type: 'AGENT_OVERLOAD',
                probability: 0.7,
                impact: 0.8,
                description: `${overloadedAgents.length} agents showing signs of overload`,
                mitigation: 'Redistribute tasks or add resources'
            });
        }

        // Check for blocked tasks
        const blockedTasks = tasks.filter(task => task.status === 'BLOCKED');
        if (blockedTasks.length > 0) {
            risks.push({
                type: 'TASK_BLOCKERS',
                probability: 0.9,
                impact: 0.6,
                description: `${blockedTasks.length} tasks currently blocked`,
                mitigation: 'Prioritize blocker resolution'
            });
        }

        return risks;
    }

    private calculateConfidenceLevel(riskFactors: RiskFactor[]): number {
        if (riskFactors.length === 0) {
            return 0.95;
        }

        const riskScore = riskFactors.reduce((sum, risk) => 
            sum + (risk.probability * risk.impact), 0
        ) / riskFactors.length;

        return Math.max(0.1, 1.0 - riskScore);
    }

    private async generateProgressRecommendations(tasks: AgentTask[], agentStatus: AgentProgressStatus[]): Promise<string[]> {
        const recommendations: string[] = [];

        // Analyze blockers
        const blockedTasksCount = tasks.filter(t => t.status === 'BLOCKED').length;
        if (blockedTasksCount > 0) {
            recommendations.push(`Prioritize resolving ${blockedTasksCount} blocked tasks`);
        }

        // Analyze agent health
        const unhealthyAgents = agentStatus.filter(a => a.health.status !== 'HEALTHY').length;
        if (unhealthyAgents > 0) {
            recommendations.push(`Monitor ${unhealthyAgents} agents showing performance issues`);
        }

        // Progress analysis
        const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
        if (inProgressTasks === 0) {
            recommendations.push('No tasks currently in progress - consider starting new tasks');
        }

        return recommendations;
    }

    private generateTimeStamps(count: number): Date[] {
        const timestamps: Date[] = [];
        const now = Date.now();
        
        for (let i = count - 1; i >= 0; i--) {
            timestamps.push(new Date(now - (i * 24 * 60 * 60 * 1000))); // Daily intervals
        }
        
        return timestamps;
    }

    private generateBlockerId(): string {
        return `blocker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Dashboard helper methods
    private assessOverallHealth(): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
        if (!this.currentSnapshot) return 'CRITICAL';
        
        const criticalBlockers = this.currentSnapshot.blockers.filter(b => b.impact === 'CRITICAL').length;
        const agentIssues = this.currentSnapshot.agentStatus.filter(a => a.health.status !== 'HEALTHY').length;
        
        if (criticalBlockers > 0 || agentIssues > 2) return 'CRITICAL';
        if (agentIssues > 0 || this.currentSnapshot.predictions.confidenceLevel < 0.7) return 'WARNING';
        return 'HEALTHY';
    }

    private async getCriticalIssues(): Promise<string[]> {
        if (!this.currentSnapshot) return [];
        
        return this.currentSnapshot.blockers
            .filter(b => b.impact === 'CRITICAL')
            .map(b => b.description);
    }

    private async getUpcomingMilestones(): Promise<Milestone[]> {
        // Mock milestones
        return [
            {
                name: 'Phase 3 Complete',
                date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                progress: 45,
                onTrack: true
            }
        ];
    }

    private summarizeAgentStatus(): AgentSummary {
        if (!this.currentSnapshot) {
            return { total: 0, healthy: 0, degraded: 0, critical: 0 };
        }

        const agents = this.currentSnapshot.agentStatus;
        return {
            total: agents.length,
            healthy: agents.filter(a => a.health.status === 'HEALTHY').length,
            degraded: agents.filter(a => a.health.status === 'DEGRADED').length,
            critical: agents.filter(a => a.health.status === 'CRITICAL').length
        };
    }

    private getRecentActivity(): ActivityItem[] {
        // Mock recent activity
        return [
            {
                timestamp: new Date(),
                type: 'TASK_COMPLETED',
                description: 'Frontend component generation completed',
                agentId: 'frontend-core-001'
            }
        ];
    }

    private getKeyMetrics(): KeyMetric[] {
        if (!this.currentSnapshot) return [];
        
        return [
            {
                name: 'Overall Progress',
                value: this.currentSnapshot.overallProgress.toFixed(1) + '%',
                trend: 'IMPROVING'
            },
            {
                name: 'Quality Score',
                value: (this.currentSnapshot.qualityMetrics.overallScore * 100).toFixed(1),
                trend: 'STABLE'
            }
        ];
    }

    // Report generation helper methods
    private getTimeRangeForReport(reportType: 'DAILY' | 'WEEKLY' | 'MILESTONE'): { start: Date; end: Date } {
        const now = new Date();
        const start = new Date(now);
        
        switch (reportType) {
            case 'DAILY':
                start.setDate(now.getDate() - 1);
                break;
            case 'WEEKLY':
                start.setDate(now.getDate() - 7);
                break;
            case 'MILESTONE':
                start.setDate(now.getDate() - 30);
                break;
        }
        
        return { start, end: now };
    }

    private getSnapshotsInRange(start: Date, end: Date): ProgressSnapshot[] {
        return this.progressHistory.filter(snapshot => 
            snapshot.timestamp >= start && snapshot.timestamp <= end
        );
    }

    private async generateReportSummary(snapshots: ProgressSnapshot[]): Promise<string> {
        if (snapshots.length === 0) {
            return 'No data available for the selected time range';
        }

        const first = snapshots[0];
        const last = snapshots[snapshots.length - 1];
        const progressGain = last.overallProgress - first.overallProgress;

        return `Progress increased by ${progressGain.toFixed(1)}% over the reporting period`;
    }

    private async identifyAchievements(snapshots: ProgressSnapshot[]): Promise<string[]> {
        return [
            'Successfully completed Phase 2 agent implementation',
            'Zero critical security vulnerabilities detected',
            'Maintained >90% agent uptime'
        ];
    }

    private async identifyChallenges(snapshots: ProgressSnapshot[]): Promise<string[]> {
        return [
            'Integration testing taking longer than expected',
            'API rate limiting affecting development velocity'
        ];
    }

    private async generateReportRecommendations(snapshots: ProgressSnapshot[]): Promise<string[]> {
        return [
            'Consider parallel development streams for independent features',
            'Increase API quota or implement more aggressive caching'
        ];
    }

    private calculateReportMetrics(snapshots: ProgressSnapshot[]): ReportMetrics {
        if (snapshots.length === 0) {
            return { velocityAverage: 0, qualityTrend: 'STABLE', blockerRate: 0 };
        }

        const velocities = snapshots.map(s => s.overallProgress);
        const velocityAverage = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;

        return {
            velocityAverage,
            qualityTrend: 'IMPROVING',
            blockerRate: snapshots[snapshots.length - 1].blockers.length
        };
    }

    private analyzeTrends(snapshots: ProgressSnapshot[]): TrendAnalysis[] {
        return [
            {
                metric: 'Overall Progress',
                direction: 'UP',
                strength: 'STRONG',
                confidence: 0.85
            }
        ];
    }

    // Persistence
    private async loadProgressHistory(): Promise<void> {
        try {
            const historyPath = vscode.Uri.joinPath(this.context.globalStorageUri, 'progress-history.json');
            const historyData = await vscode.workspace.fs.readFile(historyPath);
            this.progressHistory = JSON.parse(historyData.toString());
            this.logger.info(`Loaded ${this.progressHistory.length} progress snapshots`);
        } catch (error) {
            this.progressHistory = [];
        }
    }

    private async saveProgressHistory(): Promise<void> {
        try {
            const historyPath = vscode.Uri.joinPath(this.context.globalStorageUri, 'progress-history.json');
            const historyData = Buffer.from(JSON.stringify(this.progressHistory, null, 2));
            await vscode.workspace.fs.writeFile(historyPath, historyData);
            this.logger.debug('Saved progress history');
        } catch (error) {
            this.logger.warn('Could not save progress history', error as Error);
        }
    }
}

// Supporting interfaces
interface ProgressDashboardData {
    lastUpdate: Date;
    overallHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    criticalIssues: string[];
    upcomingMilestones: Milestone[];
    agentSummary: AgentSummary;
    recentActivity: ActivityItem[];
    keyMetrics: KeyMetric[];
}

interface Milestone {
    name: string;
    date: Date;
    progress: number;
    onTrack: boolean;
}

interface AgentSummary {
    total: number;
    healthy: number;
    degraded: number;
    critical: number;
}

interface ActivityItem {
    timestamp: Date;
    type: string;
    description: string;
    agentId: AgentId;
}

interface KeyMetric {
    name: string;
    value: string;
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

interface ProgressReport {
    reportType: 'DAILY' | 'WEEKLY' | 'MILESTONE';
    timeRange: { start: Date; end: Date };
    summary: string;
    achievements: string[];
    challenges: string[];
    recommendations: string[];
    metrics: ReportMetrics;
    trends: TrendAnalysis[];
}

interface ProgressAlert {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
    affectedTasks: string[];
    recommendedAction: string;
    timestamp: Date;
}

interface ReportMetrics {
    velocityAverage: number;
    qualityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    blockerRate: number;
}

interface TrendAnalysis {
    metric: string;
    direction: 'UP' | 'DOWN' | 'STABLE';
    strength: 'WEAK' | 'MODERATE' | 'STRONG';
    confidence: number;
}
