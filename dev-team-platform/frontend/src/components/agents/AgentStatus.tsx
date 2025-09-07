import React from 'react';

interface AgentStatusProps {
  agent: any;
}

export function AgentStatus({ agent }: AgentStatusProps) {
  const getStatusColor = () => {
    switch (agent.status) {
      case 'ACTIVE':
        return 'status-online';
      case 'IDLE':
        return 'status-pending';
      case 'ERROR':
        return 'status-offline';
      default:
        return 'status-pending';
    }
  };

  const getActivityIcon = () => {
    switch (agent.type) {
      case 'FRONTEND':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'BACKEND':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        );
      case 'QA':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'DEVOPS':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
    }
  };

  return (
    <div className="glass-card fade-in-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-primary-blue" style={{
            background: 'linear-gradient(135deg, rgba(9, 36, 165, 0.1), rgba(9, 36, 165, 0.2))'
          }}>
            {getActivityIcon()}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-primary-blue">{agent.name}</h4>
            <p className="text-sm text-primary-blue opacity-70">{agent.type}</p>
          </div>
        </div>
        <span className={getStatusColor()}>
          {agent.status}
        </span>
      </div>

      <div className="space-y-3">
        {agent.currentTask && (
          <div>
            <p className="text-xs font-medium text-primary-blue opacity-60 uppercase tracking-wide mb-1">
              Current Task
            </p>
            <p className="text-sm text-primary-blue font-medium">{agent.currentTask}</p>
          </div>
        )}

        {agent.progress && (
          <div>
            <div className="flex justify-between text-sm text-primary-blue mb-2">
              <span className="font-medium">Progress</span>
              <span className="font-semibold">{agent.progress}%</span>
            </div>
            <div className="progress-modern">
              <div
                className="progress-bar-modern"
                style={{ width: `${agent.progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-primary-blue border-opacity-10">
          <div className="flex items-center space-x-2 text-xs text-primary-blue opacity-60">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Last active: {agent.lastActive || 'Now'}</span>
          </div>
          
          <button className="text-primary-blue opacity-70 hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
