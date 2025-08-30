import * as vscode from 'vscode';
import { 
    AgentTask, 
    AgentId, 
    Logger,
    DevTeamError 
} from '../types';

export interface HumanDecisionPoint {
    id: string;
    taskId: string;
    agentId: AgentId;
    type: DecisionType;
    question: string;
    options?: DecisionOption[];
    context: any;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timeout?: number; // milliseconds
    createdAt: Date;
    respondedAt?: Date;
    response?: HumanResponse;
    status: DecisionStatus;
}

export type DecisionType = 
    | 'ARCHITECTURE_APPROVAL'
    | 'TECHNOLOGY_SELECTION'
    | 'CODE_REVIEW'
    | 'QUALITY_GATE_OVERRIDE'
    | 'RESOURCE_ALLOCATION'
    | 'TIMELINE_ADJUSTMENT'
    | 'SECURITY_DECISION'
    | 'DEPLOYMENT_APPROVAL';

export type DecisionStatus = 'PENDING' | 'RESPONDED' | 'EXPIRED' | 'CANCELLED';

export interface DecisionOption {
    id: string;
    label: string;
    description: string;
    impact: string;
    recommended?: boolean;
}

export interface HumanResponse {
    decisionId: string;
    selectedOption?: string;
    customInput?: string;
    feedback?: string;
    timestamp: Date;
    confidence: number; // 0-1 scale
}

export interface FeedbackCollection {
    id: string;
    taskId: string;
    agentId: AgentId;
    category: FeedbackCategory;
    prompt: string;
    responseType: 'RATING' | 'TEXT' | 'CHOICE' | 'MIXED';
    responses: FeedbackResponse[];
    createdAt: Date;
    status: 'OPEN' | 'CLOSED' | 'ANALYSED';
}

export type FeedbackCategory = 
    | 'CODE_QUALITY'
    | 'USER_EXPERIENCE'
    | 'PERFORMANCE'
    | 'ARCHITECTURE'
    | 'WORKFLOW'
    | 'AGENT_BEHAVIOR';

export interface FeedbackResponse {
    userId: string;
    rating?: number; // 1-5 scale
    textResponse?: string;
    selectedChoices?: string[];
    timestamp: Date;
    helpful: boolean;
}

export class HumanFeedbackSystem {
    private pendingDecisions: Map<string, HumanDecisionPoint> = new Map();
    private decisionHistory: HumanDecisionPoint[] = [];
    private feedbackCollections: Map<string, FeedbackCollection> = new Map();
    private notificationQueue: HumanDecisionPoint[] = [];

    constructor(
        private logger: Logger,
        private context: vscode.ExtensionContext
    ) {}

    async initialize(): Promise<void> {
        this.logger.info('Initializing Human Feedback System');
        
        // Load existing decisions and feedback
        await this.loadDecisionHistory();
        
        // Start notification processing
        this.startNotificationProcessing();
        
        this.logger.info('Human Feedback System initialized');
    }

    // Decision Point Management
    async requestDecision(
        taskId: string,
        agentId: AgentId,
        type: DecisionType,
        question: string,
        options?: DecisionOption[],
        context?: any,
        urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
        timeout?: number
    ): Promise<string> {
        const decisionId = this.generateDecisionId();
        
        const decisionPoint: HumanDecisionPoint = {
            id: decisionId,
            taskId,
            agentId,
            type,
            question,
            options,
            context,
            urgency,
            timeout,
            createdAt: new Date(),
            status: 'PENDING'
        };

        this.pendingDecisions.set(decisionId, decisionPoint);
        this.notificationQueue.push(decisionPoint);

        this.logger.info(`Human decision requested: ${type} for task ${taskId}`);
        
        // Save to persistent storage
        await this.saveDecisionPoint(decisionPoint);
        
        return decisionId;
    }

    async respondToDecision(decisionId: string, response: Omit<HumanResponse, 'timestamp'>): Promise<void> {
        const decision = this.pendingDecisions.get(decisionId);
        if (!decision) {
            throw new DevTeamError('DECISION_NOT_FOUND', `Decision not found: ${decisionId}`);
        }

        if (decision.status !== 'PENDING') {
            throw new DevTeamError('DECISION_ALREADY_RESPONDED', `Decision already responded: ${decisionId}`);
        }

        const humanResponse: HumanResponse = {
            ...response,
            timestamp: new Date()
        };

        decision.response = humanResponse;
        decision.respondedAt = new Date();
        decision.status = 'RESPONDED';

        // Move to history
        this.decisionHistory.push(decision);
        this.pendingDecisions.delete(decisionId);

        this.logger.info(`Human decision responded: ${decisionId}`);

        // Notify the requesting agent
        await this.notifyAgent(decision, humanResponse);
        
        // Save updated state
        await this.saveDecisionHistory();
    }

    async cancelDecision(decisionId: string, reason?: string): Promise<void> {
        const decision = this.pendingDecisions.get(decisionId);
        if (!decision) {
            return; // Already handled or doesn't exist
        }

        decision.status = 'CANCELLED';
        this.decisionHistory.push(decision);
        this.pendingDecisions.delete(decisionId);

        this.logger.info(`Human decision cancelled: ${decisionId} - ${reason || 'No reason provided'}`);
        
        await this.saveDecisionHistory();
    }

    // Feedback Collection
    async collectFeedback(
        taskId: string,
        agentId: AgentId,
        category: FeedbackCategory,
        prompt: string,
        responseType: 'RATING' | 'TEXT' | 'CHOICE' | 'MIXED' = 'MIXED'
    ): Promise<string> {
        const feedbackId = this.generateFeedbackId();
        
        const collection: FeedbackCollection = {
            id: feedbackId,
            taskId,
            agentId,
            category,
            prompt,
            responseType,
            responses: [],
            createdAt: new Date(),
            status: 'OPEN'
        };

        this.feedbackCollections.set(feedbackId, collection);

        this.logger.info(`Feedback collection started: ${category} for task ${taskId}`);
        
        // Show feedback UI
        await this.showFeedbackUI(collection);
        
        return feedbackId;
    }

    async submitFeedback(
        feedbackId: string,
        userId: string,
        response: Omit<FeedbackResponse, 'timestamp' | 'helpful'>
    ): Promise<void> {
        const collection = this.feedbackCollections.get(feedbackId);
        if (!collection) {
            throw new DevTeamError('FEEDBACK_NOT_FOUND', `Feedback collection not found: ${feedbackId}`);
        }

        const feedbackResponse: FeedbackResponse = {
            ...response,
            timestamp: new Date(),
            helpful: true // Default, could be calculated based on response quality
        };

        collection.responses.push(feedbackResponse);
        
        this.logger.info(`Feedback submitted for collection: ${feedbackId}`);
        
        // Analyze feedback if enough responses collected
        if (collection.responses.length >= 3) {
            await this.analyzeFeedback(collection);
        }
    }

    // Progress Review Integration
    async scheduleProgressReview(
        taskId: string,
        milestone: string,
        reviewDate: Date
    ): Promise<void> {
        const reviewDecision = await this.requestDecision(
            taskId,
            'system',
            'CODE_REVIEW',
            `Progress review scheduled for milestone: ${milestone}. Please review the current progress and provide feedback.`,
            [
                {
                    id: 'approve',
                    label: 'Approve Progress',
                    description: 'Current progress meets expectations',
                    impact: 'Continue with current plan',
                    recommended: true
                },
                {
                    id: 'request_changes',
                    label: 'Request Changes',
                    description: 'Progress needs improvements',
                    impact: 'Pause development for revisions'
                },
                {
                    id: 'escalate',
                    label: 'Escalate',
                    description: 'Requires senior review',
                    impact: 'Escalate to project leadership'
                }
            ],
            { milestone, reviewDate },
            'HIGH',
            24 * 60 * 60 * 1000 // 24 hours timeout
        );

        this.logger.info(`Progress review scheduled for task ${taskId} at ${reviewDate}`);
    }

    // Approval Workflows
    async requestApproval(
        type: 'ARCHITECTURE' | 'DEPLOYMENT' | 'SECURITY' | 'RESOURCE',
        context: any,
        urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
    ): Promise<string> {
        const approvalOptions: DecisionOption[] = [
            {
                id: 'approve',
                label: 'Approve',
                description: 'Approve the proposed action',
                impact: 'Proceed with implementation',
                recommended: true
            },
            {
                id: 'reject',
                label: 'Reject',
                description: 'Reject the proposed action',
                impact: 'Block implementation and request alternatives'
            },
            {
                id: 'modify',
                label: 'Request Modifications',
                description: 'Approve with modifications',
                impact: 'Proceed with specified changes'
            }
        ];

        return await this.requestDecision(
            context.taskId || 'system',
            context.agentId || 'system',
            type === 'ARCHITECTURE' ? 'ARCHITECTURE_APPROVAL' : 'DEPLOYMENT_APPROVAL',
            `${type} approval required: ${context.description || 'Please review and approve'}`,
            approvalOptions,
            context,
            urgency
        );
    }

    // User Interface Integration
    private async showDecisionUI(decision: HumanDecisionPoint): Promise<void> {
        const message = `${decision.question}\n\nUrgency: ${decision.urgency}\nAgent: ${decision.agentId}`;
        
        if (decision.options && decision.options.length > 0) {
            // Show quick pick with options
            const quickPickItems = decision.options.map(option => ({
                label: option.label,
                description: option.description,
                detail: `Impact: ${option.impact}`,
                option
            }));

            const selection = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: decision.question,
                title: `Human Input Required - ${decision.type}`,
                ignoreFocusOut: decision.urgency === 'CRITICAL'
            });

            if (selection) {
                await this.respondToDecision(decision.id, {
                    decisionId: decision.id,
                    selectedOption: selection.option.id,
                    confidence: 1.0
                });
            }
        } else {
            // Show input box for custom response
            const input = await vscode.window.showInputBox({
                prompt: decision.question,
                placeHolder: 'Enter your response...',
                ignoreFocusOut: decision.urgency === 'CRITICAL'
            });

            if (input) {
                await this.respondToDecision(decision.id, {
                    decisionId: decision.id,
                    customInput: input,
                    confidence: 1.0
                });
            }
        }
    }

    private async showFeedbackUI(collection: FeedbackCollection): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'devTeam.feedback',
            `Feedback: ${collection.category}`,
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.generateFeedbackHTML(collection);
        
        // Handle messages from webview
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'submitFeedback') {
                await this.submitFeedback(collection.id, 'user', {
                    userId: 'user',
                    rating: message.rating,
                    textResponse: message.textResponse,
                    selectedChoices: message.selectedChoices
                });
                
                panel.dispose();
                vscode.window.showInformationMessage('Feedback submitted successfully');
            }
        });
    }

    private generateFeedbackHTML(collection: FeedbackCollection): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dev Team Feedback</title>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; }
        .feedback-container { max-width: 600px; margin: 0 auto; }
        .question { font-size: 16px; margin-bottom: 20px; font-weight: bold; }
        .rating { margin: 20px 0; }
        .rating input { margin: 0 5px; }
        .text-input { width: 100%; padding: 10px; margin: 10px 0; }
        .submit-btn { 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground);
            border: none; 
            padding: 10px 20px; 
            cursor: pointer; 
            border-radius: 4px;
        }
        .context { 
            background: var(--vscode-editor-background); 
            padding: 15px; 
            margin: 15px 0; 
            border-radius: 4px;
            border-left: 4px solid var(--vscode-activityBarBadge-background);
        }
    </style>
</head>
<body>
    <div class="feedback-container">
        <h2>Feedback Collection</h2>
        <div class="context">
            <strong>Category:</strong> ${collection.category}<br>
            <strong>Task:</strong> ${collection.taskId}<br>
            <strong>Agent:</strong> ${collection.agentId}
        </div>
        
        <div class="question">${collection.prompt}</div>
        
        ${collection.responseType === 'RATING' || collection.responseType === 'MIXED' ? `
        <div class="rating">
            <label>Rating (1-5):</label><br>
            <input type="radio" name="rating" value="1" id="r1"><label for="r1">1 - Poor</label>
            <input type="radio" name="rating" value="2" id="r2"><label for="r2">2 - Fair</label>
            <input type="radio" name="rating" value="3" id="r3"><label for="r3">3 - Good</label>
            <input type="radio" name="rating" value="4" id="r4"><label for="r4">4 - Very Good</label>
            <input type="radio" name="rating" value="5" id="r5"><label for="r5">5 - Excellent</label>
        </div>
        ` : ''}
        
        ${collection.responseType === 'TEXT' || collection.responseType === 'MIXED' ? `
        <div class="text-section">
            <label for="textResponse">Additional Comments:</label>
            <textarea id="textResponse" class="text-input" rows="4" placeholder="Please provide your feedback..."></textarea>
        </div>
        ` : ''}
        
        <button class="submit-btn" onclick="submitFeedback()">Submit Feedback</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function submitFeedback() {
            const rating = document.querySelector('input[name="rating"]:checked')?.value;
            const textResponse = document.getElementById('textResponse')?.value;
            
            vscode.postMessage({
                command: 'submitFeedback',
                rating: rating ? parseInt(rating) : undefined,
                textResponse: textResponse || undefined
            });
        }
    </script>
</body>
</html>`;
    }

    // Workflow Integration
    async createApprovalWorkflow(
        workflowName: string,
        steps: ApprovalStep[],
        context: any
    ): Promise<string> {
        const workflowId = this.generateWorkflowId();
        
        this.logger.info(`Creating approval workflow: ${workflowName}`);
        
        // Process workflow steps sequentially
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const decisionId = await this.requestDecision(
                context.taskId,
                context.agentId,
                step.decisionType,
                step.question,
                step.options,
                { ...context, step: i + 1, totalSteps: steps.length },
                step.urgency || 'MEDIUM'
            );
            
            // Wait for response before proceeding to next step
            await this.waitForDecision(decisionId, step.timeout);
        }
        
        return workflowId;
    }

    async createProgressCheckpoint(
        taskId: string,
        checkpointName: string,
        criteria: CheckpointCriteria[]
    ): Promise<string> {
        const checkpointId = this.generateCheckpointId();
        
        const decisionId = await this.requestDecision(
            taskId,
            'system',
            'CODE_REVIEW',
            `Progress checkpoint: ${checkpointName}. Please review the completion criteria and approve to continue.`,
            [
                {
                    id: 'approve',
                    label: 'Approve Checkpoint',
                    description: 'All criteria met, continue to next phase',
                    impact: 'Proceed with development',
                    recommended: true
                },
                {
                    id: 'revise',
                    label: 'Request Revisions',
                    description: 'Some criteria need improvements',
                    impact: 'Return to development for revisions'
                },
                {
                    id: 'escalate',
                    label: 'Escalate Decision',
                    description: 'Requires senior review',
                    impact: 'Escalate to project leadership'
                }
            ],
            { checkpointName, criteria },
            'HIGH'
        );

        return checkpointId;
    }

    // Analytics and Insights
    async generateFeedbackInsights(): Promise<FeedbackInsights> {
        const allCollections = Array.from(this.feedbackCollections.values());
        const allDecisions = [...this.decisionHistory, ...Array.from(this.pendingDecisions.values())];

        const insights: FeedbackInsights = {
            totalDecisions: allDecisions.length,
            averageResponseTime: this.calculateAverageResponseTime(allDecisions),
            decisionTypes: this.analyzeDecisionTypes(allDecisions),
            feedbackSentiment: await this.analyzeFeedbackSentiment(allCollections),
            commonIssues: await this.identifyCommonIssues(allCollections),
            agentPerformance: await this.analyzeAgentPerformanceFromFeedback(allCollections),
            recommendations: await this.generateSystemRecommendations(allCollections, allDecisions)
        };

        return insights;
    }

    // Private helper methods
    private startNotificationProcessing(): void {
        setInterval(async () => {
            if (this.notificationQueue.length > 0) {
                const decision = this.notificationQueue.shift();
                if (decision) {
                    await this.showDecisionUI(decision);
                }
            }
        }, 5000); // Check every 5 seconds
    }

    private async waitForDecision(decisionId: string, timeout?: number): Promise<HumanResponse> {
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                const decision = this.pendingDecisions.get(decisionId) || 
                                this.decisionHistory.find(d => d.id === decisionId);
                
                if (decision?.response) {
                    clearInterval(checkInterval);
                    resolve(decision.response);
                }
            }, 1000);

            // Timeout handling
            if (timeout) {
                setTimeout(() => {
                    clearInterval(checkInterval);
                    reject(new DevTeamError('DECISION_TIMEOUT', `Decision timeout: ${decisionId}`));
                }, timeout);
            }
        });
    }

    private async notifyAgent(decision: HumanDecisionPoint, response: HumanResponse): Promise<void> {
        // This would send a message back to the requesting agent
        this.logger.info(`Notifying agent ${decision.agentId} of decision response: ${decision.id}`);
    }

    private async analyzeFeedback(collection: FeedbackCollection): Promise<void> {
        const averageRating = collection.responses
            .filter(r => r.rating !== undefined)
            .reduce((sum, r) => sum + (r.rating || 0), 0) / collection.responses.length;

        collection.status = 'ANALYSED';
        
        this.logger.info(`Feedback analyzed for ${collection.id}: Average rating ${averageRating.toFixed(1)}`);
    }

    private calculateAverageResponseTime(decisions: HumanDecisionPoint[]): number {
        const respondedDecisions = decisions.filter(d => d.respondedAt && d.createdAt);
        
        if (respondedDecisions.length === 0) {
            return 0;
        }

        const totalTime = respondedDecisions.reduce((sum, d) => {
            return sum + (d.respondedAt!.getTime() - d.createdAt.getTime());
        }, 0);

        return totalTime / respondedDecisions.length / 1000 / 60; // Convert to minutes
    }

    private analyzeDecisionTypes(decisions: HumanDecisionPoint[]): Record<DecisionType, number> {
        const counts = {} as Record<DecisionType, number>;
        
        for (const decision of decisions) {
            counts[decision.type] = (counts[decision.type] || 0) + 1;
        }
        
        return counts;
    }

    private async analyzeFeedbackSentiment(collections: FeedbackCollection[]): Promise<string> {
        // Mock sentiment analysis - would use real sentiment analysis in production
        return 'POSITIVE';
    }

    private async identifyCommonIssues(collections: FeedbackCollection[]): Promise<string[]> {
        // Mock issue identification
        return [
            'Agent response time could be faster',
            'More context needed for complex decisions',
            'Better error messages requested'
        ];
    }

    private async analyzeAgentPerformanceFromFeedback(collections: FeedbackCollection[]): Promise<Record<AgentId, number>> {
        const performance = {} as Record<AgentId, number>;
        
        for (const collection of collections) {
            if (collection.responses.length > 0) {
                const avgRating = collection.responses
                    .filter(r => r.rating !== undefined)
                    .reduce((sum, r) => sum + (r.rating || 0), 0) / collection.responses.length;
                
                performance[collection.agentId] = avgRating;
            }
        }
        
        return performance;
    }

    private async generateSystemRecommendations(
        collections: FeedbackCollection[], 
        decisions: HumanDecisionPoint[]
    ): Promise<string[]> {
        return [
            'Consider reducing decision timeout for low-urgency items',
            'Add more context to architecture decisions',
            'Implement automated approval for routine tasks'
        ];
    }

    // Utility methods
    private generateDecisionId(): string {
        return `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateFeedbackId(): string {
        return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateWorkflowId(): string {
        return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateCheckpointId(): string {
        return `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Persistence methods
    private async loadDecisionHistory(): Promise<void> {
        try {
            const historyPath = vscode.Uri.joinPath(this.context.globalStorageUri, 'decision-history.json');
            const historyData = await vscode.workspace.fs.readFile(historyPath);
            this.decisionHistory = JSON.parse(historyData.toString());
            this.logger.info(`Loaded ${this.decisionHistory.length} historical decisions`);
        } catch (error) {
            // No history file exists yet
            this.decisionHistory = [];
        }
    }

    private async saveDecisionPoint(decision: HumanDecisionPoint): Promise<void> {
        // Save individual decision point
        this.logger.debug(`Saved decision point: ${decision.id}`);
    }

    private async saveDecisionHistory(): Promise<void> {
        try {
            const historyPath = vscode.Uri.joinPath(this.context.globalStorageUri, 'decision-history.json');
            const historyData = Buffer.from(JSON.stringify(this.decisionHistory, null, 2));
            await vscode.workspace.fs.writeFile(historyPath, historyData);
            this.logger.debug('Saved decision history');
        } catch (error) {
            this.logger.warn('Could not save decision history', error as Error);
        }
    }
}

// Supporting interfaces
interface ApprovalStep {
    decisionType: DecisionType;
    question: string;
    options?: DecisionOption[];
    urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timeout?: number;
}

interface CheckpointCriteria {
    name: string;
    description: string;
    completed: boolean;
    evidence?: string;
}

interface FeedbackInsights {
    totalDecisions: number;
    averageResponseTime: number;
    decisionTypes: Record<DecisionType, number>;
    feedbackSentiment: string;
    commonIssues: string[];
    agentPerformance: Record<AgentId, number>;
    recommendations: string[];
}
