import { HTMLAttributes } from 'react';
import { cn } from './utils';

type Variant = 'neutral' | 'success' | 'warning' | 'danger' | 'primary';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  neutral: 'bg-brand-surfaceBright/40 text-brand-text border-brand-border',
  success: 'bg-brand-success/10 text-brand-success border-brand-success/25',
  warning: 'bg-brand-warning/10 text-brand-warning border-brand-warning/25',
  danger: 'bg-brand-danger/10 text-brand-danger border-brand-danger/25',
  primary: 'bg-brand-primary/10 text-brand-primary border-brand-primary/25',
};

export default function Badge({ className, children, variant = 'neutral', ...rest }: Props) {
  return (
    <span className={cn('badge', styles[variant], className)} {...rest}>
      {children}
    </span>
  );
}
