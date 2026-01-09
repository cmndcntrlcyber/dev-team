'use client';

import React from 'react';
import { useProjects, useProjectStats } from '@/hooks';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState, EmptyState } from '@/components/ui/ErrorState';
import type { Project } from '@/types';

function getStatusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return 'bg-green-500/20 text-green-400';
    case 'IN_PROGRESS':
      return 'bg-blue-500/20 text-blue-400';
    case 'PLANNING':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'ON_HOLD':
      return 'bg-orange-500/20 text-orange-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="glass-card hover:scale-[1.02] transition-transform duration-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{project.name}</h3>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{project.description}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
          {project.status?.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Tasks</p>
          <p className="text-sm text-white font-medium">{project.tasks || 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Progress</p>
          <p className="text-sm text-white font-medium">{project.progress || 0}%</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Completion</span>
          <span>{project.progress || 0}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${project.progress || 0}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Created: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}</span>
        <span>Updated: {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'N/A'}</span>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { data: projects, isLoading, error, refetch } = useProjects();
  const { stats } = useProjectStats();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Projects</h1>
          <p className="text-gray-400">Manage your development projects</p>
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
          <h1 className="text-3xl font-bold text-white mb-2">Projects</h1>
          <p className="text-gray-400">Manage your development projects</p>
        </div>
        <ErrorState
          title="Failed to load projects"
          message="Unable to fetch project data. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Projects</h1>
          <p className="text-gray-400">Manage your development projects</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
          + New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card text-center">
          <p className="text-2xl font-bold text-white">{stats.totalProjects}</p>
          <p className="text-xs text-gray-400">Total Projects</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.activeProjects}</p>
          <p className="text-xs text-gray-400">Active</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-2xl font-bold text-green-400">{stats.completedProjects}</p>
          <p className="text-xs text-gray-400">Completed</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-2xl font-bold text-orange-400">{stats.onHoldProjects}</p>
          <p className="text-xs text-gray-400">On Hold</p>
        </div>
      </div>

      {/* Project Grid */}
      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No projects yet"
          message="Create your first project to get started with AI-powered development."
          action={
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
              Create Project
            </button>
          }
        />
      )}
    </div>
  );
}
