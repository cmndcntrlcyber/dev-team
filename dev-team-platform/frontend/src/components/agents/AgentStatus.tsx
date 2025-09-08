import React, { useState } from 'react';

interface AgentStatusProps {
  agent: any;
}

export function AgentStatus({ agent }: AgentStatusProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusClass = () => {
    switch (agent.status?.toLowerCase()) {
      case 'active':
      case 'online':
        return 'status-online';
      case 'error':
        return 'status-error';
      case 'idle':
      case 'pending':
        return 'status-pending';
      case 'offline':
        return 'status-offline';
      default:
        return 'status-offline';
    }
  };

  const getAgentTypeClass = () => {
    switch (agent.agentType?.toLowerCase()) {
      case 'anthropic':
        return 'agent-type-anthropic';
      case 'burp':
        return 'agent-type-burp';
      case 'local':
        return 'agent-type-local';
      default:
        return 'agent-type-default';
    }
  };

  const getAgentIcon = () => {
    switch (agent.type?.toLowerCase()) {
      case 'frontend':
      case 'frontend_core':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM11 7h2v2h-2V7zm0 4h2v2h-2v-2z"/>
          </svg>
        );
      case 'backend':
      case 'backend_integration':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
          </svg>
        );
      case 'security':
      case 'qa':
      case 'quality_assurance':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
      case 'devops':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
      case 'architecture':
      case 'architecture_lead':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
        );
    }
  };

  return (
    <div className="glass-card fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-accent-secondary">
            {getAgentIcon()}
          </div>
          <div>
            <h4 className="text-base font-bold text-primary terminal-text">
              {agent.name || 'Unknown Agent'}
            </h4>
            <div className="flex items-center space-x-2 mt-1">
              <span className={getAgentTypeClass()}>
                {agent.agentType || 'default'}
              </span>
            </div>
          </div>
        </div>
        <span className={getStatusClass()}>
          {agent.status || 'offline'}
        </span>
      </div>

      {/* Agent Details */}
      <div className="space-y-3 text-sm">
        {/* Type and Endpoint */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-muted uppercase tracking-wider">Type:</span>
            <div className="text-secondary terminal-text mt-1">
              {agent.agentType || 'default'}
            </div>
          </div>
          <div>
            <span className="text-muted uppercase tracking-wider">Endpoint:</span>
            <div className="text-secondary terminal-text mt-1 truncate">
              {agent.endpoint || 'Default'}
            </div>
          </div>
        </div>

        {/* Last Ping and Created */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-muted uppercase tracking-wider">Last Ping:</span>
            <div className="text-secondary terminal-text mt-1">
              {agent.lastPing || agent.lastActive || 'Never'}
            </div>
          </div>
          <div>
            <span className="text-muted uppercase tracking-wider">Created:</span>
            <div className="text-secondary terminal-text mt-1">
              {agent.created || agent.createdAt || 'Unknown'}
            </div>
          </div>
        </div>

        {/* Current Task */}
        {agent.currentTask && (
          <div>
            <span className="text-muted uppercase tracking-wider text-xs">Current Task:</span>
            <div className="text-secondary terminal-text mt-1 text-sm">
              {agent.currentTask}
            </div>
          </div>
        )}

        {/* Progress */}
        {agent.progress && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted uppercase tracking-wider text-xs">Progress:</span>
              <span className="text-accent terminal-text text-xs font-bold">
                {agent.progress}%
              </span>
            </div>
            <div className="progress-modern">
              <div
                className="progress-bar-modern"
                style={{ width: `${agent.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Expandable Sections */}
        <div className="pt-2 border-t border-primary">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-accent hover:text-accent-secondary transition-colors text-xs uppercase tracking-wider font-bold"
          >
            {expanded ? '▼ Hide Details' : '▶ Show Details'}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3">
              {/* Custom Prompt */}
              {agent.customPrompt && (
                <div>
                  <h5 className="text-accent text-xs uppercase tracking-wider font-bold mb-2">
                    Custom Prompt
                  </h5>
                  <div className="code-block text-xs">
                    {agent.customPrompt.length > 200 
                      ? `${agent.customPrompt.substring(0, 200)}...` 
                      : agent.customPrompt}
                  </div>
                </div>
              )}

              {/* Loop Configuration */}
              {agent.loopConfig && (
                <div>
                  <h5 className="text-accent text-xs uppercase tracking-wider font-bold mb-2">
                    Loop Configuration
                  </h5>
                  <div className="space-y-2 text-xs">
                    {agent.loopConfig.partner && (
                      <div className="flex justify-between">
                        <span className="text-muted">Partner:</span>
                        <span className="text-secondary terminal-text">{agent.loopConfig.partner}</span>
                      </div>
                    )}
                    {agent.loopConfig.maxIterations && (
                      <div className="flex justify-between">
                        <span className="text-muted">Max Iterations:</span>
                        <span className="text-secondary terminal-text">{agent.loopConfig.maxIterations}</span>
                      </div>
                    )}
                    {agent.loopConfig.exitCondition && (
                      <div className="flex justify-between">
                        <span className="text-muted">Exit Condition:</span>
                        <span className="text-secondary terminal-text">{agent.loopConfig.exitCondition}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Capabilities */}
              {agent.capabilities && agent.capabilities.length > 0 && (
                <div>
                  <h5 className="text-accent text-xs uppercase tracking-wider font-bold mb-2">
                    Capabilities
                  </h5>
                  <div className="text-xs text-secondary">
                    {agent.capabilities.join(', ')}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                <button className="text-accent hover:text-accent-secondary transition-colors text-xs uppercase tracking-wider font-bold">
                  Test
                </button>
                <button className="text-accent hover:text-accent-secondary transition-colors text-xs uppercase tracking-wider font-bold">
                  Start Loop
                </button>
                <button className="text-status-error hover:opacity-80 transition-opacity text-xs uppercase tracking-wider font-bold">
                  Stop
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
