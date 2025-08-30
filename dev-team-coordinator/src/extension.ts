import * as vscode from 'vscode';
import { AgentOrchestrator } from './orchestrator/AgentOrchestrator';
import { DashboardProvider } from './ui/DashboardProvider';
import { TaskProvider } from './ui/TaskProvider';
import { AgentProvider } from './ui/AgentProvider';
import { ExtensionConfig, Logger } from './types';
import { createLogger } from './utils/logger';
import { DatabaseManager } from './utils/database';

let orchestrator: AgentOrchestrator | undefined;
let logger: Logger;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    logger = createLogger(context);
    logger.info('Dev Team Coordinator extension is activating...');

    try {
        // Initialize configuration
        const config = await getConfiguration(context);
        
        // Set extension context for global access
        await vscode.commands.executeCommand('setContext', 'devTeam.activated', true);
        
        // Initialize database
        const dbManager = new DatabaseManager(config.databasePath);
        await dbManager.initialize();
        
        // Initialize agent orchestration engine
        orchestrator = new AgentOrchestrator(context, config, logger, dbManager);
        await orchestrator.initialize();
        
        // Register VS Code providers
        const dashboardProvider = new DashboardProvider(context.extensionUri, orchestrator);
        const taskProvider = new TaskProvider(orchestrator);
        const agentProvider = new AgentProvider(orchestrator);
        
        // Register webview and tree view providers
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('devTeam.dashboard', dashboardProvider),
            vscode.window.registerTreeDataProvider('devTeam.tasks', taskProvider),
            vscode.window.registerTreeDataProvider('devTeam.agents', agentProvider)
        );
        
        // Register commands
        context.subscriptions.push(
            vscode.commands.registerCommand('devTeam.startProject', startProjectCommand),
            vscode.commands.registerCommand('devTeam.assignTask', assignTaskCommand),
            vscode.commands.registerCommand('devTeam.showDashboard', showDashboardCommand),
            vscode.commands.registerCommand('devTeam.configureAgents', configureAgentsCommand),
            vscode.commands.registerCommand('devTeam.refreshTasks', () => taskProvider.refresh()),
            vscode.commands.registerCommand('devTeam.refreshAgents', () => agentProvider.refresh())
        );
        
        // Register configuration change handler
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(async (e) => {
                if (e.affectsConfiguration('devTeam')) {
                    logger.info('Configuration changed, updating agents...');
                    const newConfig = await getConfiguration(context);
                    await orchestrator?.updateConfiguration(newConfig);
                }
            })
        );
        
        // Start the orchestration engine
        await orchestrator.start();
        
        logger.info('Dev Team Coordinator extension activated successfully');
        
        // Show welcome message on first activation
        const hasShownWelcome = context.globalState.get('devTeam.hasShownWelcome', false);
        if (!hasShownWelcome) {
            await showWelcomeMessage(context);
            await context.globalState.update('devTeam.hasShownWelcome', true);
        }
        
    } catch (error) {
        logger.error('Failed to activate Dev Team Coordinator extension', error as Error);
        vscode.window.showErrorMessage(
            `Failed to activate Dev Team Coordinator: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

export async function deactivate(): Promise<void> {
    logger?.info('Dev Team Coordinator extension is deactivating...');
    
    try {
        if (orchestrator) {
            await orchestrator.stop();
            orchestrator = undefined;
        }
        
        // Set extension context to deactivated
        await vscode.commands.executeCommand('setContext', 'devTeam.activated', false);
        
        logger?.info('Dev Team Coordinator extension deactivated successfully');
    } catch (error) {
        logger?.error('Error during deactivation', error as Error);
    }
}

// Command Implementations
async function startProjectCommand(): Promise<void> {
    logger.info('Starting new project command');
    
    try {
        if (!orchestrator) {
            vscode.window.showErrorMessage('Dev Team Coordinator is not initialized');
            return;
        }
        
        // Show project template selection
        const templates = await orchestrator.getProjectTemplates();
        const templateNames = templates.map(t => ({ label: t.name, description: t.description, template: t }));
        
        const selectedTemplate = await vscode.window.showQuickPick(templateNames, {
            placeHolder: 'Select a project template',
            title: 'New Project'
        });
        
        if (!selectedTemplate) {
            return;
        }
        
        // Get project details
        const projectName = await vscode.window.showInputBox({
            prompt: 'Enter project name',
            placeHolder: 'my-awesome-project',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Project name is required';
                }
                if (!/^[a-z0-9-]+$/.test(value)) {
                    return 'Project name must contain only lowercase letters, numbers, and hyphens';
                }
                return undefined;
            }
        });
        
        if (!projectName) {
            return;
        }
        
        // Create project
        await orchestrator.createProject(selectedTemplate.template, projectName);
        
        vscode.window.showInformationMessage(
            `Project "${projectName}" created successfully! Check the Tasks view for development progress.`
        );
        
    } catch (error) {
        logger.error('Error starting new project', error as Error);
        vscode.window.showErrorMessage(`Failed to start new project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function assignTaskCommand(): Promise<void> {
    logger.info('Assigning task command');
    
    try {
        if (!orchestrator) {
            vscode.window.showErrorMessage('Dev Team Coordinator is not initialized');
            return;
        }
        
        // Get available tasks
        const tasks = await orchestrator.getAvailableTasks();
        if (tasks.length === 0) {
            vscode.window.showInformationMessage('No available tasks to assign');
            return;
        }
        
        // Show task selection
        const taskItems = tasks.map(t => ({ 
            label: t.title, 
            description: `Priority: ${t.priority} | Type: ${t.type}`,
            detail: t.description,
            task: t 
        }));
        
        const selectedTask = await vscode.window.showQuickPick(taskItems, {
            placeHolder: 'Select a task to assign',
            title: 'Assign Task'
        });
        
        if (!selectedTask) {
            return;
        }
        
        // Get available agents
        const agents = await orchestrator.getAvailableAgents(selectedTask.task.type);
        if (agents.length === 0) {
            vscode.window.showWarningMessage('No agents available for this task type');
            return;
        }
        
        // Show agent selection
        const agentItems = agents.map(a => ({ 
            label: `${a.id} (${a.type})`, 
            description: `Status: ${a.status} | Skill: ${a.capabilities.skillLevel}`,
            agent: a 
        }));
        
        const selectedAgent = await vscode.window.showQuickPick(agentItems, {
            placeHolder: 'Select an agent',
            title: 'Assign to Agent'
        });
        
        if (!selectedAgent) {
            return;
        }
        
        // Assign task
        await orchestrator.assignTask(selectedTask.task.id, selectedAgent.agent.id);
        
        vscode.window.showInformationMessage(
            `Task "${selectedTask.task.title}" assigned to ${selectedAgent.agent.id}`
        );
        
    } catch (error) {
        logger.error('Error assigning task', error as Error);
        vscode.window.showErrorMessage(`Failed to assign task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function showDashboardCommand(): Promise<void> {
    logger.info('Showing dashboard command');
    
    try {
        // Focus on the dashboard view
        await vscode.commands.executeCommand('devTeam.dashboard.focus');
        
    } catch (error) {
        logger.error('Error showing dashboard', error as Error);
        vscode.window.showErrorMessage(`Failed to show dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function configureAgentsCommand(): Promise<void> {
    logger.info('Configuring agents command');
    
    try {
        // Open extension settings
        await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:dev-team.dev-team-coordinator');
        
    } catch (error) {
        logger.error('Error opening agent configuration', error as Error);
        vscode.window.showErrorMessage(`Failed to open configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Configuration Management
async function getConfiguration(context: vscode.ExtensionContext): Promise<ExtensionConfig> {
    const config = vscode.workspace.getConfiguration('devTeam');
    
    // Get API keys from secure storage or configuration
    let anthropicApiKey = await context.secrets.get('devTeam.anthropicApiKey') || 
                         config.get<string>('anthropicApiKey', '');
    let tavilyApiKey = await context.secrets.get('devTeam.tavilyApiKey') || 
                      config.get<string>('tavilyApiKey', '');
    
    // Store in secure storage if provided via configuration
    if (!anthropicApiKey && config.get<string>('anthropicApiKey')) {
        anthropicApiKey = config.get<string>('anthropicApiKey', '');
        await context.secrets.store('devTeam.anthropicApiKey', anthropicApiKey);
    }
    
    if (!tavilyApiKey && config.get<string>('tavilyApiKey')) {
        tavilyApiKey = config.get<string>('tavilyApiKey', '');
        await context.secrets.store('devTeam.tavilyApiKey', tavilyApiKey);
    }
    
    return {
        anthropicApiKey,
        tavilyApiKey,
        maxConcurrentTasks: config.get<number>('maxConcurrentTasks', 3),
        logLevel: config.get<string>('logLevel', 'info'),
        databasePath: context.globalStorageUri.fsPath + '/devteam.db',
        agentTimeout: config.get<number>('agentTimeout', 30000),
        enableTelemetry: config.get<boolean>('enableTelemetry', true)
    };
}

// Welcome Message
async function showWelcomeMessage(context: vscode.ExtensionContext): Promise<void> {
    const message = 'Welcome to Dev Team Coordinator! Your AI development team is ready to help you build amazing projects.';
    const setupAction = 'Setup API Keys';
    const docsAction = 'View Documentation';
    
    const selection = await vscode.window.showInformationMessage(message, setupAction, docsAction);
    
    if (selection === setupAction) {
        await vscode.commands.executeCommand('devTeam.configureAgents');
    } else if (selection === docsAction) {
        await vscode.env.openExternal(vscode.Uri.parse('https://github.com/dev-team/coordinator#readme'));
    }
}
