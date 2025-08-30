import * as vscode from 'vscode';
import { AgentOrchestrator } from '../orchestrator/AgentOrchestrator';

export class DashboardProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'devTeam.dashboard';

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly orchestrator: AgentOrchestrator
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'refresh':
                    await this.updateDashboard(webviewView.webview);
                    break;
                case 'createProject':
                    await vscode.commands.executeCommand('devTeam.startProject');
                    break;
                case 'assignTask':
                    await vscode.commands.executeCommand('devTeam.assignTask');
                    break;
            }
        });

        // Initial dashboard load
        this.updateDashboard(webviewView.webview);
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.updateDashboard(webviewView.webview);
        }, 30000);
    }

    private async updateDashboard(webview: vscode.Webview) {
        try {
            // Get current project status
            const agents = await this.orchestrator.getAllAgents();
            const tasks = await this.orchestrator.getAvailableTasks();
            const templates = await this.orchestrator.getProjectTemplates();

            const dashboardData = {
                agents: agents.map(agent => ({
                    id: agent.id,
                    type: agent.type,
                    status: agent.status,
                    capabilities: agent.capabilities
                })),
                tasks: tasks.map(task => ({
                    id: task.id,
                    title: task.title,
                    type: task.type,
                    priority: task.priority,
                    status: task.status,
                    assignedTo: task.assignedTo
                })),
                templates: templates.map(template => ({
                    id: template.id,
                    name: template.name,
                    description: template.description,
                    complexity: template.complexity
                })),
                statistics: {
                    totalAgents: agents.length,
                    activeAgents: agents.filter(a => a.status === 'READY' || a.status === 'BUSY').length,
                    totalTasks: tasks.length,
                    completedTasks: 0, // This would come from database
                    projectsActive: 0  // This would come from database
                }
            };

            await webview.postMessage({
                type: 'dashboardUpdate',
                data: dashboardData
            });

        } catch (error) {
            console.error('Failed to update dashboard:', error);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dev Team Dashboard</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 16px;
                }
                
                .dashboard-container {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                
                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                
                .dashboard-title {
                    font-size: 18px;
                    font-weight: bold;
                    margin: 0;
                }
                
                .refresh-btn {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .refresh-btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                
                .stat-card {
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                    padding: 12px;
                    text-align: center;
                }
                
                .stat-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: var(--vscode-textLink-foreground);
                    margin: 0;
                }
                
                .stat-label {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin: 4px 0 0 0;
                }
                
                .section {
                    background-color: var(--vscode-sideBar-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                    padding: 16px;
                    margin-bottom: 16px;
                }
                
                .section-title {
                    font-size: 14px;
                    font-weight: bold;
                    margin: 0 0 12px 0;
                    color: var(--vscode-foreground);
                }
                
                .agent-list, .task-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .agent-item, .task-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px;
                    background-color: var(--vscode-list-inactiveSelectionBackground);
                    border-radius: 4px;
                }
                
                .agent-info, .task-info {
                    flex: 1;
                }
                
                .agent-name, .task-title {
                    font-size: 13px;
                    font-weight: 500;
                    margin: 0;
                }
                
                .agent-type, .task-type {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                    margin: 2px 0 0 0;
                }
                
                .status-badge {
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 10px;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                
                .status-ready { background-color: var(--vscode-testing-iconPassed); color: white; }
                .status-busy { background-color: var(--vscode-testing-iconQueued); color: white; }
                .status-error { background-color: var(--vscode-testing-iconFailed); color: white; }
                .status-offline { background-color: var(--vscode-descriptionForeground); color: white; }
                
                .priority-critical { border-left: 4px solid var(--vscode-testing-iconFailed); }
                .priority-high { border-left: 4px solid var(--vscode-testing-iconQueued); }
                .priority-medium { border-left: 4px solid var(--vscode-testing-iconPassed); }
                .priority-low { border-left: 4px solid var(--vscode-descriptionForeground); }
                
                .action-buttons {
                    display: flex;
                    gap: 8px;
                    margin-top: 20px;
                }
                
                .action-btn {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    flex: 1;
                }
                
                .action-btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .no-items {
                    text-align: center;
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                    padding: 20px;
                }
            </style>
        </head>
        <body>
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h2 class="dashboard-title">Dev Team Dashboard</h2>
                    <button class="refresh-btn" onclick="refresh()">🔄 Refresh</button>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value" id="totalAgents">-</div>
                        <div class="stat-label">Total Agents</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="activeAgents">-</div>
                        <div class="stat-label">Active Agents</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="totalTasks">-</div>
                        <div class="stat-label">Total Tasks</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="projectsActive">-</div>
                        <div class="stat-label">Active Projects</div>
                    </div>
                </div>
                
                <div class="section">
                    <h3 class="section-title">Agents Status</h3>
                    <div class="agent-list" id="agentList">
                        <div class="no-items">Loading agents...</div>
                    </div>
                </div>
                
                <div class="section">
                    <h3 class="section-title">Recent Tasks</h3>
                    <div class="task-list" id="taskList">
                        <div class="no-items">Loading tasks...</div>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button class="action-btn" onclick="createProject()">🚀 New Project</button>
                    <button class="action-btn" onclick="assignTask()">📋 Assign Task</button>
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function refresh() {
                    vscode.postMessage({ type: 'refresh' });
                }
                
                function createProject() {
                    vscode.postMessage({ type: 'createProject' });
                }
                
                function assignTask() {
                    vscode.postMessage({ type: 'assignTask' });
                }
                
                // Handle messages from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'dashboardUpdate') {
                        updateDashboard(message.data);
                    }
                });
                
                function updateDashboard(data) {
                    // Update statistics
                    document.getElementById('totalAgents').textContent = data.statistics.totalAgents;
                    document.getElementById('activeAgents').textContent = data.statistics.activeAgents;
                    document.getElementById('totalTasks').textContent = data.statistics.totalTasks;
                    document.getElementById('projectsActive').textContent = data.statistics.projectsActive;
                    
                    // Update agent list
                    const agentList = document.getElementById('agentList');
                    if (data.agents.length === 0) {
                        agentList.innerHTML = '<div class="no-items">No agents available</div>';
                    } else {
                        agentList.innerHTML = data.agents.map(agent => \`
                            <div class="agent-item">
                                <div class="agent-info">
                                    <div class="agent-name">\${agent.id}</div>
                                    <div class="agent-type">\${agent.type}</div>
                                </div>
                                <span class="status-badge status-\${agent.status.toLowerCase()}">\${agent.status}</span>
                            </div>
                        \`).join('');
                    }
                    
                    // Update task list
                    const taskList = document.getElementById('taskList');
                    if (data.tasks.length === 0) {
                        taskList.innerHTML = '<div class="no-items">No tasks available</div>';
                    } else {
                        taskList.innerHTML = data.tasks.slice(0, 5).map(task => \`
                            <div class="task-item priority-\${task.priority.toLowerCase()}">
                                <div class="task-info">
                                    <div class="task-title">\${task.title}</div>
                                    <div class="task-type">\${task.type} • \${task.priority}</div>
                                </div>
                                <span class="status-badge status-\${task.status.toLowerCase().replace('_', '-')}">\${task.status}</span>
                            </div>
                        \`).join('');
                    }
                }
                
                // Request initial data
                refresh();
            </script>
        </body>
        </html>`;
    }
}
