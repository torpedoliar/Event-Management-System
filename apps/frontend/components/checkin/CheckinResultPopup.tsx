'use client';

import type { RefObject } from 'react';
import { Camera, CheckCircle, Loader2, Users, X, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toApiUrl } from '@/lib/api';
import type { Guest } from '@/lib/checkin/types';

/**
 * Kartu hasil check-in.
 *
 * Dirancang sebagai "cap": satu pandangan cukup untuk memastikan nama, nomor
 * meja, dan status — terbaca dari jarak dua meter tanpa mendekat.
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

  const checkinCount = guest.checkinCount ?? 0;
  const hasHistory = Boolean(guest.checkins && guest.checkins.length > 0);

  return (
    <div className="kiosk-overlay" onClick={onClose}>
      <div
        className={`kiosk-stamp ${isDuplicate ? 'is-duplicate' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={isDuplicate ? 'Tamu sudah check-in' : 'Check-in berhasil'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kiosk-stamp-head">
          <span className="kiosk-stamp-icon" aria-hidden="true">
            {isDuplicate ? <XCircle size={22} /> : <CheckCircle size={22} />}
          </span>
          <span className="kiosk-stamp-status">
            {isDuplicate ? 'Sudah check-in sebelumnya' : 'Check-in berhasil'}
          </span>
          <span className="kiosk-stamp-time">
            {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="kiosk-stamp-main">
          <div className="kiosk-stamp-media">
            {autoCapturing ? (
              <div className="kiosk-stamp-camera">
                <video ref={videoRef} autoPlay playsInline muted />
                <span className="kiosk-stamp-camera-status">
                  <Loader2 className="animate-spin" size={15} aria-hidden="true" />
                  {autoCaptureStatus}
                </span>
              </div>
            ) : guest.photoUrl ? (
              <img src={toApiUrl(guest.photoUrl)} alt={guest.name} />
            ) : (
              <span className="kiosk-stamp-photo-empty" aria-hidden="true">
                <Users size={26} />
              </span>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="kiosk-stamp-text">
            <p className="kiosk-stamp-name">{guest.name}</p>
            <p className="kiosk-stamp-meta">
              <span className="gid">{guest.guestId}</span>
              {guest.company && <span>· {guest.company}</span>}
              {!isDuplicate && checkinCount > 1 && <span>· check-in ke-{checkinCount}</span>}
            </p>

            {isDuplicate && (
              <p className="kiosk-stamp-note">
                {guest.message ??
                  'Tamu ini sudah tercatat hadir. Jika ini orang yang berbeda, panggil koordinator.'}
              </p>
            )}
          </div>

          <div className="kiosk-stamp-table">
            <span>Meja</span>
            <strong>{guest.tableLocation || '—'}</strong>
          </div>
        </div>

        {hasHistory && (
          <div className="kiosk-stamp-history">
            <p>Riwayat check-in</p>
            <ul>
              {guest.checkins!.map((c, idx) => (
                <li key={c.id || idx}>
                  <span>
                    {c.checkinByName || 'Admin'}
                    {c.counterName && <em> · {c.counterName}</em>}
                  </span>
                  <time>
                    {new Date(c.checkinAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isDuplicate && !hasHistory && guest.checkedInAt && (
          <p className="kiosk-stamp-note">
            Check-in sebelumnya:{' '}
            {new Date(guest.checkedInAt).toLocaleString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {guest.checkedInByName && ` oleh ${guest.checkedInByName}`}
          </p>
        )}

        <div className="kiosk-stamp-actions">
          <Button variant="outline" onClick={onClose} disabled={autoCapturing}>
            <X size={17} /> Tutup
          </Button>

          {enablePhotoCapture && !isDuplicate && !autoCapturing && (
            <Button onClick={onPhotoCapture}>
              <Camera size={17} /> {guest.photoUrl ? 'Ulangi foto' : 'Ambil foto'}
            </Button>
          )}

          {isAuth && (
            <Button variant="danger" disabled={unchecking} onClick={() => onUncheck(guest)}>
              <XCircle size={17} /> Batalkan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
