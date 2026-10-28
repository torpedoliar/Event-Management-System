'use client';

import { toApiUrl } from '@/lib/api';
import type { Prize } from '@/lib/luckydraw/types';

/**
 * Kepala halaman undian: logo event, judul, dan pemilih hadiah.
 *
 * Pemilihan hadiah dikembalikan ke halaman lewat `onSelectPrize` karena
 * pemanggil juga perlu mereset status undian (pemenang, kandidat, sorotan).
 */
export default function PrizeSelector({
  logoUrl,
  prizes,
  selectedPrizeId,
  onSelectPrize,
}: {
  logoUrl?: string | null;
  prizes: Prize[];
  selectedPrizeId: string;
  onSelectPrize: (prizeId: string) => void;
}) {
  return (
    <div className="w-full text-center space-y-4 pt-2">
      {logoUrl && (
        <img src={toApiUrl(logoUrl)} className="h-16 md:h-24 mx-auto mb-4" alt="logo" />
      )}

      <h1 className="text-3xl md:text-5xl font-heading font-semibold text-brand-text tracking-tight">
        Lucky Draw
      </h1>

      <div className="flex flex-col items-center gap-2">
        <select
          value={selectedPrizeId}
          onChange={(e) => onSelectPrize(e.target.value)}
          className="bg-brand-bgElevated border border-brand-border text-brand-text text-base md:text-lg rounded-xl px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer"
        >
          {prizes.map((p) => (
            <option
              key={p.id}
              value={p.id}
              className="bg-brand-bgElevated text-brand-text"
            >
              {p.name} ({p.winners.length}/{p.quantity})
            </option>
          ))}
        </select>
        <span className="text-xs text-brand-textDim">
          Pilih hadiah — angka di kurung = sudah dibagikan / total tersedia
        </span>
      </div>
    </div>
  );
}
