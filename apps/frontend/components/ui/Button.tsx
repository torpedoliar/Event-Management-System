import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base = 'inline-flex items-center justify-center rounded-lg font-medium transition duration-fast ease-smooth disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-primary text-brand-bg hover:bg-[#c49a4a]',
  secondary: 'bg-brand-surface text-brand-text hover:bg-brand-surfaceBright border border-brand-border',
  outline: 'border border-brand-border bg-brand-surfaceMuted/30 text-brand-text hover:bg-brand-surfaceMuted hover:border-brand-primary/50',
  danger: 'bg-brand-danger text-white hover:bg-[#b34b45]',
  ghost: 'bg-transparent text-brand-text hover:bg-brand-surfaceMuted/50',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-2 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', className, loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
