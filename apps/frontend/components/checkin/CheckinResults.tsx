'use client';

import { CheckCircle, Search, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toApiUrl } from '@/lib/api';
import type { Guest } from '@/lib/checkin/types';

/**
 * Daftar hasil pencarian tamu beserta tombol check-in.
 *
 * Diekstrak dari halaman kiosk; seluruh ketergantungan halaman masuk lewat
 * props sehingga komponen ini dapat diuji dan diubah secara terpisah.
 */
export default function CheckinResults({
  results,
  selectedId,
  checking,
  checkingId,
  allowMultiplePerCounter,
  onCheckin,
}: {
  results: Guest[];
  selectedId?: string | null;
  checking: boolean;
  checkingId?: string | null;
  allowMultiplePerCounter?: boolean;
  onCheckin: (guest: Guest) => void;
}) {
  return (
    <div className="relative z-10 px-4 pb-4 flex justify-center">
      <div className="w-full max-w-3xl surface-elevated p-4 md:p-6">
        {!results.length && (
          <div className="text-center py-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-text/5 flex items-center justify-center">
              <Search size={32} className="text-brand-textMuted" />
            </div>
            <div>
              <p className="text-brand-text text-lg">Siap untuk check-in</p>
              <p className="text-brand-textMuted text-sm mt-1">
                Masukkan ID Tamu / Nama atau gunakan Scan QR
              </p>
            </div>
          </div>
        )}

        {!!results.length && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-medium mb-3">
              <div className="flex items-center gap-2 text-brand-text">
                <Users size={16} className="text-brand-primary" />
                <span>{results.length} tamu ditemukan</span>
              </div>
              {results.length > 1 && (
                <span className="px-2.5 py-1 rounded-full bg-brand-warning/15 border border-brand-warning/30 text-brand-warning text-xs font-semibold animate-pulse">
                  Pilih tamu di bawah untuk Check-in
                </span>
              )}
            </div>

            {results.map((g) => (
              <div
                key={g.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl p-4 transition-all border ${
                  selectedId === g.id
                    ? 'bg-brand-primary/10 border-brand-primary/50 shadow-gold'
                    : 'border-brand-border surface-interactive hover:border-brand-primary/30'
                }`}
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                  <div className="h-14 w-14 rounded-xl bg-brand-text/5 overflow-hidden flex-shrink-0 border border-brand-border">
                    {g.photoUrl ? (
                      <img
                        src={toApiUrl(g.photoUrl)}
                        className="h-full w-full object-cover"
                        alt={g.name}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Users size={24} className="text-brand-textMuted" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-brand-text text-lg">{g.name}</span>
                      {g.checkedIn ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-warning/15 text-brand-warning border border-brand-warning/30 font-medium">
                          Sudah Check-in{' '}
                          {(g.checkinCount ?? 0) > 1 ? `(${g.checkinCount}x)` : ''}
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-success/15 text-brand-success border border-brand-success/30 font-medium">
                          Belum Check-in
                        </span>
                      )}
                    </div>

                    <div className="text-xs sm:text-sm text-brand-textMuted flex flex-wrap items-center gap-2 mt-1">
                      <span className="font-mono text-brand-primary font-medium">{g.guestId}</span>
                      <span>•</span>
                      <span>
                        Meja:{' '}
                        <strong className="text-brand-text font-medium">
                          {g.tableLocation || '-'}
                        </strong>
                      </span>
                    </div>

                    {g.company && (
                      <div className="text-xs sm:text-sm text-brand-warning/90 mt-1 font-medium flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-brand-warning/10 border border-brand-warning/20">
                          {g.company}
                          {g.division && (
                            <span className="text-brand-textMuted"> • {g.division}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  className="shrink-0 w-full sm:w-auto"
                  disabled={checking}
                  loading={checking && checkingId === g.id}
                  onClick={() => onCheckin(g)}
                >
                  {!checking && <CheckCircle size={16} />}
                  {g.checkedIn && allowMultiplePerCounter ? 'Check-in Ulang' : 'Check-in'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
