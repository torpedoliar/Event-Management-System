'use client';

import type { ReactNode } from 'react';
import { ArrowLeft, XCircle } from 'lucide-react';

/**
 * Kerangka halaman registrasi tamu.
 *
 * Identitas acara tampil lebih dulu, kuota sebagai garis tipis (bukan kartu),
 * lalu satu panel formulir. Diekstrak agar bisa dipratinjau dan diuji tanpa
 * memanggil API.
 */
export function RegistrationShell({
  eventName,
  title,
  description,
  quota,
  onBack,
  error,
  children,
}: {
  eventName?: string | null;
  title?: string | null;
  description?: string | null;
  quota?: { current: number; max: number; percent: number; remaining?: number | null } | null;
  onBack?: () => void;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="reg-page">
      <div className="reg-shell">
        {onBack && (
          <button type="button" onClick={onBack} className="reg-back">
            <ArrowLeft size={15} />
            Pilih event lain
          </button>
        )}

        <header className="reg-head">
          {eventName && <p className="reg-event">{eventName}</p>}
          <h1 className="reg-title">{title}</h1>
          {description && <p className="reg-desc">{description}</p>}
        </header>

        {quota && quota.max > 0 && (
          <div className="reg-quota">
            <div className="reg-quota-head">
              <span>Kuota terisi</span>
              <b>
                {quota.current} / {quota.max}
              </b>
            </div>
            <div className="reg-quota-track" role="presentation">
              <div className="reg-quota-fill" style={{ width: `${Math.min(100, Math.max(0, quota.percent))}%` }} />
            </div>
          </div>
        )}

        <div className="reg-panel">
          {error && (
            <p className="reg-error" role="alert">
              <XCircle size={15} aria-hidden="true" />
              {error}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Kartu hasil registrasi.
 *
 * Dibuat seperti tiket: satu hal yang harus diingat tamu adalah ID peserta,
 * jadi ID itu yang menjadi fokus, bukan kalimat "terima kasih".
 */
export function RegistrationTicket({
  eventName,
  message,
  guestId,
  queueNumber,
}: {
  eventName?: string | null;
  message?: string | null;
  guestId?: string | null;
  queueNumber?: number | null;
}) {
  return (
    <div className="reg-page">
      <div className="reg-shell">
        <div className="reg-ticket">
          {eventName && <p className="reg-event">{eventName}</p>}
          <span className="reg-ticket-check" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <h2>Registrasi berhasil</h2>
          {message && <p>{message}</p>}

          {guestId && (
            <div className="reg-ticket-id">
              <span>ID peserta</span>
              <strong>{guestId}</strong>
              {queueNumber !== null && queueNumber !== undefined && (
                <div className="reg-ticket-queue">No. antrean {queueNumber}</div>
              )}
            </div>
          )}

          <p className="reg-ticket-foot">
            Tunjukkan ID ini di meja registrasi. Simpan tangkapan layar sebagai cadangan.
          </p>
        </div>
      </div>
    </div>
  );
}
