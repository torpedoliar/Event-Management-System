import { cn } from './utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
}

export function Toggle({ checked, onChange, disabled, label, description, icon }: ToggleProps) {
  return (
    <label
      className={cn(
        'flex items-center justify-between gap-4 p-4 surface-interactive cursor-pointer',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && <div className="text-brand-primary shrink-0">{icon}</div>}
        <div className="min-w-0">
          {label && <div className="font-medium text-brand-text">{label}</div>}
          {description && <div className="text-sm text-brand-textMuted">{description}</div>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50',
          checked ? 'bg-brand-primary' : 'bg-white/20'
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </label>
  );
}

export default Toggle;
