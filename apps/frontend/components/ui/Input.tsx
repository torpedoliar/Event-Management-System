import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from './utils';

interface Props extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn('control', className)}
      {...props}
    />
  );
});

export default Input;
