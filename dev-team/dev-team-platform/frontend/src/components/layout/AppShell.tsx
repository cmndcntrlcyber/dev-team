'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileMenu, HamburgerButton } from './MobileMenu';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Icon components - defined before use
function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v14l-4-2-4 2V5z" />
    </svg>
  );
}

function ProjectsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function TasksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function AgentsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// Navigation items - shared between sidebar and mobile menu
const navigationItems = [
  { name: 'Dashboard', href: '/', icon: DashboardIcon, current: true },
  { name: 'Projects', href: '/projects', icon: ProjectsIcon, current: false },
  { name: 'Tasks', href: '/tasks', icon: TasksIcon, current: false },
  { name: 'Agents', href: '/agents', icon: AgentsIcon, current: false },
  { name: 'Settings', href: '/settings', icon: SettingsIcon, current: false },
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-full relative z-10">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        navigation={navigationItems}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with mobile hamburger */}
        <header className="modern-navbar backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Mobile hamburger + Logo */}
              <div className="flex items-center">
                <HamburgerButton
                  onClick={() => setMobileMenuOpen(true)}
                  isOpen={mobileMenuOpen}
                />
                <h1 className="text-lg font-semibold text-primary-blue ml-2 lg:ml-0">
                  Dev Team Platform
                </h1>
              </div>

              {/* Spacer for desktop - navigation is handled by sidebar */}
              <div className="hidden lg:flex flex-1" />

              {/* Right side actions */}
              <div className="flex items-center space-x-4">
                {/* Search - hidden on small screens */}
                <div className="hidden md:block">
                  <input
                    type="search"
                    placeholder="Search..."
                    className="form-input-modern w-64 text-sm"
                    aria-label="Search"
                  />
                </div>

                {/* Notifications */}
                <button
                  className="nav-link-modern p-2 relative"
                  aria-label="View notifications"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" aria-label="New notifications"></span>
                </button>

                {/* Agent Status - hidden on small screens */}
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                  </div>
                  <span className="text-sm text-white hidden md:block">3 Agents</span>
                </div>

                {/* User menu */}
                <button className="flex items-center space-x-2" aria-label="User menu">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800">
                    <span className="text-white text-sm font-medium">U</span>
                  </div>
                  <svg className="w-4 h-4 text-white hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-modern">
          <ErrorBoundary>
            <div className="fade-in-up">
              {children}
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
