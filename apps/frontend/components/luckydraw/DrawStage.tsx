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

  const buttonLabel = isSoldOut
    ? 'Habis terbagi'
    : drawCount > 1 && selectedPrize?.category === 'HIBURAN'
      ? `Undi ${drawCount} pemenang`
      : drama.buttonLabel;

  return (
    <section
      className={`draw-stage w-full lg:w-[55%] flex flex-col ${screenShake ? 'animate-screen-shake' : ''}`}
      aria-label="Panggung undian"
    >
      <div className="draw-stage-head">
        <h2>{selectedPrize?.name ?? 'Pilih hadiah'}</h2>
        {selectedPrize?.description ? (
          <p>{selectedPrize.description}</p>
        ) : (
          <p className="draw-stage-meta">
            {selectedPrize
              ? `${selectedPrize.winners.length} dari ${selectedPrize.quantity} sudah dibagikan`
              : 'Belum ada hadiah yang dipilih'}
          </p>
        )}
      </div>

      <div
        className={`draw-reveal ${winner ? 'is-winner winner-card' : ''}`}
        aria-live="polite"
      >
        {displayCandidate ? (
          <div className="draw-reveal-body">
            {winner && <span className="draw-reveal-eyebrow">Pemenang</span>}

            {winner && displayCandidate.photoUrl && (
              <img
                src={toApiUrl(displayCandidate.photoUrl)}
                alt=""
                className="draw-reveal-photo"
              />
            )}

            <span className="draw-reveal-id">
              {displayCandidate.guestId || displayCandidate.queueNumber}
            </span>

            <span className={`draw-reveal-name ${isGlitching ? 'is-glitching' : ''}`}>
              {displayCandidate.name}
            </span>

            <span className="draw-reveal-company">{displayCandidate.company || '-'}</span>
          </div>
        ) : (
          <div className="draw-reveal-empty">
            <Trophy size={52} aria-hidden="true" />
            <p>Tekan tombol untuk mengundi</p>
          </div>
        )}
      </div>

      {/* Pembaca layar mendapat hasil tanpa harus menonton animasi */}
      <p aria-live="polite" className="sr-only">
        {winner ? `Pemenang ${selectedPrize?.name}: ${winner.name}` : ''}
      </p>

      <div className="draw-stage-actions">
        {drawError && (
          <p className="draw-stage-error" role="alert">
            {drawError}
          </p>
        )}

        {selectedPrize?.category === 'HIBURAN' && !spinning && !isSoldOut && (
          <div className="draw-count">
            <div className="draw-count-head">
              <label htmlFor="draw-count-input">Jumlah pemenang</label>
              <span className="draw-count-hint">
                <HelpCircle size={13} aria-hidden="true" />
                <span className="draw-count-tip" role="tooltip">
                  Berapa pemenang yang diundi sekaligus. Pilih cepat 1, 5, 10, atau 20 — atau
                  ketik angka sendiri. Hadiah utama selalu 1 pemenang.
                </span>
              </span>
            </div>

            <div className="draw-count-controls">
              {QUICK_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onDrawCountChange(n)}
                  aria-pressed={drawCount === n}
                  className={drawCount === n ? 'is-active' : ''}
                >
                  {n}
                </button>
              ))}
              <input
                id="draw-count-input"
                type="number"
                min={1}
                max={100}
                value={drawCount}
                aria-label="Jumlah pemenang"
                onChange={(e) => onDrawCountChange(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
        )}

        <Button
          size="lg"
          onClick={onDraw}
          disabled={spinning || isSoldOut || !selectedPrizeId}
          loading={spinning}
          className={`draw-cta ${drama.buttonExtraClass}`}
        >
          {buttonLabel}
        </Button>
      </div>

      <div className="draw-stage-foot">
        <Button variant="outline" onClick={onShowHistory}>
          <History size={17} />
          Riwayat pemenang
        </Button>
      </div>
    </section>
  );
}
