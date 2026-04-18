import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from './utils';

type Variant = 'default' | 'glass';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  variant?: Variant;
}

const base = 'w-full rounded-lg border border-brand-border bg-brand-surface/5 px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-colors';

export const Select = forwardRef<HTMLSelectElement, Props>(function Select({ className, variant = 'default', ...props }, ref) {
  const style = variant === 'glass' ? 'glass-input' : base;
  return <select ref={ref} className={cn(style, className)} {...props} />;
});

export default Select;