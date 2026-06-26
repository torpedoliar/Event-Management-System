import './globals.css';
import type { ReactNode } from 'react';
import { SSEProvider } from '@/lib/sse-context';
import { QueryProvider } from '@/lib/query-provider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ThemeBackground from '@/components/ThemeBackground';

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
      <body className="font-sans font-medium bg-brand-bg text-brand-text relative antialiased selection:bg-brand-primary/30 selection:text-brand-primarySoft">
        <ErrorBoundary>
          <QueryProvider>
            <SSEProvider>
              <ThemeBackground />
              <div className="relative z-10 flex flex-col min-h-screen">
                {children}
              </div>
            </SSEProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
