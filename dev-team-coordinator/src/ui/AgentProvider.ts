import * as vscode from 'vscode';
import { AgentOrchestrator } from '../orchestrator/AgentOrchestrator';
import { BaseAgent } from '../types';

export class AgentProvider implements vscode.TreeDataProvider<AgentItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AgentItem | undefined | null | void> = new vscode.EventEmitter<AgentItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AgentItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private orchestrator: AgentOrchestrator) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AgentItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: AgentItem): Promise<AgentItem[]> {
        if (!element) {
            // Root level - get all agents
            try {
                const agents = await this.orchestrator.getAllAgents();
                return agents.map(agent => new AgentItem(
                    agent.id,
                    agent.type,
                    agent.status,
                    agent.capabilities.skillLevel,
                    vscode.TreeItemCollapsibleState.None
                ));
            } catch (error) {
                return [new AgentItem(
                    'No agents available',
                    'UNKNOWN',
                    'OFFLINE',
                    'junior',
                    vscode.TreeItemCollapsibleState.None
                )];
            }
        }
        return [];
    }
}

export class AgentItem extends vscode.TreeItem {
    constructor(
        public readonly agentId: string,
        public readonly agentType: string,
        public readonly status: string,
        public readonly skillLevel: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(agentId, collapsibleState);
        
        this.description = `${agentType} • ${status}`;
        
        // Set icon based on status
        switch (status) {
            case 'READY':
                this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
                break;
            case 'BUSY':
                this.iconPath = new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('testing.iconQueued'));
                break;
            case 'BLOCKED':
                this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('warningForeground'));
                break;
            case 'ERROR':
                this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
                break;
            case 'OFFLINE':
                this.iconPath = new vscode.ThemeIcon('circle-outline');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('person');
        }

        // Set context value for command handling
        this.contextValue = 'agent';
    }
}
