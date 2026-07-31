import type { ReactNode } from 'react';
import { Suspense } from 'react';
import TopNav from '@/components/TopNav';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<div className="h-14 w-full bg-brand-bgElevated/80" />}>
        <TopNav />
      </Suspense>
      {children}
    </>
  );
}
