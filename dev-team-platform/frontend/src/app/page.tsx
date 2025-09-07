'use client';

import { useEffect, useState } from 'react';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { AgentStatus } from '@/components/agents/AgentStatus';
import { TaskProgress } from '@/components/tasks/TaskProgress';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedTasks: number;
  activeTasks: number;
  totalAgents: number;
  activeAgents: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedTasks: 0,
    activeTasks: 0,
    totalAgents: 6,
    activeAgents: 0
  });

  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  useEffect(() => {
    // Fetch dashboard data
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Mock data - would fetch from API
      setStats({
        totalProjects: 12,
        activeProjects: 8,
        completedTasks: 145,
        activeTasks: 23,
        totalAgents: 6,
        activeAgents: 5
      });

      // Mock project data
      setRecentProjects([
        {
          id: 1,
          name: 'E-commerce Platform',
          description: 'Modern e-commerce platform with React and Node.js',
          status: 'IN_PROGRESS',
          progress: 75,
          tasks: 24
        },
        {
          id: 2,
          name: 'Mobile App Backend',
          description: 'REST API backend for mobile application',
          status: 'COMPLETED',
          progress: 100,
          tasks: 18
        }
      ]);

      // Mock agent data
      setAgentStatuses([
        {
          id: 1,
          name: 'Frontend Core Agent',
          type: 'FRONTEND',
          status: 'ACTIVE',
          currentTask: 'Building user interface components',
          progress: 67,
          lastActive: '2 minutes ago'
        },
        {
          id: 2,
          name: 'Backend Integration Agent',
          type: 'BACKEND',
          status: 'ACTIVE',
          currentTask: 'Setting up database connections',
          progress: 45,
          lastActive: '5 minutes ago'
        },
        {
          id: 3,
          name: 'Quality Assurance Agent',
          type: 'QA',
          status: 'IDLE',
          currentTask: null,
          progress: null,
          lastActive: '1 hour ago'
        }
      ]);

      // Mock task data
      setRecentTasks([
        {
          id: 1,
          title: 'Implement user authentication',
          description: 'Add JWT-based authentication system',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          assignee: 'Backend Agent',
          progress: 60,
          dueDate: '2024-01-15',
          tags: ['authentication', 'security']
        },
        {
          id: 2,
          title: 'Design responsive layout',
          description: 'Create mobile-friendly responsive design',
          status: 'COMPLETED',
          priority: 'MEDIUM',
          assignee: 'Frontend Agent',
          progress: 100,
          dueDate: '2024-01-10',
          tags: ['ui', 'responsive']
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to your AI-powered development team platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card fade-in-up">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">P</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Projects
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.activeProjects}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card fade-in-up">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">T</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Tasks
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.activeTasks}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card fade-in-up">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">A</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Agents
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.activeAgents} / {stats.totalAgents}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card fade-in-up">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">C</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completed Tasks
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.completedTasks}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Projects</h3>
              <div className="space-y-4">
                {recentProjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No projects yet. Create your first project to get started!</p>
                    <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                      Create Project
                    </button>
                  </div>
                ) : (
                  recentProjects.map((project: any) => (
                    <ProjectCard key={project.id} project={project} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Agent Status */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Agent Status</h3>
              <div className="space-y-4">
                {agentStatuses.map((agent: any) => (
                  <AgentStatus key={agent.id} agent={agent} />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Tasks</h3>
              <div className="space-y-4">
                {recentTasks.map((task: any) => (
                  <TaskProgress key={task.id} task={task} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
