'use client';

import { Camera, CheckCircle, HelpCircle, Settings, Trash2, UserCheck, UserPlus, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Toggle from '@/components/ui/Toggle';

/**
 * Modal pengaturan stasiun check-in.
 *
 * Pengaturan perangkat (auto-create, foto otomatis) disimpan di perangkat oleh
 * halaman; pengaturan event hanya muncul untuk admin yang login.
 */
export default function SettingsModal({
  open,
  onClose,
  autoCreateGuest,
  onAutoCreateChange,
  enablePhotoCapture,
  onPhotoCaptureChange,
  isAuth,
  allowMultiplePerCounter,
  onMultiplePerCounterChange,
  savingEventSetting,
  onDownloadGuests,
  downloadingGuests,
  onClearCache,
  downloadProgress,
}: {
  open: boolean;
  onClose: () => void;
  autoCreateGuest: boolean;
  onAutoCreateChange: (checked: boolean) => void;
  enablePhotoCapture: boolean;
  onPhotoCaptureChange: (checked: boolean) => void;
  isAuth: boolean;
  allowMultiplePerCounter: boolean;
  onMultiplePerCounterChange: (checked: boolean) => void;
  savingEventSetting: boolean;
  onDownloadGuests: () => void;
  downloadingGuests: boolean;
  onClearCache: () => void;
  downloadProgress?: string | null;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Settings size={20} className="text-brand-primary" />
          Pengaturan Stasiun
        </span>
      }
      footer={
        <Button onClick={onClose} className="w-full">
          <CheckCircle size={18} />
          Selesai
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-lg p-3 mb-2">
          <div className="flex gap-2">
            <HelpCircle size={14} className="text-brand-primary shrink-0 mt-0.5" />
            <p className="text-xs text-brand-textMuted leading-relaxed">
              Atur perilaku check-in di station ini. Perubahan tersimpan otomatis dan berlaku hanya
              untuk perangkat ini.
            </p>
          </div>
        </div>

        <Toggle
          icon={<UserPlus size={18} />}
          checked={autoCreateGuest}
          onChange={onAutoCreateChange}
          label="Buat tamu baru bila tidak ditemukan"
          description="Saat pencarian tidak menemukan tamu, sistem membuat tamu baru lalu check-in. Cocok untuk walk-in guests."
        />

        <Toggle
          icon={<Camera size={18} />}
          checked={enablePhotoCapture}
          onChange={onPhotoCaptureChange}
          label="Ambil foto otomatis saat check-in"
          description="Gunakan webcam untuk mengambil foto tamu setelah check-in berhasil."
        />

        {isAuth && (
          <div className="pt-3 border-t border-brand-border space-y-3">
            <div className="text-xs uppercase tracking-wider text-brand-textMuted">
              Pengaturan Event (Admin)
            </div>
            <Toggle
              icon={<UserCheck size={18} />}
              checked={allowMultiplePerCounter}
              onChange={onMultiplePerCounterChange}
              disabled={savingEventSetting}
              label="Check-in berulang per counter"
              description="Tamu dapat check-in di berbagai counter, maksimal 1x per counter."
            />
          </div>
        )}

        <div className="pt-3 border-t border-brand-border space-y-3">
          <div className="text-xs uppercase tracking-wider text-brand-textMuted">Akses Offline</div>

          <Button
            variant="outline"
            className="w-full justify-start text-brand-text"
            onClick={onDownloadGuests}
            loading={downloadingGuests}
          >
            <Users size={18} />
            <span className="text-left">
              <span className="block font-medium">Download data tamu</span>
              <span className="block text-xs text-brand-textMuted font-normal">
                Simpan ke perangkat untuk pencarian offline
              </span>
            </span>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start text-brand-danger border-brand-danger/30 hover:bg-brand-danger/10"
            onClick={onClearCache}
          >
            <Trash2 size={18} />
            <span className="text-left">
              <span className="block font-medium">Hapus cache lokal</span>
              <span className="block text-xs text-brand-textMuted font-normal">
                Hapus semua data tamu tersimpan di perangkat ini
              </span>
            </span>
          </Button>

          {downloadProgress && !downloadingGuests && (
            <div className="text-xs text-brand-success text-center">{downloadProgress}</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
