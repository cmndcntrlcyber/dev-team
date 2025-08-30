import * as vscode from 'vscode';
import { AgentOrchestrator } from '../orchestrator/AgentOrchestrator';
import { AgentTask } from '../types';

export class TaskProvider implements vscode.TreeDataProvider<TaskItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TaskItem | undefined | null | void> = new vscode.EventEmitter<TaskItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TaskItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private orchestrator: AgentOrchestrator) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TaskItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TaskItem): Promise<TaskItem[]> {
        if (!element) {
            // Root level - get all tasks
            try {
                const tasks = await this.orchestrator.getAvailableTasks();
                return tasks.map(task => new TaskItem(
                    task.title,
                    task.description,
                    task.status,
                    task.priority,
                    task.assignedTo,
                    vscode.TreeItemCollapsibleState.None
                ));
            } catch (error) {
                return [new TaskItem(
                    'Error loading tasks',
                    'Failed to load tasks from database',
                    'ERROR' as any,
                    'HIGH' as any,
                    undefined,
                    vscode.TreeItemCollapsibleState.None
                )];
            }
        }
        return [];
    }
}

export class TaskItem extends vscode.TreeItem {
    constructor(
        public readonly title: string,
        public readonly description: string,
        public readonly status: string,
        public readonly priority: string,
        public readonly assignedTo: string | undefined,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(title, collapsibleState);
        this.tooltip = `${this.title}\n${this.description}\nStatus: ${status}\nPriority: ${priority}`;
        this.description = `${status} • ${priority}`;
        
        // Set icon based on priority
        switch (priority) {
            case 'CRITICAL':
                this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
                break;
            case 'HIGH':
                this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('warningForeground'));
                break;
            case 'MEDIUM':
                this.iconPath = new vscode.ThemeIcon('info');
                break;
            case 'LOW':
                this.iconPath = new vscode.ThemeIcon('circle-outline');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('circle');
        }

        // Set context value for command handling
        this.contextValue = 'task';
        
        // Add command to assign task
        this.command = {
            command: 'devTeam.assignTask',
            title: 'Assign Task',
            arguments: [this.title]
        };
    }
}
