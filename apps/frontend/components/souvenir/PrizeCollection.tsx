'use client';

import { CheckCircle, ChevronDown, ChevronUp, Loader2, Printer, Trophy } from 'lucide-react';
import type { PrizeWin } from '@/lib/souvenir/types';

/**
 * Panel pengambilan hadiah lucky draw untuk tamu yang dipilih.
 *
 * Menampilkan hadiah yang belum diambil (bisa diproses) dan yang sudah
 * diambil (beserta keterangan waktu & petugas). Dapat dilipat.
 */
export default function PrizeCollection({
  uncollected,
  collected,
  showPrizes,
  onTogglePrizes,
  collectingPrize,
  onCollectPrize,
  onPrintReceipt,
}: {
  uncollected: PrizeWin[];
  collected: PrizeWin[];
  showPrizes: boolean;
  onTogglePrizes: () => void;
  collectingPrize?: string | null;
  onCollectPrize: (prizeWinnerId: string) => void;
  onPrintReceipt: (prizeWin: PrizeWin) => void;
}) {
  return (
    <div className="relative z-10 px-6 pb-6 flex justify-center">
      <div className="w-full max-w-5xl rounded-xl surface-elevated p-4 text-brand-text shadow-gold backdrop-blur-sm">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={onTogglePrizes}
        >
          <div className="font-semibold flex items-center gap-2 text-brand-warning">
            <Trophy size={20} />
            Hadiah Lucky Draw ({uncollected.length} belum diambil, {collected.length} sudah diambil)
          </div>
          <button className="text-brand-warning hover:text-brand-text" aria-label="Buka/tutup daftar hadiah">
            {showPrizes ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {showPrizes && (
          <div className="mt-4 space-y-3">
            {/* Belum diambil */}
            {uncollected.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-brand-warning font-medium">
                  Belum Diambil - Pilih hadiah yang akan diambil:
                </div>
                {uncollected.map((pw) => (
                  <div
                    key={pw.id}
                    className="flex items-center justify-between rounded-lg border border-brand-warning/30 bg-brand-warning/10 p-3"
                  >
                    <div>
                      <div className="font-semibold text-brand-text flex items-center gap-2">
                        <Trophy size={16} className="text-brand-warning" />
                        {pw.prize.name}
                      </div>
                      <div className="text-xs text-brand-textMuted">
                        Kategori:{' '}
                        {pw.prize.category === 'UTAMA' ? 'Hadiah Utama' : 'Hadiah Hiburan'}
                        {pw.prize.description && ` • ${pw.prize.description}`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onPrintReceipt(pw)}
                        className="flex items-center gap-2 rounded-lg bg-brand-info/20 text-brand-info border border-brand-info/30 px-3 py-2 font-medium hover:bg-brand-info/30 transition-colors"
                        title="Print Tanda Terima"
                        aria-label="Cetak tanda terima"
                      >
                        <Printer size={16} />
                      </button>
                      <button
                        onClick={() => onCollectPrize(pw.id)}
                        disabled={collectingPrize === pw.id}
                        className="flex items-center gap-2 rounded-lg bg-brand-warning px-4 py-2 font-medium text-brand-bg hover:opacity-90 disabled:opacity-50 transition-colors"
                      >
                        {collectingPrize === pw.id ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        {collectingPrize === pw.id ? 'Memproses...' : 'Ambil Hadiah Ini'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sudah diambil */}
            {collected.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-brand-success/80 font-medium">
                  Sudah Diambil:
                </div>
                {collected.map((pw) => (
                  <div
                    key={pw.id}
                    className="flex items-center justify-between rounded-lg border border-brand-success/30 bg-brand-success/10 p-3 opacity-75 hover:opacity-100 transition-opacity"
                  >
                    <div>
                      <div className="font-semibold text-brand-text flex items-center gap-2">
                        <CheckCircle size={16} className="text-brand-success" />
                        {pw.prize.name}
                      </div>
                      <div className="text-xs text-brand-success/80">
                        Diambil pada{' '}
                        {new Date(pw.collection!.collectedAt).toLocaleString('id-ID')}
                        {pw.collection!.collectedByName &&
                          ` oleh ${pw.collection!.collectedByName}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onPrintReceipt(pw)}
                        className="flex items-center gap-2 rounded-lg bg-brand-info/20 text-brand-info border border-brand-info/30 px-3 py-1 font-medium hover:bg-brand-info/30 transition-colors"
                        title="Print Tanda Terima"
                      >
                        <Printer size={14} /> Cetak
                      </button>
                      <span className="px-3 py-1 rounded-full bg-brand-success/30 text-brand-success text-sm font-medium">
                        Sudah Diambil
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
