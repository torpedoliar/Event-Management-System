import { ButtonHTMLAttributes, Children, cloneElement, forwardRef, isValidElement } from 'react';
import { cn } from './utils';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  asChild?: boolean;
}

const base = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-fast ease-expo disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-primary text-brand-bg hover:bg-brand-primaryHover shadow-gold-sm hover:shadow-gold',
  secondary: 'bg-brand-surfaceBright text-brand-text hover:bg-brand-surfaceMuted border border-brand-border',
  outline: 'border border-brand-border bg-transparent text-brand-text hover:bg-brand-surfaceMuted/50 hover:border-brand-primary/40',
  danger: 'bg-brand-danger text-white hover:bg-red-400',
  ghost: 'bg-transparent text-brand-textMuted hover:text-brand-text hover:bg-white/[0.04]',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-2.5 text-xs gap-1.5 min-h-[44px]',
  md: 'px-4 py-3 text-sm gap-2 min-h-[44px]',
  lg: 'px-6 py-3.5 text-base gap-2 min-h-[48px]',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', className, loading, disabled, children, asChild, ...props },
  ref,
) {
  const classes = cn(base, variants[variant], sizes[size], className);
  const spinner = loading ? <Loader2 size={size === 'lg' ? 18 : 16} className="animate-spin" /> : null;

  if (asChild) {
    const single = Children.only(children);
    if (!isValidElement(single)) {
      throw new Error('Button asChild requires a single valid React element child.');
    }
    const childClassName = cn(classes, (single.props as any).className);
    const isDisabled = disabled || loading;
    const extra: Record<string, unknown> = { className: childClassName };
    if (isDisabled) {
      extra['aria-disabled'] = true;
      extra['data-disabled'] = true;
    }
    if (loading) {
      return cloneElement(single, extra,
        spinner,
        (single.props as any).children
      );
    }
    return cloneElement(single, extra);
  }

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {spinner}
      {children}
    </button>
  );
});

export default Button;
