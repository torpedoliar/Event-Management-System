'use client';

import { AlertTriangle, CheckCircle, Package } from 'lucide-react';
import type { Souvenir } from '@/lib/souvenir/types';

/**
 * Pemilih souvenir yang akan diberikan.
 *
 * Bila seluruh stok habis, dropdown diganti peringatan agar operator tidak
 * mencari-cari pilihan yang tidak ada.
 */
export default function SouvenirSelector({
  souvenirs,
  selectedId,
  onSelect,
  disabled,
}: {
  souvenirs: Souvenir[];
  selectedId: string;
  onSelect: (souvenirId: string) => void;
  disabled: boolean;
}) {
  const available = souvenirs.filter((s) => s.remaining > 0);
  const hasStock = available.length > 0;

  if (souvenirs.length === 0) return null;

  if (!hasStock) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-brand-danger/30 bg-brand-danger/10 p-4 text-brand-danger">
        <AlertTriangle size={20} className="text-brand-danger flex-shrink-0" />
        <span className="text-sm">
          Semua stok souvenir sudah habis. Tidak dapat memberikan souvenir.
        </span>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className="text-sm text-brand-textMuted mb-2 flex items-center gap-2">
        <Package size={16} className="text-brand-primary" />
        Pilih Souvenir untuk Check-in:
      </label>

      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-lg border border-brand-primary/50 bg-brand-primary/10 px-3 py-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/70 appearance-none cursor-pointer"
        disabled={disabled}
      >
        <option value="" className="bg-brand-bgElevated text-brand-text">
          -- Pilih Souvenir --
        </option>
        {available.map((s) => (
          <option key={s.id} value={s.id} className="bg-brand-bgElevated text-brand-text">
            {s.name} (Sisa: {s.remaining}/{s.quantity})
          </option>
        ))}
      </select>

      {selectedId && (
        <div className="mt-2 text-sm text-brand-primarySoft flex items-center gap-2">
          <CheckCircle size={14} />
          <span>Pencarian akan otomatis memberikan souvenir ini</span>
        </div>
      )}
    </div>
  );
}
