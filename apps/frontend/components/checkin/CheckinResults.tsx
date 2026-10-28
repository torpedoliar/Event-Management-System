'use client';

import { CheckCircle, Search, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toApiUrl } from '@/lib/api';
import type { Guest } from '@/lib/checkin/types';

/**
 * Daftar hasil pencarian tamu beserta tombol check-in.
 *
 * Diekstrak dari halaman kiosk; seluruh ketergantungan halaman masuk lewat
 * props sehingga komponen ini dapat diuji dan diubah secara terpisah.
 */
export default function CheckinResults({
  results,
  selectedId,
  checking,
  checkingId,
  allowMultiplePerCounter,
  onCheckin,
}: {
  results: Guest[];
  selectedId?: string | null;
  checking: boolean;
  checkingId?: string | null;
  allowMultiplePerCounter?: boolean;
  onCheckin: (guest: Guest) => void;
}) {
  if (!results.length) {
    return (
      <div className="kiosk-results-wrap">
        <div className="kiosk-empty">
          <Search size={26} aria-hidden="true" />
          <strong>Siap untuk check-in</strong>
          <span>Pindai QR, atau ketik ID / nama tamu lalu tekan Enter.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="kiosk-results-wrap">
      <div className="kiosk-results-head">
        <span>
          <Users size={15} aria-hidden="true" />
          {results.length} tamu ditemukan
        </span>
        {results.length > 1 && <em>Pilih tamu yang benar di bawah</em>}
      </div>

      <div className="kiosk-results">
        {results.map((g) => (
          <div
            key={g.id}
            className={`kiosk-result-row ${selectedId === g.id ? 'is-selected' : ''}`}
          >
            <div className="kiosk-result-photo">
              {g.photoUrl ? (
                <img src={toApiUrl(g.photoUrl)} alt={g.name} />
              ) : (
                <Users size={18} aria-hidden="true" />
              )}
            </div>

            <div className="kiosk-result-body">
              <div className="kiosk-result-name">{g.name}</div>
              <div className="kiosk-result-sub">
                <span className="kiosk-result-gid">{g.guestId}</span>
                {g.company && ` · ${g.company}`}
                {g.division && ` · ${g.division}`}
              </div>
            </div>

            <div className="kiosk-result-table">
              <span>Meja</span>
              <strong className="kiosk-table-value">{g.tableLocation || '—'}</strong>
            </div>

            <div className="kiosk-result-status">
              {g.checkedIn ? (
                <span className="kiosk-pill is-warn">
                  Sudah check-in{(g.checkinCount ?? 0) > 1 ? ` ${g.checkinCount}×` : ''}
                </span>
              ) : (
                <span className="kiosk-pill is-ok">Belum check-in</span>
              )}
            </div>

            <Button
              className="kiosk-result-action"
              disabled={checking}
              loading={checking && checkingId === g.id}
              onClick={() => onCheckin(g)}
            >
              {!checking && <CheckCircle size={16} />}
              {g.checkedIn && allowMultiplePerCounter ? 'Check-in ulang' : 'Check-in'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
