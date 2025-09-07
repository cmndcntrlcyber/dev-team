import React from 'react';

interface TaskProgressProps {
  task: any;
}

export function TaskProgress({ task }: TaskProgressProps) {
  const getPriorityColor = () => {
    switch (task.priority) {
      case 'HIGH':
        return 'status-offline';
      case 'MEDIUM':
        return 'status-pending';
      case 'LOW':
        return 'status-online';
      default:
        return 'status-pending';
    }
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case 'IN_PROGRESS':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'COMPLETED':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'BLOCKED':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="glass-card slide-in-right group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg text-primary-blue mt-1" style={{
            background: 'linear-gradient(135deg, rgba(9, 36, 165, 0.1), rgba(9, 36, 165, 0.2))'
          }}>
            {getStatusIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-primary-blue group-hover:opacity-90 transition-opacity">
              {task.title}
            </h4>
            <p className="text-sm text-primary-blue opacity-70 mt-1 leading-relaxed">
              {task.description}
            </p>
          </div>
        </div>
        <span className={getPriorityColor()}>
          {task.priority}
        </span>
      </div>

      {task.progress !== undefined && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-primary-blue mb-2">
            <span className="font-medium">Completion</span>
            <span className="font-semibold">{task.progress}%</span>
          </div>
          <div className="progress-modern">
            <div
              className="progress-bar-modern"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4 text-primary-blue opacity-60">
          {task.assignee && (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium" style={{
                background: 'linear-gradient(135deg, var(--primary-blue), rgb(7, 28, 128))'
              }}>
                {task.assignee.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium">{task.assignee}</span>
            </div>
          )}
          
          {task.dueDate && (
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{task.dueDate}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {task.status === 'IN_PROGRESS' && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          )}
          
          <button className="text-primary-blue opacity-60 hover:opacity-100 transition-opacity group-hover:translate-x-1 transition-transform">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="mt-4 pt-3 border-t border-primary-blue border-opacity-10">
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full"
                style={{ 
                  background: 'rgba(9, 36, 165, 0.1)', 
                  color: 'var(--primary-blue)' 
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
