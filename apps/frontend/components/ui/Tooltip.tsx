'use client';

import { ReactNode } from 'react';
import { cn } from './utils';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

/**
 * CSS-only tooltip. Parent must be position: relative.
 * Shows on hover. Uses group-hover pattern for zero-JS cost.
 */
export default function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const positionCls = side === 'top'
    ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
    : 'top-full left-1/2 -translate-x-1/2 mt-2';

  return (
    <div className={cn('group/tip relative inline-flex', className)}>
      {children}
      <div
        role="tooltip"
        className={cn(
          'absolute z-[60] pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150',
          positionCls
        )}
      >
        <div className="bg-brand-bgElevated border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text shadow-panel whitespace-normal w-max max-w-[260px] leading-relaxed">
          {content}
        </div>
      </div>
    </div>
  );
}
