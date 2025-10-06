#!/usr/bin/env node

/**
 * Dev-Team API Client
 * 
 * Reusable helper functions for interacting with the dev-team platform API
 * Used by Cline for task delegation, monitoring, and verification
 * 
 * @version 1.0.0
 */

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Make HTTP request to dev-team API
 * @param {string} endpoint - API endpoint path
 * @param {string} method - HTTP method
 * @param {object} data - Request body (for POST/PUT)
 * @returns {Promise<object>} Response data
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to ${method} ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * Check if dev-team services are healthy
 * @returns {Promise<object>} Health status and stats
 */
async function checkHealth() {
  try {
    const stats = await apiRequest('/dashboard/stats');
    return {
      healthy: true,
      stats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get all available AI agents
 * @returns {Promise<array>} List of agents
 */
async function getAgents() {
  return await apiRequest('/ai-agents');
}

/**
 * Get specific agent details
 * @param {number} agentId - Agent ID
 * @returns {Promise<object>} Agent details
 */
async function getAgent(agentId) {
  return await apiRequest(`/ai-agents/${agentId}`);
}

/**
 * Create a new project
 * @param {object} projectData - Project details
 * @returns {Promise<object>} Created project
 */
async function createProject(projectData) {
  const requiredFields = ['name', 'description'];
  for (const field of requiredFields) {
    if (!projectData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  const payload = {
    name: projectData.name,
    description: projectData.description,
    status: projectData.status || 'active',
    priority: projectData.priority || 'medium',
    ...projectData
  };

  return await apiRequest('/projects', 'POST', payload);
}

/**
 * Get all projects
 * @param {object} filters - Optional filters
 * @returns {Promise<array>} List of projects
 */
async function getProjects(filters = {}) {
  const queryParams = new URLSearchParams(filters).toString();
  const endpoint = queryParams ? `/projects?${queryParams}` : '/projects';
  return await apiRequest(endpoint);
}

/**
 * Get specific project details
 * @param {number} projectId - Project ID
 * @returns {Promise<object>} Project details
 */
async function getProject(projectId) {
  return await apiRequest(`/projects/${projectId}`);
}

/**
 * Update project
 * @param {number} projectId - Project ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated project
 */
async function updateProject(projectId, updates) {
  return await apiRequest(`/projects/${projectId}`, 'PUT', updates);
}

/**
 * Create a new task
 * @param {object} taskData - Task details
 * @returns {Promise<object>} Created task
 */
async function createTask(taskData) {
  const requiredFields = ['projectId', 'title', 'description'];
  for (const field of requiredFields) {
    if (!taskData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  const payload = {
    projectId: taskData.projectId,
    title: taskData.title,
    description: taskData.description,
    status: taskData.status || 'pending',
    priority: taskData.priority || 'medium',
    assignedTo: taskData.assignedTo || null,
    dependencies: taskData.dependencies || [],
    ...taskData
  };

  return await apiRequest('/tasks', 'POST', payload);
}

/**
 * Get tasks with optional filters
 * @param {object} filters - Filter criteria (projectId, status, etc.)
 * @returns {Promise<array>} List of tasks
 */
async function getTasks(filters = {}) {
  const queryParams = new URLSearchParams(filters).toString();
  const endpoint = queryParams ? `/tasks?${queryParams}` : '/tasks';
  return await apiRequest(endpoint);
}

/**
 * Get specific task details
 * @param {number} taskId - Task ID
 * @returns {Promise<object>} Task details
 */
async function getTask(taskId) {
  return await apiRequest(`/tasks/${taskId}`);
}

/**
 * Update task
 * @param {number} taskId - Task ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated task
 */
async function updateTask(taskId, updates) {
  return await apiRequest(`/tasks/${taskId}`, 'PUT', updates);
}

/**
 * Approve a task (mark as completed)
 * @param {number} taskId - Task ID
 * @returns {Promise<object>} Updated task
 */
async function approveTask(taskId) {
  return await updateTask(taskId, { status: 'completed' });
}

/**
 * Request changes on a task (send back to agent)
 * @param {number} taskId - Task ID
 * @param {string} feedback - Specific feedback for the agent
 * @returns {Promise<object>} Updated task
 */
async function requestTaskChanges(taskId, feedback) {
  const task = await getTask(taskId);
  const updatedDescription = `${task.description}\n\n--- FEEDBACK ---\n${feedback}`;
  
  return await updateTask(taskId, {
    status: 'pending',
    description: updatedDescription
  });
}

/**
 * Get project tasks grouped by status
 * @param {number} projectId - Project ID
 * @returns {Promise<object>} Tasks organized by status
 */
async function getProjectTasksByStatus(projectId) {
  const tasks = await getTasks({ projectId });
  
  return {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    review: tasks.filter(t => t.status === 'review'),
    completed: tasks.filter(t => t.status === 'completed'),
    blocked: tasks.filter(t => t.status === 'blocked'),
    failed: tasks.filter(t => t.status === 'failed'),
  };
}

/**
 * Monitor project progress
 * @param {number} projectId - Project ID
 * @returns {Promise<object>} Progress summary
 */
async function getProjectProgress(projectId) {
  const tasksByStatus = await getProjectTasksByStatus(projectId);
  const allTasks = Object.values(tasksByStatus).flat();
  const totalTasks = allTasks.length;
  const completedTasks = tasksByStatus.completed.length;
  const activeTasks = tasksByStatus.in_progress.length + tasksByStatus.review.length;
  
  return {
    projectId,
    totalTasks,
    completedTasks,
    activeTasks,
    pendingTasks: tasksByStatus.pending.length,
    blockedTasks: tasksByStatus.blocked.length,
    failedTasks: tasksByStatus.failed.length,
    completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    tasksByStatus
  };
}

/**
 * Wait for task to reach specific status
 * @param {number} taskId - Task ID
 * @param {string} targetStatus - Status to wait for
 * @param {number} timeoutMs - Timeout in milliseconds (default: 5 minutes)
 * @param {number} pollIntervalMs - Poll interval in milliseconds (default: 5 seconds)
 * @returns {Promise<object>} Task when it reaches target status
 */
async function waitForTaskStatus(taskId, targetStatus, timeoutMs = 300000, pollIntervalMs = 5000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const task = await getTask(taskId);
    
    if (task.status === targetStatus) {
      return task;
    }
    
    if (task.status === 'failed') {
      throw new Error(`Task ${taskId} failed`);
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  throw new Error(`Timeout waiting for task ${taskId} to reach status: ${targetStatus}`);
}

/**
 * Create multiple tasks in batch
 * @param {array} tasksData - Array of task objects
 * @returns {Promise<array>} Created tasks
 */
async function createTasksBatch(tasksData) {
  const createdTasks = [];
  
  for (const taskData of tasksData) {
    try {
      const task = await createTask(taskData);
      createdTasks.push(task);
    } catch (error) {
      console.error(`Failed to create task "${taskData.title}":`, error.message);
      throw error;
    }
  }
  
  return createdTasks;
}

/**
 * Format project summary for display
 * @param {number} projectId - Project ID
 * @returns {Promise<string>} Formatted summary
 */
async function formatProjectSummary(projectId) {
  const project = await getProject(projectId);
  const progress = await getProjectProgress(projectId);
  
  let summary = `📊 Project: ${project.name}\n`;
  summary += `Status: ${project.status}\n`;
  summary += `Progress: ${progress.completionPercentage}% (${progress.completedTasks}/${progress.totalTasks} tasks)\n\n`;
  
  if (progress.activeTasks > 0) {
    summary += `🔄 Active Tasks (${progress.activeTasks}):\n`;
    progress.tasksByStatus.in_progress.forEach(task => {
      summary += `  - ${task.title} (${task.assignedTo})\n`;
    });
    progress.tasksByStatus.review.forEach(task => {
      summary += `  - ${task.title} (ready for review)\n`;
    });
  }
  
  if (progress.pendingTasks > 0) {
    summary += `\n⏸️  Pending Tasks (${progress.pendingTasks}):\n`;
    progress.tasksByStatus.pending.forEach(task => {
      summary += `  - ${task.title}\n`;
    });
  }
  
  if (progress.blockedTasks > 0) {
    summary += `\n🚫 Blocked Tasks (${progress.blockedTasks}):\n`;
    progress.tasksByStatus.blocked.forEach(task => {
      summary += `  - ${task.title}\n`;
    });
  }
  
  return summary;
}

// Export functions for use in Cline
module.exports = {
  // Health & Status
  checkHealth,
  
  // Agents
  getAgents,
  getAgent,
  
  // Projects
  createProject,
  getProjects,
  getProject,
  updateProject,
  
  // Tasks
  createTask,
  createTasksBatch,
  getTasks,
  getTask,
  updateTask,
  approveTask,
  requestTaskChanges,
  
  // Monitoring
  getProjectTasksByStatus,
  getProjectProgress,
  waitForTaskStatus,
  formatProjectSummary,
  
  // Low-level
  apiRequest
};

// CLI interface for testing
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  (async () => {
    try {
      switch (command) {
        case 'health':
          const health = await checkHealth();
          console.log(JSON.stringify(health, null, 2));
          break;
          
        case 'agents':
          const agents = await getAgents();
          console.log(JSON.stringify(agents, null, 2));
          break;
          
        case 'projects':
          const projects = await getProjects();
          console.log(JSON.stringify(projects, null, 2));
          break;
          
        case 'tasks':
          const projectId = args[1];
          if (!projectId) {
            console.error('Usage: node dev-team-api.js tasks <projectId>');
            process.exit(1);
          }
          const tasks = await getTasks({ projectId: parseInt(projectId) });
          console.log(JSON.stringify(tasks, null, 2));
          break;
          
        case 'progress':
          const pid = args[1];
          if (!pid) {
            console.error('Usage: node dev-team-api.js progress <projectId>');
            process.exit(1);
          }
          const summary = await formatProjectSummary(parseInt(pid));
          console.log(summary);
          break;
          
        default:
          console.log('Dev-Team API Client');
          console.log('\nUsage: node dev-team-api.js <command> [args]');
          console.log('\nCommands:');
          console.log('  health              - Check API health');
          console.log('  agents              - List all agents');
          console.log('  projects            - List all projects');
          console.log('  tasks <projectId>   - List project tasks');
          console.log('  progress <projectId> - Show project progress');
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
}
