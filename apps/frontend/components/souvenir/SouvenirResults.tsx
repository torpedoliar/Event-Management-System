'use client';

import { CheckCircle, Gift, Loader2 } from 'lucide-react';
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

  return (
    <div className="relative z-10 p-6 flex justify-center">
      <div className="w-full max-w-5xl rounded-xl surface-elevated p-4 text-brand-text shadow-gold backdrop-blur-sm">
        {!results.length && (
          <div className="text-center text-brand-textMuted py-8 flex flex-col items-center gap-3">
            <Gift size={48} className="text-brand-textDim" />
            <p>Cari tamu untuk memproses pengambilan souvenir</p>
          </div>
        )}

        {!!results.length && (
          <div className="space-y-2">
            {results.map((g) => (
              <div
                key={g.id}
                onClick={() => onSelect(g)}
                className={`cursor-pointer flex items-center justify-between rounded border p-3 transition-colors ${selectedId === g.id ? 'border-brand-primary/80 bg-brand-primary/10' : 'border-brand-border surface-interactive hover:shadow-gold'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-brand-surfaceMuted rounded overflow-hidden flex-shrink-0">
                    {g.photoUrl ? (
                      <img
                        src={toApiUrl(g.photoUrl)}
                        className="h-full w-full object-cover"
                        alt={g.name}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-brand-textDim">
                        No Photo
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-brand-text">
                      {g.name}{' '}
                      <span className="text-brand-textMuted font-mono text-sm">({g.guestId})</span>
                    </div>
                    <div className="text-sm text-brand-textMuted">
                      {g.tableLocation} {g.company ? `• ${g.company}` : ''}{' '}
                      {g.division ? `• ${g.division}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasStock && (
                    <button
                      className={`flex items-center gap-2 rounded-full px-4 py-2 font-medium text-brand-bg shadow-soft disabled:opacity-50 transition-colors ${
                        g.souvenirTaken
                          ? 'bg-brand-success hover:bg-brand-success/80'
                          : 'bg-brand-primary hover:bg-brand-primarySoft'
                      }`}
                      disabled={processing}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSouvenir(g);
                      }}
                    >
                      {processing && processingId === g.id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : g.souvenirTaken ? (
                        <CheckCircle size={16} />
                      ) : (
                        <Gift size={16} />
                      )}
                      {processing && processingId === g.id
                        ? 'Memproses...'
                        : g.souvenirTaken
                          ? 'Sudah Diambil'
                          : 'Ambil Souvenir'}
                    </button>
                  )}

                  {!hasStock && g.souvenirTaken && (
                    <span className="flex items-center gap-1 text-brand-success text-sm">
                      <CheckCircle size={14} /> Sudah Diambil
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
