'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Project, ProjectStats } from '@/types';

// Query keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: string) => [...projectKeys.lists(), { filters }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// Fetch projects from API
async function fetchProjects(): Promise<Project[]> {
  const projects = await api.getProjects();
  return projects;
}

// Hook to fetch all projects
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: fetchProjects,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Hook to fetch a single project
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async (): Promise<Project | undefined> => {
      const project = await api.getProject(id);
      return project;
    },
    enabled: !!id,
  });
}

// Hook to get project stats
export function useProjectStats() {
  const { data: projects, ...rest } = useProjects();

  const stats: ProjectStats = {
    totalProjects: projects?.length || 0,
    activeProjects: projects?.filter(p =>
      p.status === 'IN_PROGRESS' || p.status === 'in_progress'
    ).length || 0,
    completedProjects: projects?.filter(p =>
      p.status === 'COMPLETED' || p.status === 'completed'
    ).length || 0,
    onHoldProjects: projects?.filter(p =>
      p.status === 'ON_HOLD' || p.status === 'on_hold'
    ).length || 0,
  };

  return { stats, projects, ...rest };
}

// Mutation to create a new project
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Project>) => api.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
