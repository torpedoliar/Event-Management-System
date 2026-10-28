'use client';

import { Clock, Users } from 'lucide-react';
import { toApiUrl } from '@/lib/api';
import type { Guest } from '@/lib/checkin/types';

/**
 * Daftar check-in terbaru di halaman kiosk.
 *
 * Diekstrak dari halaman utama; hanya bergantung pada daftar tamu, sehingga
 * dapat diubah tanpa menyentuh logika check-in.
 */
export default function CheckinHistory({ history }: { history: Guest[] }) {
  return (
    <div className="relative z-10 px-4 pb-6 flex justify-center">
      <div className="w-full max-w-3xl surface-elevated p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-semibold flex items-center gap-2 text-brand-text">
            <Clock size={18} className="text-brand-primary" />
            Riwayat Check-in Terbaru
          </div>
          <span className="text-xs text-brand-textMuted">{history.length} tamu</span>
        </div>

        {!history.length && (
          <div className="text-sm text-brand-textMuted py-6 text-center flex flex-col items-center gap-2">
            <Clock size={32} className="text-brand-textMuted/50" />
            Belum ada riwayat check-in
          </div>
        )}

        {!!history.length && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-3 rounded-xl border border-brand-border surface-interactive p-3 hover:shadow-gold transition-all"
              >
                <div className="h-12 w-12 rounded-lg bg-brand-text/5 overflow-hidden flex-shrink-0">
                  {h.photoUrl ? (
                    <img
                      src={toApiUrl(h.photoUrl)}
                      className="h-full w-full object-cover"
                      alt={h.name}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Users size={20} className="text-brand-textMuted" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-brand-text truncate">{h.name}</div>
                  <div className="text-xs text-brand-textMuted truncate flex items-center gap-1.5">
                    <span className="font-mono text-brand-primary/70">{h.guestId}</span>
                    <span>•</span>
                    <span>{h.tableLocation}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-brand-success font-medium">#{h.queueNumber}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
