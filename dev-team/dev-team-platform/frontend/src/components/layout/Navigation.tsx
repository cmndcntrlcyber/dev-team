'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/' },
    { name: 'Projects', href: '/projects' },
    { name: 'Tasks', href: '/tasks' },
    { name: 'Agents', href: '/agents' },
  ];

  return (
    <nav className="flex space-x-1" aria-label="Main navigation">
      {navItems.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== '/' && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`nav-link-modern px-3 py-2 text-sm rounded-md transition-colors ${
              isActive ? 'bg-white/10 text-white' : ''
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
