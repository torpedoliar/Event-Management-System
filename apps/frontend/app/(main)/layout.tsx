import type { ReactNode } from 'react';
import { Suspense } from 'react';
import TopNav from '@/components/TopNav';
import ThemeBackground from '@/components/ThemeBackground';
import { SSEProvider } from '@/lib/sse-context';
import { QueryProvider } from '@/lib/query-provider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <SSEProvider>
          <ThemeBackground />
          <div className="relative z-10 flex flex-col min-h-screen">
            <Suspense fallback={<div className="h-14 w-full bg-brand-bgElevated/80" />}>
              <TopNav />
            </Suspense>
            {children}
          </div>
        </SSEProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
