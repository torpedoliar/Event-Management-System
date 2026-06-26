import { cn } from "../../lib/utils";
import { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-brand-surfaceBright/50", className)}
      style={style}
    />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("surface p-5 space-y-4", className)}>
      <div className="flex items-start justify-between">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 p-4 border-b border-brand-border">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonGuestCard() {
  return (
    <div className="flex items-center justify-between rounded-xl p-4 bg-brand-bgElevated border border-brand-border">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-10 w-24 rounded-xl" />
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonGuestCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <SkeletonStats />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="surface p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
      <div className="surface p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <SkeletonList items={3} />
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <SkeletonTable rows={8} />
    </div>
  );
}

export function SkeletonChart({ height = "h-64" }: { height?: string }) {
  return (
    <div className={cn("surface p-6", height)}>
      <Skeleton className="h-6 w-40 mb-4" />
      <div className="flex items-end gap-2 h-[calc(100%-40px)]">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-lg"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="surface p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-4 border-t border-brand-border">
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export default Skeleton;
