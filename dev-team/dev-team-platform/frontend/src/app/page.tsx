'use client';

import { useState, useEffect, useCallback } from 'react';
import { AgentStatus } from '@/components/agents/AgentStatus';
import { useAgents, useAgentStats, useAgentOrder, useSaveAgentOrder } from '@/hooks';

export default function AgentDashboard() {
  const { data: agents = [], isLoading } = useAgents();
  const { stats } = useAgentStats();
  const { data: savedOrder = [] } = useAgentOrder();
  const saveAgentOrder = useSaveAgentOrder();
  const [sortOrder, setSortOrder] = useState<number[]>([]);

  // Initialize sort order when agents load - use saved order if available
  useEffect(() => {
    if (agents.length > 0 && sortOrder.length === 0) {
      if (savedOrder.length > 0) {
        // Map saved agent IDs to current agent indices
        const orderByIds = savedOrder
          .map(id => agents.findIndex(a => a.id === id))
          .filter(idx => idx !== -1);

        // Add any agents not in saved order
        const remainingIndices = agents
          .map((_, i) => i)
          .filter(i => !orderByIds.includes(i));

        setSortOrder([...orderByIds, ...remainingIndices]);
      } else {
        setSortOrder(agents.map((_, index) => index));
      }
    }
  }, [agents, sortOrder.length, savedOrder]);

  // Save order to backend
  const persistOrder = useCallback((newOrder: number[]) => {
    const agentIds = newOrder.map(idx => agents[idx]?.id).filter(Boolean);
    if (agentIds.length > 0) {
      saveAgentOrder.mutate(agentIds);
    }
  }, [agents, saveAgentOrder]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));

    const newOrder = [...sortOrder];
    const draggedItem = newOrder.splice(dragIndex, 1)[0];
    newOrder.splice(dropIndex, 0, draggedItem);

    setSortOrder(newOrder);
    persistOrder(newOrder);
  };

  // Keyboard support for drag-and-drop
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      const newOrder = [...sortOrder];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      setSortOrder(newOrder);
      persistOrder(newOrder);
    } else if (e.key === 'ArrowDown' && index < sortOrder.length - 1) {
      e.preventDefault();
      const newOrder = [...sortOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setSortOrder(newOrder);
      persistOrder(newOrder);
    }
  };

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-primary terminal-text mb-2">
              Dev Team Node
            </h1>
            <p className="text-secondary text-lg terminal-text">
              Multi-Agent Development Platform
            </p>
          </div>
        </div>
      </div>

      {/* Agent Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="glass-card">
          <div className="text-center">
            <div className="text-3xl font-bold text-accent terminal-text mb-2">
              {stats.totalAgents}
            </div>
            <div className="text-muted text-sm uppercase tracking-wider">
              Total Agents
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="text-center">
            <div className="text-3xl font-bold text-status-online terminal-text mb-2">
              {stats.onlineAgents}
            </div>
            <div className="text-muted text-sm uppercase tracking-wider">
              Online Agents
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="text-center">
            <div className="text-3xl font-bold text-status-error terminal-text mb-2">
              {stats.errorAgents}
            </div>
            <div className="text-muted text-sm uppercase tracking-wider">
              Error Agents
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="text-center">
            <div className="text-3xl font-bold text-status-offline terminal-text mb-2">
              {stats.offlineAgents}
            </div>
            <div className="text-muted text-sm uppercase tracking-wider">
              Offline Agents
            </div>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8"
        role="list"
        aria-label="Agent cards"
      >
        {sortOrder.map((agentIndex, displayIndex) => (
          <div
            key={agents[agentIndex]?.id}
            role="listitem"
            draggable
            tabIndex={0}
            onDragStart={(e) => handleDragStart(e, displayIndex)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, displayIndex)}
            onKeyDown={(e) => handleKeyDown(e, displayIndex)}
            className="cursor-move focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary rounded-lg"
            aria-label={`${agents[agentIndex]?.name || 'Agent'} card. Use arrow keys to reorder.`}
          >
            <AgentStatus agent={agents[agentIndex]} />
          </div>
        ))}
      </div>

      {/* Agent Flow Order Section */}
      <div className="glass-card">
        <h2 className="text-xl font-bold text-accent terminal-text mb-4">
          Agent Flow Order
        </h2>
        <p className="text-secondary text-sm mb-6 terminal-text">
          Drag and drop to organize the order that AI agents will communicate with each other
        </p>

        <div className="space-y-4" role="list" aria-label="Agent execution order">
          {sortOrder.map((agentIndex, order) => {
            const agent = agents[agentIndex];
            return (
              <div
                key={agent?.id}
                className="flex items-center justify-between bg-secondary border border-primary rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-accent"
                role="listitem"
                draggable
                tabIndex={0}
                onDragStart={(e) => handleDragStart(e, order)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, order)}
                onKeyDown={(e) => handleKeyDown(e, order)}
                aria-label={`${agent?.name || 'Agent'} at position ${order + 1}. Use arrow keys to reorder.`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-accent text-bg-primary rounded-full flex items-center justify-center text-sm font-bold">
                    {order + 1}
                  </div>
                  <div>
                    <h4 className="text-primary font-bold terminal-text">
                      {agent?.name}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className={`agent-type-${agent?.agentType?.toLowerCase() || 'default'}`}>
                        {agent?.agentType || 'default'} Agent
                      </span>
                      <span className="text-muted text-xs">
                        Order: {order}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-accent cursor-move">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z"/>
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-tertiary border border-primary rounded-lg">
          <h3 className="text-accent text-sm font-bold uppercase tracking-wider mb-2">
            How Agent Flow Works
          </h3>
          <ul className="text-secondary text-xs space-y-1 terminal-text">
            <li>• Agents execute in the order shown above (top to bottom)</li>
            <li>• Each agent can process and enhance the previous agent's output</li>
            <li>• Drag agents up or down to change their execution order</li>
            <li>• The final output combines insights from all agents in sequence</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
