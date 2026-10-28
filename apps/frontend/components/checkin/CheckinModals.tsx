'use client';

import type { RefObject } from 'react';
import { Camera, CheckCircle, X, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Modal from '@/components/ui/Modal';

const LABEL_CLASS =
  'text-xs uppercase tracking-wider text-brand-textMuted mb-1.5 block';

/**
 * Modal pembatalan check-in. Memerlukan password admin dan alasan minimal
 * 5 karakter sebagai jejak audit tindakan sensitif ini.
 */
export function UncheckModal({
  open,
  targetName,
  error,
  password,
  onPasswordChange,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
  submitting,
}: {
  open: boolean;
  targetName?: string;
  error?: string | null;
  password: string;
  onPasswordChange: (value: string) => void;
  reason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Batalkan Check-in">
      <div className="space-y-4">
        <p className="text-sm text-brand-textMuted">
          Check-in tamu <strong className="text-brand-text">{targetName}</strong> akan dibatalkan.
          Hak undian tamu akan dicabut sampai check-in ulang.
        </p>

        {error && (
          <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <Label className={LABEL_CLASS}>Password Admin</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
        </div>

        <div>
          <Label className={LABEL_CLASS}>Alasan (min. 5 karakter)</Label>
          <Input value={reason} onChange={(e) => onReasonChange(e.target.value)} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
            disabled={!password || reason.length < 5 || submitting}
            loading={submitting}
          >
            <XCircle size={16} />
            Konfirmasi
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Modal pengambilan foto tamu (kamera langsung, dengan pratinjau hasil).
 */
export function PhotoCaptureModal({
  open,
  guestName,
  capturedPhoto,
  videoRef,
  canvasRef,
  onClose,
  onCapture,
  onRetake,
  onUpload,
  uploading,
}: {
  open: boolean;
  guestName?: string;
  capturedPhoto: string | null;
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  onClose: () => void;
  onCapture: () => void;
  onRetake: () => void;
  onUpload: () => void;
  uploading: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={`Ambil Foto: ${guestName ?? ''}`}>
      <div className="space-y-4">
        <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
          {!capturedPhoto ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-3 justify-center">
          {!capturedPhoto ? (
            <>
              <Button variant="outline" onClick={onClose}>
                <X size={18} /> Batal
              </Button>
              <Button onClick={onCapture}>
                <Camera size={18} /> Ambil Foto
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onRetake}>
                <Camera size={18} /> Ulangi
              </Button>
              <Button onClick={onUpload} loading={uploading}>
                {!uploading && <CheckCircle size={18} />}
                {uploading ? 'Menyimpan...' : 'Simpan Foto'}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
