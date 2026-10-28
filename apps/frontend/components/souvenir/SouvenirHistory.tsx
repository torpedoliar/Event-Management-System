'use client';

import { CheckCircle, Clock } from 'lucide-react';
import { toApiUrl } from '@/lib/api';
import type { Guest } from '@/lib/souvenir/types';

/**
 * Riwayat pengambilan souvenir pada sesi perangkat ini.
 *
 * Diekstrak dari halaman souvenir; hanya bergantung pada daftar tamu.
 */
export default function SouvenirHistory({ history }: { history: Guest[] }) {
  return (
    <div className="relative z-10 p-6 flex justify-center">
      <div className="w-full max-w-5xl rounded-xl surface-elevated p-4 text-brand-text shadow-gold backdrop-blur-sm">
        <div className="mb-3 font-semibold flex items-center gap-2 border-b border-brand-border pb-2">
          <Clock size={18} />
          Riwayat Pengambilan Terbaru
        </div>

        {!history.length && (
          <div className="text-sm text-brand-textMuted py-4 text-center">
            Belum ada riwayat sesi ini
          </div>
        )}

        {!!history.length && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-3 rounded border border-brand-border surface-interactive p-2"
              >
                <div className="h-10 w-10 rounded bg-brand-surfaceMuted overflow-hidden flex-shrink-0">
                  {h.photoUrl ? (
                    <img
                      src={toApiUrl(h.photoUrl)}
                      className="h-full w-full object-cover"
                      alt={h.name}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xs text-brand-textDim">
                      No Photo
                    </div>
                  )}
                </div>
                <div className="text-sm overflow-hidden">
                  <div className="font-medium text-brand-text truncate">{h.name}</div>
                  <div className="text-brand-success text-xs flex items-center gap-1">
                    <CheckCircle size={10} /> Souvenir Diambil
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
