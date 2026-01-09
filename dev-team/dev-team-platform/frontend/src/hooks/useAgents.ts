'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Agent, AgentStats } from '@/types';

// Query keys
export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters: string) => [...agentKeys.lists(), { filters }] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
  health: (id: string) => [...agentKeys.all, 'health', id] as const,
};

// Fetch agents from API
async function fetchAgents(): Promise<Agent[]> {
  const agents = await api.getAgents();
  return agents;
}

// Hook to fetch all agents
export function useAgents() {
  return useQuery({
    queryKey: agentKeys.lists(),
    queryFn: fetchAgents,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Hook to fetch a single agent
export function useAgent(id: string) {
  return useQuery({
    queryKey: agentKeys.detail(id),
    queryFn: async (): Promise<Agent | undefined> => {
      const agent = await api.getAgent(id);
      return agent;
    },
    enabled: !!id,
  });
}

// Hook to get agent stats
export function useAgentStats() {
  const { data: agents, ...rest } = useAgents();

  const stats: AgentStats = {
    totalAgents: agents?.length || 0,
    onlineAgents: agents?.filter(a => a.status === 'online' || a.status === 'active').length || 0,
    errorAgents: agents?.filter(a => a.status === 'error').length || 0,
    offlineAgents: agents?.filter(a => a.status === 'offline').length || 0,
  };

  return { stats, agents, ...rest };
}

// Hook to check agent health
export function useAgentHealth(id: string) {
  return useQuery({
    queryKey: agentKeys.health(id),
    queryFn: () => api.getAgentHealth(id),
    enabled: !!id,
    refetchInterval: 30 * 1000, // Check health every 30 seconds
  });
}

// Mutation to update agent order
export function useUpdateAgentOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newOrder: string[]) => {
      // In a real implementation, this would call the API
      // For now, we just update the local cache
      return newOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
    },
  });
}
