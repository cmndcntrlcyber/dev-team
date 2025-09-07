import React from 'react';

export function Navigation() {
  return (
    <header className="modern-navbar backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - breadcrumb/title */}
          <div className="flex items-center">
            <h1 className="text-lg font-semibold text-primary-blue">
              Dev Team Platform
            </h1>
            <div className="ml-6 flex space-x-1">
              <nav className="flex space-x-1">
                <a href="#" className="nav-link-modern px-3 py-2 text-sm">
                  Dashboard
                </a>
                <a href="#" className="nav-link-modern px-3 py-2 text-sm">
                  Projects
                </a>
                <a href="#" className="nav-link-modern px-3 py-2 text-sm">
                  Agents
                </a>
                <a href="#" className="nav-link-modern px-3 py-2 text-sm">
                  Tasks
                </a>
              </nav>
            </div>
          </div>

          {/* Right side - user menu and notifications */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="hidden md:block">
              <input
                type="search"
                placeholder="Search..."
                className="form-input-modern w-64 text-sm"
              />
            </div>

            {/* Notifications */}
            <button className="nav-link-modern p-2 relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-3.5L15 17z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12l2-2m0 0l2-2M10 10l2 2" />
              </svg>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>

            {/* Agent Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>
              <span className="text-sm text-white hidden sm:block">3 Agents Active</span>
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ 
                background: 'linear-gradient(135deg, var(--primary-blue), rgb(7, 28, 128))' 
              }}>
                <span className="text-white text-sm font-medium">U</span>
              </div>
              <div className="hidden md:block">
                <span className="text-sm text-white font-medium">User</span>
                <p className="text-xs text-gray-300">Developer</p>
              </div>
              
              {/* Dropdown arrow */}
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
