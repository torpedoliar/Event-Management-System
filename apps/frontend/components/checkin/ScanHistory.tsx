'use client';

import { HelpCircle } from 'lucide-react';
import type { ScanLogItem } from '@/lib/checkin/types';

/**
 * Riwayat pemindaian terakhir di halaman kiosk.
 *
 * Diekstrak dari halaman check-in agar tidak menambah ukuran komponen utama
 * yang sudah besar, dan agar dapat diuji/diubah tanpa menyentuh logika
 * check-in.
 */
export default function ScanHistory({ logs }: { logs: ScanLogItem[] }) {
  if (logs.length === 0) return null;

  return (
    <div className="mt-4 surface-elevated p-4 text-sm max-h-48 overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-brand-text font-semibold">Riwayat Scan</h3>
        <div className="group relative">
          <HelpCircle size={13} className="text-brand-textDim cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-brand-bgElevated border border-brand-border rounded-lg text-xs text-brand-text shadow-panel w-64 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
            Log scan terakhir. Warna hijau = berhasil, kuning = sudah check-in, merah =
            error/tidak ditemukan.
          </div>
        </div>
      </div>
      <ul className="space-y-2">
        {logs.map((log) => (
          <li
            key={log.id}
            className="flex justify-between items-center bg-brand-bgSubtle px-3 py-2 rounded-lg"
          >
            <div className="flex gap-3">
              <span className="text-brand-textMuted">{log.timestamp.toLocaleTimeString()}</span>
              <strong className="text-brand-text">{log.guestIdOrName}</strong>
            </div>
            <span
              className={`font-medium ${
                log.status === 'SUCCESS'
                  ? 'text-brand-success'
                  : log.status === 'DUPLICATE'
                    ? 'text-brand-warning'
                    : 'text-brand-danger'
              }`}
            >
              {log.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
