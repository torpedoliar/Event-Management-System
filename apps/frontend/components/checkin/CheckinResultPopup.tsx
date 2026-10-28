'use client';

import type { RefObject } from 'react';
import { Camera, CheckCircle, Loader2, Users, X, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toApiUrl } from '@/lib/api';
import type { Guest } from '@/lib/checkin/types';

/**
 * Popup besar hasil check-in (berhasil maupun duplikat).
 *
 * Diekstrak dari halaman kiosk. Seluruh nilai dan aksi halaman masuk lewat
 * props; komponen ini tidak menyimpan state sendiri. Ref kamera diteruskan
 * agar pengambilan foto otomatis tetap dikendalikan halaman.
 */
export default function CheckinResultPopup({
  guest,
  isDuplicate,
  autoCapturing,
  autoCaptureStatus,
  videoRef,
  canvasRef,
  enablePhotoCapture,
  isAuth,
  unchecking,
  onClose,
  onPhotoCapture,
  onUncheck,
}: {
  guest: Guest | null;
  isDuplicate: boolean;
  autoCapturing: boolean;
  autoCaptureStatus: string;
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  enablePhotoCapture: boolean;
  isAuth: boolean;
  unchecking: boolean;
  onClose: () => void;
  onPhotoCapture: () => void;
  onUncheck: (guest: Guest) => void;
}) {
  if (!guest) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl surface-elevated shadow-gold grid grid-cols-1 md:grid-cols-[360px_1fr]">
        <div className="bg-brand-text/5 flex items-center justify-center min-h-[300px] md:min-h-full relative">
          {autoCapturing ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="inline-flex items-center gap-2 bg-black/60 text-brand-text px-4 py-2 rounded-full text-sm font-medium">
                  <Loader2 className="animate-spin" size={16} />
                  {autoCaptureStatus}
                </div>
              </div>
            </div>
          ) : guest.photoUrl ? (
            <img
              src={toApiUrl(guest.photoUrl)}
              alt={guest.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-brand-textMuted p-8 flex flex-col items-center gap-2">
              <Users size={48} />
              <span>Tidak ada foto</span>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-6 md:p-10 space-y-5 relative overflow-y-auto max-h-[60vh] md:max-h-full">
          {isDuplicate ? (
            <div className="flex items-center gap-3 text-brand-warning">
              <div className="p-2 rounded-lg bg-brand-warning/10 border border-brand-warning/30">
                <XCircle size={22} />
              </div>
              <div>
                <div className="text-xl font-semibold">Sudah Check-in</div>
                <div className="text-sm text-brand-warning/80">
                  Tamu pernah check-in sebelumnya
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-brand-success">
              <div className="p-2 rounded-lg bg-brand-success/10 border border-brand-success/30">
                <CheckCircle size={22} />
              </div>
              <div>
                <div className="text-xl font-semibold">Check-in Berhasil</div>
                {(guest.checkinCount ?? 0) > 1 && (
                  <div className="text-sm text-brand-success/80">
                    Check-in ke-{guest.checkinCount}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Riwayat check-in (untuk berhasil maupun duplikat) */}
          {guest.checkins && guest.checkins.length > 0 && (
            <div
              className={`mb-4 rounded-lg p-3 ${isDuplicate ? 'bg-brand-warning/10 border border-brand-warning/20' : 'bg-brand-success/10 border border-brand-success/20'}`}
            >
              {isDuplicate && guest.message && (
                <div className="text-base text-brand-warning font-medium mb-2">
                  {guest.message}
                </div>
              )}
              <div
                className={`text-sm uppercase tracking-wider font-medium mb-2 ${isDuplicate ? 'text-brand-warning' : 'text-brand-success'}`}
              >
                Riwayat Check-in ({guest.checkinCount || guest.checkins.length}x)
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {guest.checkins.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    className={`flex items-center justify-between text-sm rounded px-2 py-1 ${isDuplicate ? 'bg-brand-warning/10' : 'bg-brand-success/10'}`}
                  >
                    <span
                      className={`font-medium ${isDuplicate ? 'text-brand-warning' : 'text-brand-success'}`}
                    >
                      {c.checkinByName || 'Admin'}
                      {c.counterName && (
                        <span className="text-brand-text/50 ml-1">({c.counterName})</span>
                      )}
                    </span>
                    <span
                      className={`font-mono text-xs ${isDuplicate ? 'text-brand-warning' : 'text-brand-success'}`}
                    >
                      {new Date(c.checkinAt).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data lama yang belum punya array checkins */}
          {isDuplicate && (!guest.checkins || guest.checkins.length === 0) && guest.checkedInAt && (
            <div className="mb-4 bg-brand-warning/10 border border-brand-warning/20 rounded-lg p-3">
              {guest.message && (
                <div className="text-base text-brand-warning font-medium mb-2">
                  {guest.message}
                </div>
              )}
              <div className="text-sm text-brand-warning uppercase tracking-wider font-medium">
                Waktu Check-in Sebelumnya
              </div>
              <div className="text-xl font-mono font-bold text-brand-warning">
                {new Date(guest.checkedInAt).toLocaleString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
              {guest.checkedInByName && (
                <div className="text-sm text-brand-warning mt-1">
                  Oleh: {guest.checkedInByName}
                </div>
              )}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">
                ID Tamu
              </div>
              <div className="text-xl font-mono font-semibold text-brand-text">{guest.guestId}</div>
            </div>
            <div>
              <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">
                Nama
              </div>
              <div className="text-3xl md:text-5xl font-semibold text-brand-text leading-tight">
                {guest.name}
              </div>
            </div>
            <div>
              <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">
                Meja / Ruangan
              </div>
              <div className="text-2xl md:text-4xl font-semibold text-brand-text">
                {guest.tableLocation}
              </div>
            </div>
            {guest.company && (
              <div>
                <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">
                  Perusahaan
                </div>
                <div className="text-xl md:text-2xl font-semibold text-brand-text">
                  {guest.company}
                </div>
              </div>
            )}
            {guest.department && (
              <div>
                <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">
                  Departemen
                </div>
                <div className="text-xl md:text-2xl font-semibold text-brand-text">
                  {guest.department}
                </div>
              </div>
            )}
            {guest.division && (
              <div>
                <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">
                  Divisi
                </div>
                <div className="text-xl md:text-2xl font-semibold text-brand-text">
                  {guest.division}
                </div>
              </div>
            )}
            {guest.notes && (
              <div className="p-4 bg-brand-warning/10 border border-brand-warning/20 rounded-xl">
                <div className="text-sm text-brand-warning uppercase tracking-wider font-medium mb-1">
                  Catatan
                </div>
                <div className="text-base text-brand-warning italic">"{guest.notes}"</div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-brand-border flex items-center justify-between">
            <div>
              <div className="text-xs text-brand-textMuted uppercase tracking-wider font-medium">
                Nomor Antrian
              </div>
              <div className="text-2xl font-semibold text-brand-text">{guest.queueNumber}</div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={onClose} disabled={autoCapturing}>
                <X size={18} /> Tutup
              </Button>
              {enablePhotoCapture && !isDuplicate && !autoCapturing && (
                <Button onClick={onPhotoCapture}>
                  <Camera size={18} /> {guest.photoUrl ? 'Ulangi Foto' : 'Ambil Foto'}
                </Button>
              )}
              {isAuth && (
                <Button variant="danger" disabled={unchecking} onClick={() => onUncheck(guest)}>
                  <XCircle size={18} /> Batalkan
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
