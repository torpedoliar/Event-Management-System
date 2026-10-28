'use client';

import { PartyPopper, Users } from 'lucide-react';
import type { Guest, Prize } from '@/lib/luckydraw/types';

/**
 * Panel kanan halaman undian: ticker peserta berhak + daftar pemenang
 * hadiah yang sedang dipilih.
 *
 * Diekstrak dari halaman; komponen ini murni tampilan dan tidak menyimpan
 * state maupun menjalankan animasi sendiri.
 */
export default function CandidatesPanel({
  tickerMood,
  candidates,
  tickerNames,
  highlightedId,
  hasWinner,
  prizes,
  selectedPrize,
  onShowEligible,
}: {
  tickerMood: string;
  candidates: Guest[];
  tickerNames: Guest[];
  highlightedId?: string | null;
  hasWinner: boolean;
  prizes: Prize[];
  selectedPrize?: Prize | null;
  onShowEligible: () => void;
}) {
  const totalWinners = prizes.reduce((acc, p) => acc + p.winners.length, 0);
  const progressPercent = Math.max(
    0,
    100 - (totalWinners / (candidates.length || 1)) * 100,
  );

  return (
    <aside
      className="draw-candidates w-full lg:w-[45%] flex flex-col gap-6"
      aria-label="Peserta dan pemenang"
    >
      <div className={`draw-ticker ${tickerMood === 'tension' ? 'draw-ticker-tension' : ''}`}>
        <header className="draw-ticker-head">
          <div className="draw-ticker-title">
            <span className="draw-live-dot" aria-hidden="true" />
            <h2>Peserta berhak</h2>
          </div>
          <span className="draw-ticker-total">{candidates.length.toLocaleString()} peserta</span>
        </header>

        <div
          className="draw-ticker-list"
          aria-label="Daftar peserta undian yang terus diperbarui"
        >
          {tickerNames.map((g, idx) => {
            const isHighlighted = highlightedId === g.id;
            // Saat pemenang diumumkan, baris lain meredup agar fokus ke pemenang.
            const recede = hasWinner && !isHighlighted;

            return (
              <div
                key={`${g.id}-${idx}`}
                className={`draw-ticker-row animate-ticker-swap ${isHighlighted ? 'is-winner animate-winner-glow' : ''} ${recede ? 'is-receded' : ''}`}
              >
                <span className="draw-row-id">{g.guestId || g.queueNumber}</span>
                <span className="draw-row-body">
                  <span className="draw-row-name">{g.name}</span>
                  <span className="draw-row-company">{g.company || '-'}</span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="draw-ticker-meter">
          <div className="draw-meter-labels">
            <span>Hadir <b>{candidates.length}</b></span>
            <span>Menang <b>{totalWinners}</b></span>
          </div>
          <div className="draw-meter-track" role="presentation">
            <div className="draw-meter-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <button type="button" onClick={onShowEligible} className="draw-ticker-action">
          <Users size={17} />
          Lihat semua {candidates.length.toLocaleString()} tamu
        </button>
      </div>

      {selectedPrize && selectedPrize.winners.length > 0 && (
        <section className="draw-winners" aria-label={`Pemenang ${selectedPrize.name}`}>
          <h3>
            <PartyPopper size={18} aria-hidden="true" />
            Pemenang {selectedPrize.name}
          </h3>
          <ol className="draw-winners-list">
            {selectedPrize.winners.map((w: any) => (
              <li key={w.id} className="draw-winner-row">
                <span className="draw-row-id">{w.guestId || w.queueNumber}</span>
                <span className="draw-row-body">
                  <span className="draw-row-name">{w.name}</span>
                  <span className="draw-row-company">
                    {w.company || '-'}
                    {w.division && ` (${w.division})`}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </aside>
  );
}
