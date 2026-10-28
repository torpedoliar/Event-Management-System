'use client';

import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

/**
 * Konfirmasi penghapusan cache tamu lokal di perangkat kiosk.
 *
 * Aksi ini hanya menghapus data di perangkat (IndexedDB), bukan di server —
 * karena itu teksnya menegaskan hal tersebut agar operator tidak ragu.
 */
export default function ClearCacheModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Hapus Cache Lokal"
      className="max-w-md"
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Batal
          </Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm}>
            Ya, Hapus
          </Button>
        </div>
      }
    >
      <p className="text-brand-textMuted">
        Apakah Anda yakin ingin menghapus semua cache tamu lokal di perangkat ini? Data yang
        tersimpan di server tidak akan terpengaruh.
      </p>
    </Modal>
  );
}
