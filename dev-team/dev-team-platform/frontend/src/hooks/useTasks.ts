'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TaskStats } from '@/types';

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

// Extended task type for display
interface DisplayTask {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  progress?: number;
  assignee?: string;
  dueDate?: string;
  tags?: string[];
}

// Fetch tasks from API
async function fetchTasks(projectId?: string): Promise<DisplayTask[]> {
  const tasks = await api.getTasks(projectId);
  return tasks as DisplayTask[];
}

// Hook to fetch all tasks
export function useTasks(projectId?: string) {
  return useQuery({
    queryKey: taskKeys.list({ projectId }),
    queryFn: () => fetchTasks(projectId),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to fetch a single task
export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async (): Promise<DisplayTask | undefined> => {
      const task = await api.getTask(id);
      return task as DisplayTask;
    },
    enabled: !!id,
  });
}

// Hook to get task stats
export function useTaskStats(projectId?: string) {
  const { data: tasks, ...rest } = useTasks(projectId);

  const stats: TaskStats = {
    totalTasks: tasks?.length || 0,
    completedTasks: tasks?.filter(t => t.status === 'COMPLETED').length || 0,
    inProgressTasks: tasks?.filter(t => t.status === 'IN_PROGRESS').length || 0,
    blockedTasks: tasks?.filter(t => t.status === 'BLOCKED').length || 0,
  };

  return { stats, tasks, ...rest };
}

// Mutation to create a new task
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

// Mutation to update a task
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.updateTask(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
