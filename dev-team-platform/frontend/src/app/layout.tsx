import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Navigation } from '@/components/layout/Navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { ParticleBackground } from '@/components/ui/ParticleBackground';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Dev Team Platform',
  description: 'AI-Powered Multi-Agent Development Team Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`} style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
        <ParticleBackground />
        <Providers>
          <div className="flex h-full relative z-10">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Navigation />
              <main className="flex-1 overflow-y-auto p-6 scrollbar-modern">
                <div className="fade-in-up">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
