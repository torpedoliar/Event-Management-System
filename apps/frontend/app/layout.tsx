import './globals.css';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import TopNav from '../components/TopNav';
import ThemeBackground from '../components/ThemeBackground';
import { SSEProvider } from '../lib/sse-context';
import { QueryProvider } from '../lib/query-provider';
import { ErrorBoundary } from '../components/ErrorBoundary';

import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata = {
  title: 'Event Management System',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans font-medium text-brand-surface bg-brand-secondary">
        <ErrorBoundary>
          <QueryProvider>
            <SSEProvider>
              <ThemeBackground />
              <Suspense fallback={<div className="h-14 w-full bg-brand-secondary/80" />}>
                <TopNav />
              </Suspense>
              {children}
            </SSEProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
