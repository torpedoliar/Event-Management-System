import { cn } from './utils';

type Status = 'success' | 'warning' | 'danger' | 'info';

interface StatusBadgeProps {
  status: Status;
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

const styles: Record<Status, string> = {
  success: 'bg-brand-success/15 text-brand-success border-brand-success/30',
  warning: 'bg-brand-warning/15 text-brand-warning border-brand-warning/30',
  danger: 'bg-brand-danger/15 text-brand-danger border-brand-danger/30',
  info: 'bg-brand-info/15 text-brand-info border-brand-info/30',
};

export function StatusBadge({ status, children, pulse, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        styles[status],
        pulse && 'relative',
        className
      )}
    >
      {pulse && <span className="relative flex h-1.5 w-1.5">
        <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', status === 'success' ? 'bg-brand-success' : 'bg-current')} />
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', status === 'success' ? 'bg-brand-success' : 'bg-current')} />
      </span>}
      {children}
    </span>
  );
}

export default StatusBadge;
