import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from './utils';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('control min-h-[96px] resize-y', className)} {...props} />;
});

export default Textarea;
