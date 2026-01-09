import { AgentType } from '@dev-team-platform/types';
import { ToolPermission, AgentToolConfig } from './types';

/**
 * Tool names available in Claude Code
 */
export enum ToolName {
  Read = 'Read',
  Write = 'Write',
  Edit = 'Edit',
  Bash = 'Bash',
  Glob = 'Glob',
  Grep = 'Grep',
  WebFetch = 'WebFetch',
  WebSearch = 'WebSearch',
  Task = 'Task',
  TodoWrite = 'TodoWrite',
  NotebookEdit = 'NotebookEdit',
}

/**
 * Default tool permissions for each agent type
 * Based on the principle of least privilege - each agent only gets tools needed for their role
 */
export const DEFAULT_AGENT_TOOLS: AgentToolConfig = {
  // Architecture Lead: Primarily reads and analyzes, can spawn subagents for research
  // Cannot directly write code (review only)
  ARCHITECTURE_LEAD: [
    { name: ToolName.Read, enabled: true },
    { name: ToolName.Glob, enabled: true },
    { name: ToolName.Grep, enabled: true },
    { name: ToolName.WebSearch, enabled: true },
    { name: ToolName.WebFetch, enabled: true },
    { name: ToolName.Task, enabled: true }, // Can spawn subagents
    { name: ToolName.TodoWrite, enabled: true },
    { name: ToolName.Write, enabled: false, restrictions: { readOnly: true } },
    { name: ToolName.Edit, enabled: false, restrictions: { readOnly: true } },
    { name: ToolName.Bash, enabled: false },
  ],

  // Frontend Core: Full access to UI-related files and npm commands
  FRONTEND_CORE: [
    { name: ToolName.Read, enabled: true },
    { name: ToolName.Write, enabled: true, restrictions: { allowedPaths: ['src/**', 'components/**', 'pages/**', 'styles/**', 'public/**', '*.tsx', '*.ts', '*.css', '*.scss'] } },
    { name: ToolName.Edit, enabled: true, restrictions: { allowedPaths: ['src/**', 'components/**', 'pages/**', 'styles/**', '*.tsx', '*.ts', '*.css', '*.scss'] } },
    { name: ToolName.Glob, enabled: true },
    { name: ToolName.Grep, enabled: true },
    { name: ToolName.Bash, enabled: true, restrictions: { allowedCommands: ['npm', 'yarn', 'pnpm', 'npx', 'node', 'tsc', 'eslint', 'prettier'] } },
    { name: ToolName.WebFetch, enabled: true },
    { name: ToolName.TodoWrite, enabled: true },
    { name: ToolName.WebSearch, enabled: false },
    { name: ToolName.Task, enabled: false },
  ],

  // Frontend UI/UX: Similar to Frontend Core, focused on styling and components
  FRONTEND_UIUX: [
    { name: ToolName.Read, enabled: true },
    { name: ToolName.Write, enabled: true, restrictions: { allowedPaths: ['src/**', 'components/**', 'styles/**', '*.tsx', '*.css', '*.scss'] } },
    { name: ToolName.Edit, enabled: true, restrictions: { allowedPaths: ['src/**', 'components/**', 'styles/**', '*.tsx', '*.css', '*.scss'] } },
    { name: ToolName.Glob, enabled: true },
    { name: ToolName.Grep, enabled: true },
    { name: ToolName.Bash, enabled: true, restrictions: { allowedCommands: ['npm', 'yarn', 'npx'] } },
    { name: ToolName.TodoWrite, enabled: true },
    { name: ToolName.WebFetch, enabled: false },
    { name: ToolName.WebSearch, enabled: false },
    { name: ToolName.Task, enabled: false },
  ],

  // Frontend Visualization: Access to chart/graph libraries and data visualization
  FRONTEND_VISUALIZATION: [
    { name: ToolName.Read, enabled: true },
    { name: ToolName.Write, enabled: true, restrictions: { allowedPaths: ['src/**', 'components/**', '*.tsx', '*.ts'] } },
    { name: ToolName.Edit, enabled: true, restrictions: { allowedPaths: ['src/**', 'components/**', '*.tsx', '*.ts'] } },
    { name: ToolName.Glob, enabled: true },
    { name: ToolName.Grep, enabled: true },
    { name: ToolName.Bash, enabled: true, restrictions: { allowedCommands: ['npm', 'yarn', 'npx'] } },
    { name: ToolName.TodoWrite, enabled: true },
    { name: ToolName.WebFetch, enabled: false },
    { name: ToolName.WebSearch, enabled: false },
    { name: ToolName.Task, enabled: false },
  ],

  // Backend Integration: Full access to server code, APIs, database migrations
  BACKEND_INTEGRATION: [
    { name: ToolName.Read, enabled: true },
    { name: ToolName.Write, enabled: true, restrictions: { allowedPaths: ['src/**', 'services/**', 'api/**', 'routes/**', 'models/**', 'migrations/**', '*.ts'] } },
    { name: ToolName.Edit, enabled: true, restrictions: { allowedPaths: ['src/**', 'services/**', 'api/**', 'routes/**', 'models/**', '*.ts'] } },
    { name: ToolName.Glob, enabled: true },
    { name: ToolName.Grep, enabled: true },
    { name: ToolName.Bash, enabled: true, restrictions: {
      allowedCommands: ['npm', 'yarn', 'node', 'tsc', 'prisma', 'knex', 'typeorm', 'sequelize', 'psql', 'redis-cli'],
      blockedCommands: ['rm -rf /', 'DROP DATABASE', 'DELETE FROM']
    }},
    { name: ToolName.TodoWrite, enabled: true },
    { name: ToolName.WebFetch, enabled: true },
    { name: ToolName.WebSearch, enabled: false },
    { name: ToolName.Task, enabled: false },
  ],

  // Quality Assurance: Read access to all code, write access only to test files
  QUALITY_ASSURANCE: [
    { name: ToolName.Read, enabled: true },
    { name: ToolName.Write, enabled: true, restrictions: { allowedPaths: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx', 'tests/**', '__tests__/**', 'e2e/**', 'cypress/**', 'playwright/**'] } },
    { name: ToolName.Edit, enabled: true, restrictions: { allowedPaths: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx', 'tests/**', '__tests__/**'] } },
    { name: ToolName.Glob, enabled: true },
    { name: ToolName.Grep, enabled: true },
    { name: ToolName.Bash, enabled: true, restrictions: { allowedCommands: ['npm', 'yarn', 'jest', 'vitest', 'playwright', 'cypress', 'mocha', 'pytest'] } },
    { name: ToolName.TodoWrite, enabled: true },
    { name: ToolName.WebFetch, enabled: false },
    { name: ToolName.WebSearch, enabled: false },
    { name: ToolName.Task, enabled: false },
  ],

  // DevOps: Access to infrastructure files, CI/CD, Docker, Kubernetes
  DEVOPS: [
    { name: ToolName.Read, enabled: true },
    { name: ToolName.Write, enabled: true, restrictions: { allowedPaths: ['Dockerfile*', 'docker-compose*.yml', '.github/**', '.gitlab-ci.yml', 'k8s/**', 'kubernetes/**', 'terraform/**', 'ansible/**', 'infrastructure/**', '*.yaml', '*.yml'] } },
    { name: ToolName.Edit, enabled: true, restrictions: { allowedPaths: ['Dockerfile*', 'docker-compose*.yml', '.github/**', 'k8s/**', 'kubernetes/**', 'infrastructure/**'] } },
    { name: ToolName.Glob, enabled: true },
    { name: ToolName.Grep, enabled: true },
    { name: ToolName.Bash, enabled: true, restrictions: {
      allowedCommands: ['docker', 'docker-compose', 'kubectl', 'helm', 'terraform', 'ansible', 'aws', 'gcloud', 'az', 'npm', 'yarn'],
      blockedCommands: ['rm -rf /', 'kubectl delete namespace production', '--force']
    }},
    { name: ToolName.TodoWrite, enabled: true },
    { name: ToolName.WebFetch, enabled: true },
    { name: ToolName.WebSearch, enabled: true },
    { name: ToolName.Task, enabled: false },
  ],

  // MCP Integration: Full access - needs all tools for MCP server development
  MCP_INTEGRATION: [
    { name: ToolName.Read, enabled: true },
    { name: ToolName.Write, enabled: true },
    { name: ToolName.Edit, enabled: true },
    { name: ToolName.Glob, enabled: true },
    { name: ToolName.Grep, enabled: true },
    { name: ToolName.Bash, enabled: true },
    { name: ToolName.WebFetch, enabled: true },
    { name: ToolName.WebSearch, enabled: true },
    { name: ToolName.Task, enabled: true },
    { name: ToolName.TodoWrite, enabled: true },
    { name: ToolName.NotebookEdit, enabled: true },
  ],
};

/**
 * Get tool permissions for a specific agent type
 */
export function getToolsForAgent(agentType: AgentType): ToolPermission[] {
  return DEFAULT_AGENT_TOOLS[agentType] || [];
}

/**
 * Get enabled tools for an agent (returns only tool names)
 */
export function getEnabledTools(agentType: AgentType): string[] {
  return getToolsForAgent(agentType)
    .filter((tool) => tool.enabled)
    .map((tool) => tool.name);
}

/**
 * Get disabled tools for an agent (returns only tool names)
 */
export function getDisabledTools(agentType: AgentType): string[] {
  return getToolsForAgent(agentType)
    .filter((tool) => !tool.enabled)
    .map((tool) => tool.name);
}

/**
 * Check if a specific tool is enabled for an agent
 */
export function isToolEnabled(agentType: AgentType, toolName: string): boolean {
  const tools = getToolsForAgent(agentType);
  const tool = tools.find((t) => t.name === toolName);
  return tool?.enabled ?? false;
}

/**
 * Get tool restrictions for an agent's tool
 */
export function getToolRestrictions(agentType: AgentType, toolName: string) {
  const tools = getToolsForAgent(agentType);
  const tool = tools.find((t) => t.name === toolName);
  return tool?.restrictions;
}

/**
 * Merge custom tool permissions with defaults
 */
export function mergeToolPermissions(
  agentType: AgentType,
  customPermissions: Partial<ToolPermission>[]
): ToolPermission[] {
  const defaults = getToolsForAgent(agentType);

  return defaults.map((defaultTool) => {
    const custom = customPermissions.find((c) => c.name === defaultTool.name);
    if (custom) {
      return {
        ...defaultTool,
        ...custom,
        restrictions: {
          ...defaultTool.restrictions,
          ...custom.restrictions,
        },
      };
    }
    return defaultTool;
  });
}

/**
 * Create a read-only tool set for code review scenarios
 */
export function createReadOnlyToolSet(): ToolPermission[] {
  return [
    { name: ToolName.Read, enabled: true },
    { name: ToolName.Glob, enabled: true },
    { name: ToolName.Grep, enabled: true },
    { name: ToolName.Write, enabled: false },
    { name: ToolName.Edit, enabled: false },
    { name: ToolName.Bash, enabled: false },
    { name: ToolName.WebFetch, enabled: false },
    { name: ToolName.WebSearch, enabled: false },
    { name: ToolName.Task, enabled: false },
    { name: ToolName.TodoWrite, enabled: false },
  ];
}

/**
 * Validate if a file path is allowed for an agent's tool
 */
export function isPathAllowed(
  agentType: AgentType,
  toolName: string,
  filePath: string
): boolean {
  const restrictions = getToolRestrictions(agentType, toolName);

  if (!restrictions) {
    return true; // No restrictions
  }

  if (restrictions.readOnly && (toolName === ToolName.Write || toolName === ToolName.Edit)) {
    return false;
  }

  // Check blocked paths first
  if (restrictions.blockedPaths?.length) {
    for (const pattern of restrictions.blockedPaths) {
      if (matchesGlobPattern(filePath, pattern)) {
        return false;
      }
    }
  }

  // Check allowed paths
  if (restrictions.allowedPaths?.length) {
    for (const pattern of restrictions.allowedPaths) {
      if (matchesGlobPattern(filePath, pattern)) {
        return true;
      }
    }
    return false; // Path not in allowed list
  }

  return true;
}

/**
 * Validate if a command is allowed for an agent's Bash tool
 */
export function isCommandAllowed(agentType: AgentType, command: string): boolean {
  const restrictions = getToolRestrictions(agentType, ToolName.Bash);

  if (!restrictions) {
    return true;
  }

  // Check blocked commands
  if (restrictions.blockedCommands?.length) {
    for (const blocked of restrictions.blockedCommands) {
      if (command.includes(blocked)) {
        return false;
      }
    }
  }

  // Check allowed commands
  if (restrictions.allowedCommands?.length) {
    const commandName = command.split(' ')[0];
    return restrictions.allowedCommands.some(
      (allowed) => commandName === allowed || command.startsWith(allowed)
    );
  }

  return true;
}

/**
 * Simple glob pattern matching
 */
function matchesGlobPattern(path: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}
