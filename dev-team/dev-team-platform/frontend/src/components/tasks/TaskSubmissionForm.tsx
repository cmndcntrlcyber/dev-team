'use client';

import React, { useState } from 'react';

interface TaskSubmissionFormProps {
  onSubmit?: (task: any) => void;
  onClose?: () => void;
}

export function TaskSubmissionForm({ onSubmit, onClose }: TaskSubmissionFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    targetAgent: '',
    dueDate: '',
    tags: '',
    requirements: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const agents = [
    { id: 'architecture-lead', name: 'Architecture Lead Agent', description: 'Project planning & coordination' },
    { id: 'frontend-core', name: 'Frontend Core Agent', description: 'UI/UX development' },
    { id: 'backend-integration', name: 'Backend Integration Agent', description: 'Server-side development' },
    { id: 'qa', name: 'Quality Assurance Agent', description: 'Testing & quality control' },
    { id: 'devops', name: 'DevOps Agent', description: 'Deployment & infrastructure' },
    { id: 'mcp-integration', name: 'MCP Integration Agent', description: 'External integrations' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const taskData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
      };

      // In a real implementation, this would call the API
      if (onSubmit) {
        onSubmit(taskData);
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        targetAgent: '',
        dueDate: '',
        tags: '',
        requirements: ''
      });
    } catch (error) {
      console.error('Failed to submit task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="content-card max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary-blue">Submit Task for Development</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-primary-blue opacity-60 hover:opacity-100 transition-opacity"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-primary-blue mb-2">
              Task Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Create user authentication system"
              className="form-input-modern w-full"
              required
            />
          </div>

          {/* Task Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-primary-blue mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Provide detailed requirements and specifications..."
              rows={4}
              className="form-input-modern w-full resize-none"
              required
            />
          </div>

          {/* Priority and Agent Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-primary-blue mb-2">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="form-input-modern w-full"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label htmlFor="targetAgent" className="block text-sm font-medium text-primary-blue mb-2">
                Target Agent (Optional)
              </label>
              <select
                id="targetAgent"
                name="targetAgent"
                value={formData.targetAgent}
                onChange={handleInputChange}
                className="form-input-modern w-full"
              >
                <option value="">Auto-assign (Recommended)</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              {formData.targetAgent && (
                <p className="text-xs text-primary-blue opacity-70 mt-1">
                  {agents.find(a => a.id === formData.targetAgent)?.description}
                </p>
              )}
            </div>
          </div>

          {/* Due Date and Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-primary-blue mb-2">
                Due Date (Optional)
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                className="form-input-modern w-full"
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-primary-blue mb-2">
                Tags (Optional)
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="e.g., authentication, frontend, api"
                className="form-input-modern w-full"
              />
              <p className="text-xs text-primary-blue opacity-70 mt-1">
                Separate tags with commas
              </p>
            </div>
          </div>

          {/* Additional Requirements */}
          <div>
            <label htmlFor="requirements" className="block text-sm font-medium text-primary-blue mb-2">
              Special Requirements (Optional)
            </label>
            <textarea
              id="requirements"
              name="requirements"
              value={formData.requirements}
              onChange={handleInputChange}
              placeholder="Any specific technical requirements, constraints, or preferences..."
              rows={3}
              className="form-input-modern w-full resize-none"
            />
          </div>

          {/* Agent Selection Help */}
          <div className="glass-card p-4">
            <h4 className="font-semibold text-primary-blue mb-3">✨ Agent Assignment Guide</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start space-x-2">
                <span className="text-blue-500">🎨</span>
                <div>
                  <span className="font-medium text-primary-blue">Frontend Agent:</span>
                  <p className="text-primary-blue opacity-70">UI components, styling, user interactions</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-green-500">⚙️</span>
                <div>
                  <span className="font-medium text-primary-blue">Backend Agent:</span>
                  <p className="text-primary-blue opacity-70">APIs, databases, server logic</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-purple-500">🛡️</span>
                <div>
                  <span className="font-medium text-primary-blue">QA Agent:</span>
                  <p className="text-primary-blue opacity-70">Testing, quality assurance, security</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-orange-500">🚀</span>
                <div>
                  <span className="font-medium text-primary-blue">DevOps Agent:</span>
                  <p className="text-primary-blue opacity-70">Deployment, CI/CD, infrastructure</p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-primary-blue border-opacity-10">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-primary-blue opacity-80 hover:opacity-100 transition-opacity"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.description}
              className="btn-primary-modern px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block mr-2"></span>
                  Submitting...
                </>
              ) : (
                'Submit Task to Agents'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
