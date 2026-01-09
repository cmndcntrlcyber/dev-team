'use client';

import React from 'react';
import { useAgents, useAgentStats } from '@/hooks';
import { AgentCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState, EmptyState } from '@/components/ui/ErrorState';
import type { Agent } from '@/types';

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'online':
    case 'active':
      return 'bg-green-500';
    case 'offline':
    case 'idle':
      return 'bg-gray-500';
    case 'error':
      return 'bg-red-500';
    case 'pending':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
}

function getStatusBadgeColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'online':
    case 'active':
      return 'bg-green-500/20 text-green-400';
    case 'offline':
    case 'idle':
      return 'bg-gray-500/20 text-gray-400';
    case 'error':
      return 'bg-red-500/20 text-red-400';
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

function getAgentTypeIcon(type: string): string {
  switch (type) {
    case 'ARCHITECTURE_LEAD':
      return '🏗️';
    case 'FRONTEND_CORE':
    case 'FRONTEND_UIUX':
      return '🎨';
    case 'BACKEND_INTEGRATION':
      return '⚙️';
    case 'QUALITY_ASSURANCE':
    case 'QA':
      return '🔍';
    case 'DEVOPS':
      return '🚀';
    case 'MCP_INTEGRATION':
      return '🔌';
    default:
      return '🤖';
  }
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="glass-card hover:scale-[1.02] transition-transform duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{getAgentTypeIcon(agent.type)}</div>
          <div>
            <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
            <p className="text-xs text-gray-400">{agent.type.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)} animate-pulse`} />
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(agent.status)}`}>
            {agent.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-xs text-gray-500">Provider</p>
          <p className="text-gray-300 capitalize">{agent.agentType}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Last Ping</p>
          <p className="text-gray-300">{agent.lastPing || 'Never'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Created</p>
          <p className="text-gray-300">{agent.created || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Endpoint</p>
          <p className="text-gray-300 truncate" title={agent.endpoint}>
            {agent.endpoint === 'Default' ? 'Default' : 'Custom'}
          </p>
        </div>
      </div>

      {agent.currentTask && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">Current Task</p>
          <p className="text-sm text-gray-300">{agent.currentTask}</p>
        </div>
      )}

      {agent.progress !== undefined && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{agent.progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${agent.progress}%` }}
            />
          </div>
        </div>
      )}

      {agent.capabilities && agent.capabilities.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Capabilities</p>
          <div className="flex flex-wrap gap-1">
            {agent.capabilities.slice(0, 3).map((cap) => (
              <span key={cap} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">
                {cap}
              </span>
            ))}
            {agent.capabilities.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-700/50 text-gray-400 rounded text-xs">
                +{agent.capabilities.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  const { data: agents, isLoading, error, refetch } = useAgents();
  const { stats } = useAgentStats();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Agents</h1>
          <p className="text-gray-400">Manage your AI development agents</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Agents</h1>
          <p className="text-gray-400">Manage your AI development agents</p>
        </div>
        <ErrorState
          title="Failed to load agents"
          message="Unable to fetch agent data. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Agents</h1>
          <p className="text-gray-400">Manage your AI development agents</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
          + Add Agent
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card text-center">
          <p className="text-2xl font-bold text-white">{stats.totalAgents}</p>
          <p className="text-xs text-gray-400">Total Agents</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-2xl font-bold text-green-400">{stats.onlineAgents}</p>
          <p className="text-xs text-gray-400">Online</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-2xl font-bold text-red-400">{stats.errorAgents}</p>
          <p className="text-xs text-gray-400">Errors</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-2xl font-bold text-gray-400">{stats.offlineAgents}</p>
          <p className="text-xs text-gray-400">Offline</p>
        </div>
      </div>

      {/* Agent Grid */}
      {agents && agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No agents configured"
          message="Add your first AI agent to start building with intelligent assistance."
          action={
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
              Add Agent
            </button>
          }
        />
      )}
    </div>
  );
}
