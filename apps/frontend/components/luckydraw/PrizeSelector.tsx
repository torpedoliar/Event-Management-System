'use client';

import { toApiUrl } from '@/lib/api';
import type { Prize } from '@/lib/luckydraw/types';

/**
 * Kepala halaman undian: identitas event, judul, dan pemilih hadiah.
 *
 * Pemilihan hadiah dikembalikan ke halaman lewat `onSelectPrize` karena
 * pemanggil juga perlu mereset status undian (pemenang, kandidat, sorotan).
 */
export default function PrizeSelector({
  logoUrl,
  eventName,
  prizes,
  selectedPrizeId,
  onSelectPrize,
}: {
  logoUrl?: string | null;
  eventName?: string | null;
  prizes: Prize[];
  selectedPrizeId: string;
  onSelectPrize: (prizeId: string) => void;
}) {
  return (
    <section className="draw-head" aria-label="Pilih hadiah undian">
      <div className="draw-event-mark">
        {logoUrl ? (
          <img src={toApiUrl(logoUrl)} alt="" />
        ) : (
          <span className="draw-event-monogram" aria-hidden="true">
            {eventName?.trim().charAt(0).toUpperCase() || 'E'}
          </span>
        )}
        {eventName && <span className="draw-event-name">{eventName}</span>}
      </div>

      <div className="draw-title-block">
        <span className="draw-title-rule" aria-hidden="true" />
        <h1>Lucky Draw</h1>
        <span className="draw-title-rule" aria-hidden="true" />
      </div>

      <label className="draw-prize-control">
        <span className="draw-prize-label">Hadiah yang diundi</span>
        <select
          value={selectedPrizeId}
          onChange={(e) => onSelectPrize(e.target.value)}
          disabled={prizes.length === 0}
          aria-label="Hadiah yang diundi"
        >
          {prizes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.winners.length}/{p.quantity} pemenang
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
