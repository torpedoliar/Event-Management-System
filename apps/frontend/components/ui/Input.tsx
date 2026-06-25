import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from './utils';

interface Props extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-brand-border bg-white/5 px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-textMuted',
        'focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-colors',
        className
      )}
      {...props}
    />
  );
});

export default Input;
