'use client';

import { CheckCircle, Gift, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toApiUrl } from '@/lib/api';
import type { Guest, Souvenir } from '@/lib/souvenir/types';

/**
 * Hasil pencarian tamu pada halaman souvenir.
 *
 * Tombol ambil souvenir hanya muncul bila masih ada stok; bila stok habis,
 * tamu yang sudah menerima ditandai dengan label.
 */
export default function SouvenirResults({
  results,
  selectedId,
  souvenirs,
  processing,
  processingId,
  onSelect,
  onToggleSouvenir,
}: {
  results: Guest[];
  selectedId?: string | null;
  souvenirs: Souvenir[];
  processing: boolean;
  processingId?: string | null;
  onSelect: (guest: Guest) => void;
  onToggleSouvenir: (guest: Guest) => void;
}) {
  const hasStock = souvenirs.some((s) => s.remaining > 0);

  if (!results.length) {
    return (
      <div className="kiosk-results-wrap">
        <div className="kiosk-empty">
          <Gift size={26} aria-hidden="true" />
          <strong>Cari tamu untuk memproses pengambilan souvenir</strong>
          <span>Pindai QR, atau ketik ID / nama tamu lalu tekan Enter.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="kiosk-results-wrap">
      <div className="kiosk-results-head">
        <span>{results.length} tamu ditemukan</span>
        {results.length > 1 && <em>Pilih tamu yang benar di bawah</em>}
      </div>

      <div className="kiosk-results">
        {results.map((g) => {
          const busy = processing && processingId === g.id;

          return (
            <div
              key={g.id}
              className={`kiosk-result-row ${selectedId === g.id ? 'is-selected' : ''}`}
              onClick={() => onSelect(g)}
            >
              <div className="kiosk-result-photo">
                {g.photoUrl ? (
                  <img src={toApiUrl(g.photoUrl)} alt={g.name} />
                ) : (
                  <Gift size={18} aria-hidden="true" />
                )}
              </div>

              <div className="kiosk-result-body">
                <div className="kiosk-result-name">{g.name}</div>
                <div className="kiosk-result-sub">
                  <span className="kiosk-result-gid">{g.guestId}</span>
                  {g.tableLocation && ` · ${g.tableLocation}`}
                  {g.company && ` · ${g.company}`}
                </div>
              </div>

              {!hasStock && g.souvenirTaken && (
                <span className="kiosk-pill is-ok">Sudah diambil</span>
              )}

              {hasStock ? (
                <Button
                  className="kiosk-result-action"
                  variant={g.souvenirTaken ? 'outline' : 'primary'}
                  disabled={processing}
                  loading={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSouvenir(g);
                  }}
                >
                  {!busy &&
                    (g.souvenirTaken ? <CheckCircle size={16} /> : <Gift size={16} />)}
                  {busy ? 'Memproses...' : g.souvenirTaken ? 'Sudah diambil' : 'Ambil souvenir'}
                </Button>
              ) : (
                <span className="kiosk-result-action kiosk-pill is-muted">Stok habis</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
