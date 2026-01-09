import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'Dev Team Platform',
    template: '%s | Dev Team Platform',
  },
  description: 'AI-Powered Multi-Agent Development Team Platform - Orchestrate intelligent AI agents to accelerate your software development workflow.',
  keywords: ['AI', 'development', 'multi-agent', 'automation', 'software development', 'AI agents'],
  authors: [{ name: 'Dev Team Platform' }],
  openGraph: {
    title: 'Dev Team Platform',
    description: 'AI-Powered Multi-Agent Development Team Platform',
    type: 'website',
    siteName: 'Dev Team Platform',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`} style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
        {/* Skip to content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Skip to main content
        </a>
        <ParticleBackground />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
