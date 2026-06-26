import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from './utils';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, Props>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'control appearance-none bg-[right_0.75rem_center] bg-no-repeat pr-10',
        className
      )}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
      }}
      {...props}
    />
  );
});

export default Select;
