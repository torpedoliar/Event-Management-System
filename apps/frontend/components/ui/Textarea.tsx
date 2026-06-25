import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from './utils';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const base = 'w-full rounded-lg border border-brand-border bg-brand-surface/5 px-3 py-2 text-sm text-brand-text placeholder:text-brand-textMuted focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-colors';

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(base, className)} {...props} />;
});

export default Textarea;
