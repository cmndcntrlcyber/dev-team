import React from 'react';

interface ProjectCardProps {
  project: any;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="content-card slide-in-right">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-lg font-semibold text-primary-blue">{project.name}</h4>
        <span className={`${
          project.status === 'IN_PROGRESS' ? 'status-online' :
          project.status === 'COMPLETED' ? 'status-online' :
          'status-pending'
        }`}>
          {project.status === 'IN_PROGRESS' ? 'Active' : 
           project.status === 'COMPLETED' ? 'Complete' : 'Pending'}
        </span>
      </div>
      
      <p className="text-primary-blue text-sm mb-4 opacity-80 leading-relaxed">
        {project.description}
      </p>
      
      {project.progress && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-primary-blue mb-2">
            <span className="font-medium">Progress</span>
            <span className="font-semibold">{project.progress}%</span>
          </div>
          <div className="progress-modern">
            <div
              className="progress-bar-modern"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-primary-blue opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-sm text-primary-blue opacity-80 font-medium">
            {project.tasks} tasks
          </span>
        </div>
        
        <button className="btn-primary-modern text-sm px-4 py-2">
          View Details
          <svg className="w-4 h-4 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
