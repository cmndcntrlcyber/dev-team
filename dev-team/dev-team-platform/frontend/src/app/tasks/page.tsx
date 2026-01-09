'use client';

import React, { useState } from 'react';
import { useTasks, useTaskStats } from '@/hooks';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState, EmptyState } from '@/components/ui/ErrorState';

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

function getPriorityColor(priority: string): string {
  switch (priority?.toUpperCase()) {
    case 'HIGH':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'MEDIUM':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'LOW':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

function getStatusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return 'bg-green-500/20 text-green-400';
    case 'IN_PROGRESS':
      return 'bg-blue-500/20 text-blue-400';
    case 'BLOCKED':
      return 'bg-red-500/20 text-red-400';
    case 'NOT_STARTED':
      return 'bg-gray-500/20 text-gray-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

function TaskCard({ task }: { task: DisplayTask }) {
  return (
    <div className="glass-card hover:scale-[1.01] transition-transform duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(task.priority || '')}`}>
              {task.priority || 'N/A'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status || '')}`}>
              {task.status?.replace('_', ' ') || 'Unknown'}
            </span>
          </div>
          <h3 className="text-base font-semibold text-white">{task.title}</h3>
        </div>
      </div>

      {task.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div>
          <p className="text-xs text-gray-500">Assignee</p>
          <p className="text-gray-300">{task.assignee || 'Unassigned'}</p>
        </div>
        {task.dueDate && (
          <div>
            <p className="text-xs text-gray-500">Due Date</p>
            <p className="text-gray-300">{new Date(task.dueDate).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      {task.progress !== undefined && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{task.progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                task.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-gray-700/50 text-gray-400 rounded text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const [filter, setFilter] = useState<string>('all');
  const { data: tasks, isLoading, error, refetch } = useTasks();
  const { stats } = useTaskStats();

  const filteredTasks = tasks?.filter((task) => {
    if (filter === 'all') return true;
    return task.status?.toUpperCase() === filter.toUpperCase();
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-gray-400">Track and manage development tasks</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-gray-400">Track and manage development tasks</p>
        </div>
        <ErrorState
          title="Failed to load tasks"
          message="Unable to fetch task data. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-gray-400">Track and manage development tasks</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
          + New Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card text-center">
          <p className="text-2xl font-bold text-white">{stats.totalTasks}</p>
          <p className="text-xs text-gray-400">Total Tasks</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.inProgressTasks}</p>
          <p className="text-xs text-gray-400">In Progress</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-2xl font-bold text-green-400">{stats.completedTasks}</p>
          <p className="text-xs text-gray-400">Completed</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-2xl font-bold text-red-400">{stats.blockedTasks}</p>
          <p className="text-xs text-gray-400">Blocked</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {['all', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'NOT_STARTED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Task Grid */}
      {filteredTasks && filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={filter === 'all' ? "No tasks yet" : `No ${filter.replace('_', ' ').toLowerCase()} tasks`}
          message={filter === 'all'
            ? "Create your first task to start tracking development progress."
            : "No tasks match the selected filter."
          }
          action={
            filter === 'all' ? (
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
                Create Task
              </button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
