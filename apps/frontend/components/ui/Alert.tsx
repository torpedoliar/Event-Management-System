import { HTMLAttributes } from 'react';
import { cn } from './utils';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

type Variant = 'info' | 'success' | 'error';

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

const config: Record<Variant, { icon: React.ElementType; classes: string }> = {
  info: { icon: Info, classes: 'bg-brand-info/10 text-brand-info border-brand-info/20' },
  success: { icon: CheckCircle2, classes: 'bg-brand-success/10 text-brand-success border-brand-success/20' },
  error: { icon: AlertCircle, classes: 'bg-brand-danger/10 text-brand-danger border-brand-danger/20' },
};

export default function Alert({ className, children, variant = 'info', ...rest }: Props) {
  const { icon: Icon, classes } = config[variant];
  return (
    <div
      role="alert"
      className={cn('flex items-start gap-3 rounded-xl border p-4 text-sm', classes, className)}
      {...rest}
    >
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
