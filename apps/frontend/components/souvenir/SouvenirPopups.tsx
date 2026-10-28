'use client';

import { AlertTriangle, CheckCircle, Gift, Users, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toApiUrl } from '@/lib/api';
import type { Guest, SouvenirTakeInfo } from '@/lib/souvenir/types';

/**
 * Kartu konfirmasi souvenir berhasil diambil.
 *
 * Dibuat sebesar "cap" kiosk agar tamu dan operator sama-sama bisa
 * memastikan nama serta nomor meja dalam sekali lihat.
 */
export function SouvenirConfirmation({
  guest,
  onClose,
}: {
  guest: Guest | null;
  onClose: () => void;
}) {
  if (!guest) return null;

  return (
    <div className="kiosk-overlay" onClick={onClose}>
      <div
        className="kiosk-stamp is-gold"
        role="dialog"
        aria-modal="true"
        aria-label="Souvenir berhasil diambil"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kiosk-stamp-head">
          <span className="kiosk-stamp-icon" aria-hidden="true">
            <Gift size={22} />
          </span>
          <span className="kiosk-stamp-status">Souvenir diambil</span>
          <span className="kiosk-stamp-time">
            {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="kiosk-stamp-main">
          <div className="kiosk-stamp-media">
            {guest.photoUrl ? (
              <img src={toApiUrl(guest.photoUrl)} alt={guest.name} />
            ) : (
              <span className="kiosk-stamp-photo-empty" aria-hidden="true">
                <Users size={26} />
              </span>
            )}
          </div>

          <div className="kiosk-stamp-text">
            <p className="kiosk-stamp-name">{guest.name}</p>
            <p className="kiosk-stamp-meta">
              <span className="gid">{guest.guestId}</span>
              {guest.company && <span>· {guest.company}</span>}
            </p>
          </div>

          <div className="kiosk-stamp-table">
            <span>Meja</span>
            <strong>{guest.tableLocation || '—'}</strong>
          </div>
        </div>

        <div className="kiosk-stamp-actions">
          <Button variant="outline" onClick={onClose}>
            <X size={17} /> Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Peringatan saat souvenir sudah pernah diambil tamu tersebut, lengkap dengan
 * riwayat pengambilannya.
 */
export function SouvenirAlreadyTaken({
  info,
  onClose,
}: {
  info: { guest: Guest; takes: SouvenirTakeInfo[] } | null;
  onClose: () => void;
}) {
  if (!info) return null;

  return (
    <div className="kiosk-overlay" onClick={onClose}>
      <div
        className="kiosk-stamp is-duplicate"
        role="dialog"
        aria-modal="true"
        aria-label="Souvenir sudah pernah diambil"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kiosk-stamp-head">
          <span className="kiosk-stamp-icon" aria-hidden="true">
            <AlertTriangle size={22} />
          </span>
          <span className="kiosk-stamp-status">Souvenir sudah diambil</span>
          <span className="kiosk-stamp-time">{info.takes.length}×</span>
        </div>

        <div className="kiosk-stamp-main">
          <div className="kiosk-stamp-text">
            <p className="kiosk-stamp-name">{info.guest.name}</p>
            <p className="kiosk-stamp-meta">
              <span className="gid">{info.guest.guestId}</span>
              {info.guest.company && <span>· {info.guest.company}</span>}
            </p>
            <p className="kiosk-stamp-note">
              Tamu ini sudah menerima souvenir. Jika ini orang yang berbeda, panggil koordinator.
            </p>
          </div>

          <div className="kiosk-stamp-table">
            <span>Meja</span>
            <strong>{info.guest.tableLocation || '—'}</strong>
          </div>
        </div>

        <div className="kiosk-stamp-history">
          <p>Riwayat pengambilan</p>
          <ul>
            {info.takes.map((take, idx) => (
              <li key={idx}>
                <span>
                  {take.souvenirName}
                  {take.takenByName && <em> · {take.takenByName}</em>}
                </span>
                <time>
                  {new Date(take.takenAt).toLocaleString('id-ID', {
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

        <div className="kiosk-stamp-actions">
          <Button onClick={onClose}>
            <CheckCircle size={17} /> Mengerti
          </Button>
        </div>
      </div>
    </div>
  );
}
