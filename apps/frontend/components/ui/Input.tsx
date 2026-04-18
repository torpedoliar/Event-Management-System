import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from './utils';

type Variant = 'default' | 'glass';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  variant?: Variant;
}

const base = 'w-full rounded-lg border border-brand-border bg-brand-surface/5 px-3 py-2 text-sm text-brand-text placeholder:text-brand-textMuted focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-colors';

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ className, variant = 'default', ...props }, ref) {
  const style = variant === 'glass' ? 'glass-input' : base;
  return <input ref={ref} className={cn(style, className)} {...props} />;
});

export default Input;