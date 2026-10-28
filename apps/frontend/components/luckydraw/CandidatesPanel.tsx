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
    <div className="w-full lg:w-[45%] flex flex-col gap-6">
      <div
        className={`bg-brand-surface/80 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col h-[520px] ${tickerMood === 'tension' ? 'border-brand-primary/40 ticker-mood-tension' : ''}`}
      >
        <div className="px-4 py-3 border-b border-brand-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-danger animate-pulse" />
            <span className="text-sm font-medium text-brand-text">Peserta Berhak</span>
          </div>
          <div className="text-sm font-mono text-brand-textMuted">
            {candidates.length.toLocaleString()} tamu
          </div>
        </div>

        <div className="flex-1 min-h-[280px] relative p-3 space-y-2 overflow-hidden flex flex-col justify-center">
          {tickerNames.map((g, idx) => {
            const isHighlighted = highlightedId === g.id;
            // Saat pemenang diumumkan, baris lain meredup agar fokus ke pemenang.
            const recede = hasWinner && !isHighlighted;

            return (
              <div
                key={`${g.id}-${idx}`}
                className={`px-3 py-2.5 rounded-lg border flex items-center gap-3 transition-all duration-smooth animate-ticker-swap
                    ${
                      isHighlighted
                        ? 'bg-brand-primary/10 border-brand-primary z-10 animate-winner-glow'
                        : 'bg-brand-text/5 border-brand-border opacity-80'
                    }
                    ${recede ? 'blur-[2px] opacity-30' : ''}
                `}
              >
                <div
                  className={`font-bold text-xs font-mono flex-shrink-0 ${isHighlighted ? 'text-brand-primary' : 'text-brand-primary/70'}`}
                >
                  {g.guestId || g.queueNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-semibold truncate ${isHighlighted ? 'text-brand-text text-base' : 'text-brand-text'}`}
                  >
                    {g.name}
                  </div>
                  <div className="text-xs text-brand-textMuted truncate">{g.company || '-'}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-brand-border">
          <div className="flex justify-between text-xs text-brand-textMuted mb-2 font-mono">
            <span>Hadir: {candidates.length}</span>
            <span>Menang: {totalWinners}</span>
          </div>
          <div className="w-full h-1.5 bg-brand-text/10 rounded-full overflow-hidden">
            <div className="h-full bg-brand-primary" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <button
          onClick={onShowEligible}
          className="w-full py-4 border-t border-brand-border text-brand-primary text-sm font-medium transition-colors hover:bg-brand-text/5 flex items-center justify-center gap-2"
        >
          <Users size={18} />
          Lihat Semua {candidates.length.toLocaleString()} Tamu
        </button>
      </div>

      {selectedPrize && selectedPrize.winners.length > 0 && (
        <div className="w-full">
          <h3 className="text-base font-semibold text-brand-text mb-3 flex items-center gap-2">
            <PartyPopper className="text-brand-primary" size={20} /> Pemenang {selectedPrize.name}
          </h3>
          <div className="flex flex-col gap-2">
            {selectedPrize.winners.map((w: any) => (
              <div key={w.id} className="surface p-3 flex items-center gap-3">
                <div className="font-bold text-brand-primary text-xs font-mono shrink-0">
                  {w.guestId || w.queueNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-brand-text text-sm truncate">{w.name}</div>
                  <div className="text-xs text-brand-textMuted truncate">
                    {w.company || '-'}
                    {w.division && <span> ({w.division})</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
