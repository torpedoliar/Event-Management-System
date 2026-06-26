import { ReactNode, useEffect, useRef } from 'react';
import { cn } from './utils';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  description?: ReactNode;
}

export function Modal({ open, onClose, title, children, className, footer, description }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-desc' : undefined}
    >
      <div
        ref={panelRef}
        className={cn('bg-brand-surface border border-brand-border w-full max-w-md rounded-2xl shadow-panel overflow-hidden animate-scaleIn', className)}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-brand-border p-5">
            <div className="space-y-1">
              {title && <div id="modal-title" className="text-lg font-semibold text-brand-text">{title}</div>}
              {description && <div id="modal-desc" className="text-sm text-brand-textMuted">{description}</div>}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Tutup" className="shrink-0 -mr-2">
              <X size={18} />
            </Button>
          </div>
        )}
        <div className="p-5">{children}</div>
        {footer && <div className="border-t border-brand-border p-5">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
