"use client";
import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface LazyModalProps {
  show: boolean;
  onClose: () => void;
  children: ReactNode;
}

function ModalFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex items-center gap-3 text-white">
        <Loader2 className="animate-spin" size={24} />
        <span>Loading...</span>
      </div>
    </div>
  );
}

export function LazyModal({ show, onClose, children }: LazyModalProps) {
  if (!show) return null;

  return (
    <Suspense fallback={<ModalFallback />}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      >
        <div onClick={(e) => e.stopPropagation()}>{children}</div>
      </div>
    </Suspense>
  );
}

export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  return lazy(importFn);
}

export default LazyModal;
