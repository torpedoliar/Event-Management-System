import { ReactNode } from 'react';
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
}

export function Modal({ open, onClose, title, children, className, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn('surface w-full max-w-md shadow-panel overflow-hidden animate-scaleIn', className)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-brand-border p-4">
            {title ? <div className="text-lg font-semibold text-brand-text">{title}</div> : <div />}
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Tutup">
              <X size={18} />
            </Button>
          </div>
        )}
        <div className="p-4">{children}</div>
        {footer && <div className="border-t border-brand-border p-4">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
