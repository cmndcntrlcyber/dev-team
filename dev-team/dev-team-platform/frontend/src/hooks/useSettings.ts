'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Query keys
export const settingsKeys = {
  all: ['settings'] as const,
  agentOrder: () => [...settingsKeys.all, 'agent-order'] as const,
  setting: (key: string) => [...settingsKeys.all, key] as const,
};

// Hook to fetch agent order
export function useAgentOrder() {
  return useQuery({
    queryKey: settingsKeys.agentOrder(),
    queryFn: () => api.getAgentOrder(),
    staleTime: 60 * 1000, // 1 minute
  });
}

// Mutation to save agent order
export function useSaveAgentOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (order: string[]) => api.saveAgentOrder(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.agentOrder() });
    },
  });
}

// Generic settings hook
export function useSetting(key: string) {
  return useQuery({
    queryKey: settingsKeys.setting(key),
    queryFn: () => api.getSetting(key),
    staleTime: 60 * 1000,
  });
}

// Generic save setting mutation
export function useSaveSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      api.saveSetting(key, value),
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.setting(key) });
    },
  });
}
