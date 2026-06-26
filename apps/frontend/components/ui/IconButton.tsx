import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {}

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-xl p-2.5 text-brand-textMuted transition-all duration-fast ease-smooth hover:bg-white/[0.05] hover:text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 disabled:opacity-40 active:scale-95',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export default IconButton;
