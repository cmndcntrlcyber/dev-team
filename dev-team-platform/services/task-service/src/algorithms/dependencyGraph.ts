interface TaskNode {
  id: string;
  dependencies: string[];
  dependents: string[];
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedHours: number;
  assignedTo?: string;
}

export class DependencyGraph {
  private nodes: Map<string, TaskNode> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseAdjacencyList: Map<string, Set<string>> = new Map();

  addTask(task: TaskNode): void {
    this.nodes.set(task.id, task);
    
    if (!this.adjacencyList.has(task.id)) {
      this.adjacencyList.set(task.id, new Set());
      this.reverseAdjacencyList.set(task.id, new Set());
    }

    // Add dependency edges
    for (const depId of task.dependencies) {
      this.addDependency(depId, task.id);
    }
  }

  addDependency(fromTaskId: string, toTaskId: string): void {
    // Check for circular dependencies before adding
    if (this.wouldCreateCycle(fromTaskId, toTaskId)) {
      throw new Error(`Adding dependency ${fromTaskId} -> ${toTaskId} would create a circular dependency`);
    }

    // Add to adjacency lists
    if (!this.adjacencyList.has(fromTaskId)) {
      this.adjacencyList.set(fromTaskId, new Set());
    }
    if (!this.reverseAdjacencyList.has(toTaskId)) {
      this.reverseAdjacencyList.set(toTaskId, new Set());
    }

    this.adjacencyList.get(fromTaskId)!.add(toTaskId);
    this.reverseAdjacencyList.get(toTaskId)!.add(fromTaskId);

    // Update task nodes
    const fromTask = this.nodes.get(fromTaskId);
    const toTask = this.nodes.get(toTaskId);
    
    if (toTask && !toTask.dependencies.includes(fromTaskId)) {
      toTask.dependencies.push(fromTaskId);
    }
    if (fromTask && !fromTask.dependents.includes(toTaskId)) {
      fromTask.dependents.push(toTaskId);
    }
  }

  removeDependency(fromTaskId: string, toTaskId: string): void {
    this.adjacencyList.get(fromTaskId)?.delete(toTaskId);
    this.reverseAdjacencyList.get(toTaskId)?.delete(fromTaskId);

    // Update task nodes
    const fromTask = this.nodes.get(fromTaskId);
    const toTask = this.nodes.get(toTaskId);
    
    if (toTask) {
      toTask.dependencies = toTask.dependencies.filter(id => id !== fromTaskId);
    }
    if (fromTask) {
      fromTask.dependents = fromTask.dependents.filter(id => id !== toTaskId);
    }
  }

  private wouldCreateCycle(fromTaskId: string, toTaskId: string): boolean {
    // Use DFS to check if adding this edge would create a cycle
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // Cycle detected
      }
      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      // Check all dependencies (including the potential new one)
      const dependencies = this.adjacencyList.get(nodeId) || new Set();
      if (nodeId === fromTaskId) {
        dependencies.add(toTaskId); // Simulate adding the new edge
      }

      for (const depId of dependencies) {
        if (dfs(depId)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    return dfs(fromTaskId);
  }

  getReadyTasks(): TaskNode[] {
    const readyTasks: TaskNode[] = [];

    for (const [taskId, task] of this.nodes) {
      if (task.status === 'NOT_STARTED') {
        const allDependenciesCompleted = task.dependencies.every(depId => {
          const depTask = this.nodes.get(depId);
          return depTask && depTask.status === 'COMPLETED';
        });

        if (allDependenciesCompleted) {
          readyTasks.push(task);
        }
      }
    }

    // Sort by priority and estimated hours
    return readyTasks.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, prefer tasks with lower estimated hours (quick wins)
      return a.estimatedHours - b.estimatedHours;
    });
  }

  getBlockedTasks(): TaskNode[] {
    return Array.from(this.nodes.values()).filter(task => {
      if (task.status !== 'NOT_STARTED') return false;
      
      return task.dependencies.some(depId => {
        const depTask = this.nodes.get(depId);
        return depTask && depTask.status !== 'COMPLETED';
      });
    });
  }

  getCriticalPath(): string[] {
    const visited = new Set<string>();
    const longestPath: string[] = [];

    const dfs = (nodeId: string, currentPath: string[], currentDuration: number): string[] => {
      if (visited.has(nodeId)) return currentPath;
      
      visited.add(nodeId);
      const node = this.nodes.get(nodeId);
      if (!node) return currentPath;

      const newPath = [...currentPath, nodeId];
      const newDuration = currentDuration + node.estimatedHours;
      
      let maxPath = newPath;
      let maxDuration = newDuration;

      // Check all dependents
      const dependents = this.adjacencyList.get(nodeId) || new Set();
      for (const dependentId of dependents) {
        const pathFromDependent = dfs(dependentId, newPath, newDuration);
        const pathDuration = this.calculatePathDuration(pathFromDependent);
        
        if (pathDuration > maxDuration) {
          maxPath = pathFromDependent;
          maxDuration = pathDuration;
        }
      }

      visited.delete(nodeId);
      return maxPath;
    };

    // Find all root nodes (no dependencies)
    const rootNodes = Array.from(this.nodes.values())
      .filter(task => task.dependencies.length === 0)
      .map(task => task.id);

    let criticalPath: string[] = [];
    let maxDuration = 0;

    for (const rootId of rootNodes) {
      const path = dfs(rootId, [], 0);
      const duration = this.calculatePathDuration(path);
      
      if (duration > maxDuration) {
        criticalPath = path;
        maxDuration = duration;
      }
    }

    return criticalPath;
  }

  private calculatePathDuration(path: string[]): number {
    return path.reduce((total, taskId) => {
      const task = this.nodes.get(taskId);
      return total + (task ? task.estimatedHours : 0);
    }, 0);
  }

  updateTaskStatus(taskId: string, status: TaskNode['status']): void {
    const task = this.nodes.get(taskId);
    if (task) {
      task.status = status;
      
      // If task is completed, check if any dependents can now be started
      if (status === 'COMPLETED') {
        const dependents = this.adjacencyList.get(taskId) || new Set();
        for (const dependentId of dependents) {
          const dependentTask = this.nodes.get(dependentId);
          if (dependentTask && dependentTask.status === 'BLOCKED') {
            const allDepsCompleted = dependentTask.dependencies.every(depId => {
              const depTask = this.nodes.get(depId);
              return depTask && depTask.status === 'COMPLETED';
            });
            
            if (allDepsCompleted) {
              dependentTask.status = 'NOT_STARTED';
            }
          }
        }
      }
    }
  }

  getTasksByAgent(agentId: string): TaskNode[] {
    return Array.from(this.nodes.values())
      .filter(task => task.assignedTo === agentId);
  }

  assignTask(taskId: string, agentId: string): boolean {
    const task = this.nodes.get(taskId);
    if (task && task.status === 'NOT_STARTED') {
      task.assignedTo = agentId;
      task.status = 'IN_PROGRESS';
      return true;
    }
    return false;
  }

  getTaskStatistics(): {
    total: number;
    notStarted: number;
    inProgress: number;
    completed: number;
    blocked: number;
    criticalPathDuration: number;
    averageTaskDuration: number;
  } {
    const tasks = Array.from(this.nodes.values());
    const criticalPath = this.getCriticalPath();
    
    return {
      total: tasks.length,
      notStarted: tasks.filter(t => t.status === 'NOT_STARTED').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      completed: tasks.filter(t => t.status === 'COMPLETED').length,
      blocked: tasks.filter(t => t.status === 'BLOCKED').length,
      criticalPathDuration: this.calculatePathDuration(criticalPath),
      averageTaskDuration: tasks.reduce((sum, t) => sum + t.estimatedHours, 0) / tasks.length
    };
  }

  // Topological sort for task execution order
  getExecutionOrder(): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const dfs = (nodeId: string): void => {
      if (visited.has(nodeId)) return;
      
      visited.add(nodeId);
      
      // Visit dependencies first
      const dependencies = this.reverseAdjacencyList.get(nodeId) || new Set();
      for (const depId of dependencies) {
        dfs(depId);
      }
      
      result.push(nodeId);
    };

    // Start with all nodes
    for (const nodeId of this.nodes.keys()) {
      dfs(nodeId);
    }

    return result;
  }
}
