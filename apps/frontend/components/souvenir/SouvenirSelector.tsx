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

  if (souvenirs.length === 0) return null;

  if (available.length === 0) {
    return (
      <p className="kiosk-error" role="status">
        <AlertTriangle size={15} aria-hidden="true" />
        Stok souvenir habis. Tidak ada yang bisa diberikan.
      </p>
    );
  }

  return (
    <div className="kiosk-select">
      <label htmlFor="souvenir-select">
        <Package size={14} aria-hidden="true" />
        Souvenir yang diberikan
      </label>
      <select
        id="souvenir-select"
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
      >
        <option value="">— pilih souvenir —</option>
        {available.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} · sisa {s.remaining}/{s.quantity}
          </option>
        ))}
      </select>
      {selectedId && (
        <span className="kiosk-select-note">
          <CheckCircle size={13} aria-hidden="true" />
          Pencarian berikutnya otomatis memberikan souvenir ini
        </span>
      )}
    </div>
  );
}
