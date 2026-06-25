import { HTMLAttributes } from 'react';
import { cn } from './utils';

type Variant = 'neutral' | 'success' | 'warning' | 'danger';

export default function Badge({ className, children, ...rest }: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  const v = (rest as any).variant as Variant | undefined;
  const style = v === 'success' ? 'bg-brand-success/20 text-brand-success border border-brand-success/30' : v === 'warning' ? 'bg-brand-warning/20 text-brand-warning border border-brand-warning/30' : v === 'danger' ? 'bg-brand-danger/20 text-brand-danger border border-brand-danger/30' : 'bg-brand-surfaceBright/20 text-brand-text border border-brand-border';
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', style, className)} {...rest}>{children}</span>;
}