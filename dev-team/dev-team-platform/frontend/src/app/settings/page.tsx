'use client';

import React, { useState } from 'react';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const settingSections: SettingSection[] = [
  {
    id: 'general',
    title: 'General',
    description: 'Basic application settings and preferences',
    icon: '⚙️',
  },
  {
    id: 'agents',
    title: 'Agent Configuration',
    description: 'Configure AI agent settings and API keys',
    icon: '🤖',
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect external services and tools',
    icon: '🔌',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Manage notification preferences',
    icon: '🔔',
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Security settings and access control',
    icon: '🔒',
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Customize the look and feel',
    icon: '🎨',
  },
];

function SettingCard({ section, isActive, onClick }: {
  section: SettingSection;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-blue-600/20 border border-blue-500/50'
          : 'bg-gray-800/50 hover:bg-gray-700/50 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{section.icon}</span>
        <div>
          <h3 className={`font-medium ${isActive ? 'text-blue-400' : 'text-white'}`}>
            {section.title}
          </h3>
          <p className="text-sm text-gray-400">{section.description}</p>
        </div>
      </div>
    </button>
  );
}

function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Platform Name
        </label>
        <input
          type="text"
          defaultValue="Dev Team Platform"
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Default Language
        </label>
        <select className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Timezone
        </label>
        <select className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="UTC">UTC</option>
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Los_Angeles">Pacific Time</option>
          <option value="Europe/London">London</option>
        </select>
      </div>
    </div>
  );
}

function AgentSettings() {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Anthropic API Key
        </label>
        <input
          type="password"
          placeholder="sk-ant-..."
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">Used for Claude-powered agents</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          OpenAI API Key
        </label>
        <input
          type="password"
          placeholder="sk-..."
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">Used for GPT-powered agents</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Default Model
        </label>
        <select className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="claude-3-opus">Claude 3 Opus</option>
          <option value="claude-3-sonnet">Claude 3 Sonnet</option>
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
        </select>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-300">Auto-retry failed requests</p>
          <p className="text-xs text-gray-500">Automatically retry API calls on failure</p>
        </div>
        <button className="relative w-12 h-6 bg-blue-600 rounded-full transition-colors">
          <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
        </button>
      </div>
    </div>
  );
}

function IntegrationSettings() {
  return (
    <div className="space-y-4">
      {['GitHub', 'GitLab', 'Jira', 'Slack', 'Discord'].map((integration) => (
        <div key={integration} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-xl">
              {integration === 'GitHub' && '🐙'}
              {integration === 'GitLab' && '🦊'}
              {integration === 'Jira' && '📋'}
              {integration === 'Slack' && '💬'}
              {integration === 'Discord' && '🎮'}
            </div>
            <div>
              <p className="font-medium text-white">{integration}</p>
              <p className="text-xs text-gray-400">Not connected</p>
            </div>
          </div>
          <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
            Connect
          </button>
        </div>
      ))}
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-4">
      {[
        { label: 'Task Completed', description: 'When an agent completes a task' },
        { label: 'Task Failed', description: 'When a task encounters an error' },
        { label: 'Agent Status Change', description: 'When an agent goes online/offline' },
        { label: 'Project Updates', description: 'When project status changes' },
        { label: 'Daily Summary', description: 'Daily digest of activity' },
      ].map((item) => (
        <div key={item.label} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
          <div>
            <p className="font-medium text-white">{item.label}</p>
            <p className="text-xs text-gray-400">{item.description}</p>
          </div>
          <button className="relative w-12 h-6 bg-gray-600 rounded-full transition-colors hover:bg-gray-500">
            <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
          </button>
        </div>
      ))}
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Current Password
        </label>
        <input
          type="password"
          placeholder="Enter current password"
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          New Password
        </label>
        <input
          type="password"
          placeholder="Enter new password"
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Confirm New Password
        </label>
        <input
          type="password"
          placeholder="Confirm new password"
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
        <div>
          <p className="font-medium text-white">Two-Factor Authentication</p>
          <p className="text-xs text-gray-400">Add an extra layer of security</p>
        </div>
        <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
          Enable
        </button>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Theme
        </label>
        <div className="grid grid-cols-3 gap-3">
          {['Dark', 'Light', 'System'].map((theme) => (
            <button
              key={theme}
              className={`p-4 rounded-lg border transition-all ${
                theme === 'Dark'
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                  : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Accent Color
        </label>
        <div className="flex gap-3">
          {['blue', 'purple', 'green', 'orange', 'pink'].map((color) => (
            <button
              key={color}
              className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${
                color === 'blue' ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
              }`}
              style={{ backgroundColor: `var(--color-${color}-500, ${color})` }}
              title={color}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-300">Particle Background</p>
          <p className="text-xs text-gray-500">Show animated particles in background</p>
        </div>
        <button className="relative w-12 h-6 bg-blue-600 rounded-full transition-colors">
          <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-300">Reduce Motion</p>
          <p className="text-xs text-gray-500">Minimize animations for accessibility</p>
        </div>
        <button className="relative w-12 h-6 bg-gray-600 rounded-full transition-colors hover:bg-gray-500">
          <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');

  const renderSettingsContent = () => {
    switch (activeSection) {
      case 'general':
        return <GeneralSettings />;
      case 'agents':
        return <AgentSettings />;
      case 'integrations':
        return <IntegrationSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'appearance':
        return <AppearanceSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Configure your platform preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Navigation */}
        <div className="space-y-2">
          {settingSections.map((section) => (
            <SettingCard
              key={section.id}
              section={section}
              isActive={activeSection === section.id}
              onClick={() => setActiveSection(section.id)}
            />
          ))}
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2">
          <div className="glass-card">
            <h2 className="text-xl font-semibold text-white mb-6">
              {settingSections.find(s => s.id === activeSection)?.title}
            </h2>
            {renderSettingsContent()}
            <div className="mt-8 pt-6 border-t border-gray-700 flex justify-end gap-3">
              <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium">
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
