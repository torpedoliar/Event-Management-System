'use client';

import { X } from 'lucide-react';

/**
 * Banner peringatan yang muncul di pojok layar kiosk.
 *
 * Dipisahkan dari halaman utama agar penanganan notifikasi konsisten dan
 * halaman check-in tidak terus membengkak.
 */

export function EventChangeBanner({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  if (!message) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-md p-4 rounded-xl bg-brand-warning/20 border border-brand-warning/30 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex-1 text-sm text-brand-warning">{message}</div>
        <button
          onClick={onDismiss}
          className="text-brand-warning/60 hover:text-brand-warning"
          aria-label="Tutup notifikasi"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export function PendingSyncBanner({
  count,
  onDismiss,
}: {
  count: number | null;
  onDismiss: () => void;
}) {
  if (count === null) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] max-w-md p-4 rounded-xl bg-brand-info/20 border border-brand-info/30 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex-1 text-sm text-brand-info">
          Anda masih memiliki {count} antrean sinkronisasi dari event sebelumnya. Harap pastikan
          perangkat terhubung ke internet agar sinkronisasi dapat selesai.
        </div>
        <button
          onClick={onDismiss}
          className="text-brand-info/60 hover:text-brand-info"
          aria-label="Tutup peringatan"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
