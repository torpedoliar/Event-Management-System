import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from './utils';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {}

const base = 'w-full rounded-lg border border-brand-border bg-brand-surface/5 px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-colors';

export const Select = forwardRef<HTMLSelectElement, Props>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(base, className)} {...props} />;
});

export default Select;
