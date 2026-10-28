'use client';

import { HelpCircle, History, Trophy } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toApiUrl } from '@/lib/api';
import { DRAMA_CONFIGS } from '@/lib/luckydraw/drama';
import type { Guest, Prize } from '@/lib/luckydraw/types';

/** Pilihan cepat jumlah pemenang untuk hadiah kategori hiburan. */
const QUICK_COUNTS = [1, 5, 10, 20];

/**
 * Panggung undian: kartu kandidat/pemenang, kontrol jumlah pemenang, dan
 * tombol undi.
 *
 * Seluruh status animasi dikendalikan halaman lewat props; komponen ini hanya
 * menampilkannya. Teks tombol mengikuti tingkat "drama" kategori hadiah.
 */
export default function DrawStage({
  screenShake,
  selectedPrize,
  selectedPrizeId,
  winner,
  displayCandidate,
  isGlitching,
  drawError,
  spinning,
  isSoldOut,
  drawCount,
  onDrawCountChange,
  onDraw,
  onShowHistory,
}: {
  screenShake: boolean;
  selectedPrize?: Prize | null;
  selectedPrizeId: string;
  winner?: Guest | null;
  displayCandidate?: Guest | null;
  isGlitching: boolean;
  drawError?: string | null;
  spinning: boolean;
  isSoldOut: boolean;
  drawCount: number;
  onDrawCountChange: (count: number) => void;
  onDraw: () => void;
  onShowHistory: () => void;
}) {
  const drama =
    DRAMA_CONFIGS[selectedPrize?.category || 'HIBURAN'] || DRAMA_CONFIGS.HIBURAN;

  return (
    <div
      className={`w-full lg:w-[55%] text-center flex flex-col ${screenShake ? 'animate-screen-shake' : ''}`}
    >
      <div className="surface p-6 md:p-10 flex flex-col items-center justify-center min-h-[520px]">
        {selectedPrize && (
          <div className="mb-6 text-center">
            <h2 className="text-xl md:text-2xl font-semibold text-brand-text mb-1">
              {selectedPrize.name}
            </h2>
            {selectedPrize.description && (
              <p className="text-sm text-brand-textMuted">{selectedPrize.description}</p>
            )}
          </div>
        )}

        <div
          className={`w-full min-h-[260px] bg-black rounded-2xl border flex flex-col items-center justify-center p-6 mb-6 transition-colors ${winner ? 'border-brand-primary winner-card' : 'border-brand-border'}`}
        >
          {displayCandidate ? (
            <div className="text-center space-y-4">
              {winner && (
                <div className="text-label uppercase tracking-[0.35em] text-brand-primary">
                  Pemenang
                </div>
              )}
              {winner && displayCandidate.photoUrl && (
                <img
                  src={toApiUrl(displayCandidate.photoUrl)}
                  alt=""
                  className="mx-auto h-24 w-24 rounded-full object-cover border-2 border-brand-primary"
                />
              )}
              <div className="text-4xl md:text-6xl font-bold text-brand-primary tracking-wider">
                {displayCandidate.guestId || displayCandidate.queueNumber}
              </div>
              <div className="space-y-1">
                <div
                  className={`text-2xl md:text-4xl font-semibold text-brand-text uppercase tracking-tight ${isGlitching ? 'animate-pulse' : ''}`}
                >
                  {displayCandidate.name}
                </div>
                <div className="text-lg text-brand-textMuted font-mono uppercase tracking-wider">
                  {displayCandidate.company || '-'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-brand-textMuted flex flex-col items-center gap-3">
              <Trophy size={56} />
              <p className="text-sm">Pilih hadiah dan tekan tombol untuk mengundi</p>
            </div>
          )}
        </div>

        {/* Pembaca layar mendapat hasil tanpa harus menonton animasi */}
        <p aria-live="polite" className="sr-only">
          {winner ? `Pemenang ${selectedPrize?.name}: ${winner.name}` : ''}
        </p>

        <div className="flex flex-col items-center gap-4 w-full">
          {drawError && (
            <div className="w-full p-3 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm text-center">
              {drawError}
            </div>
          )}

          {selectedPrize?.category === 'HIBURAN' && !spinning && !isSoldOut && (
            <div className="flex items-center gap-3 p-2 rounded-xl border border-brand-border bg-black/30">
              <label className="text-sm text-brand-textMuted pl-3">Jumlah pemenang:</label>
              <div className="group relative">
                <HelpCircle size={14} className="text-brand-textDim cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-brand-bgElevated border border-brand-border rounded-lg text-xs text-brand-text shadow-panel w-56 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
                  Berapa pemenang yang diundi sekaligus. Pilih cepat (1, 5, 10, 20) atau ketik angka
                  custom. Grand Prize (UTAMA) selalu 1 pemenang.
                </div>
              </div>
              <div className="flex items-center gap-2">
                {QUICK_COUNTS.map((n) => (
                  <button
                    key={n}
                    onClick={() => onDrawCountChange(n)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm transition-colors ${drawCount === n ? 'bg-brand-primary text-brand-bg' : 'bg-brand-text/5 text-brand-textMuted hover:bg-brand-text/10'}`}
                  >
                    {n}
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={drawCount}
                  onChange={(e) => onDrawCountChange(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 h-9 bg-brand-text/5 border border-brand-border rounded-lg text-center text-brand-text text-sm focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>
          )}

          <Button
            size="lg"
            onClick={onDraw}
            disabled={spinning || isSoldOut || !selectedPrizeId}
            loading={spinning}
            className={drama.buttonExtraClass}
          >
            {isSoldOut
              ? 'Habis Terbagi'
              : drawCount > 1 && selectedPrize?.category === 'HIBURAN'
                ? `Undi ${drawCount} Pemenang`
                : drama.buttonLabel}
          </Button>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <Button variant="outline" onClick={onShowHistory} className="text-brand-text">
          <History size={18} />
          Riwayat Pemenang
        </Button>
      </div>
    </div>
  );
}
