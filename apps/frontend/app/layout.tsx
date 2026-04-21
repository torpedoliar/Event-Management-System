import './globals.css';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import TopNav from '../components/TopNav';
import ThemeBackground from '../components/ThemeBackground';
import { SSEProvider } from '../lib/sse-context';
import { QueryProvider } from '../lib/query-provider';
import { ErrorBoundary } from '../components/ErrorBoundary';

import { Inter, JetBrains_Mono, Cinzel } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-heading',
});

export const metadata = {
  title: 'Event Management System',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${cinzel.variable}`}>
      <body className="font-sans font-medium text-brand-surface bg-brand-secondary relative antialiased selection:bg-brand-primary/30 selection:text-brand-primarySoft">
        <ErrorBoundary>
          <QueryProvider>
            <SSEProvider>
              <ThemeBackground />
              <div className="relative z-10 flex flex-col min-h-screen">
                <Suspense fallback={<div className="h-14 w-full bg-brand-secondary/80" />}>
                  <TopNav />
                </Suspense>
                {children}
              </div>
            </SSEProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
