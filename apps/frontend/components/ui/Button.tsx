import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'glass';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base = 'inline-flex items-center justify-center rounded-lg font-medium transition duration-fast ease-smooth disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/70';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-primary text-brand-secondary shadow-soft hover:opacity-90',
  secondary: 'border border-brand-border bg-brand-surface text-brand-text hover:bg-brand-surfaceMuted',
  outline: 'border border-brand-border bg-transparent text-brand-text hover:bg-brand-secondary hover:text-brand-surface',
  danger: 'border border-brand-danger/30 bg-brand-danger/10 text-brand-danger hover:bg-brand-danger/20',
  ghost: 'bg-transparent text-brand-text hover:bg-brand-border/50',
  glass: 'glass-button',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', className, loading, disabled, ...props },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={isDisabled}
      data-loading={loading ? 'true' : undefined}
      {...props}
    />
  );
});

export default Button;