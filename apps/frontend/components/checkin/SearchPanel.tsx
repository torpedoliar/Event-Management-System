'use client';

import type { KeyboardEvent, RefObject } from 'react';
import { HelpCircle, QrCode, Search, Settings } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ScanHistory from '@/components/checkin/ScanHistory';
import type { ScanLogItem } from '@/lib/checkin/types';

/**
 * Panel pencarian & aksi utama kiosk check-in.
 *
 * Enter pada kolom pencarian memicu `onSubmit`; halaman yang memasukkan nilai
 * ke antrean pemrosesan cepat. Komponen ini tidak menyimpan state.
 */
export default function SearchPanel({
  value,
  onChange,
  onSubmit,
  inputRef,
  scanLogs,
  error,
  searching,
  checking,
  creatingGuest,
  onSearch,
  onScanClick,
  onSettingsClick,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef: RefObject<HTMLInputElement>;
  scanLogs: ScanLogItem[];
  error?: string | null;
  searching: boolean;
  checking: boolean;
  creatingGuest: boolean;
  onSearch: () => void;
  onScanClick: () => void;
  onSettingsClick: () => void;
}) {
  const busy = searching || checking || creatingGuest;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit();
  };

  return (
    <div className="relative z-10 px-4 py-6 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="surface-elevated p-6 md:p-8">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-textMuted">
              <Search size={22} />
            </div>
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Masukkan ID Tamu atau Nama, lalu tekan Enter"
              className="pl-12 pr-4 py-4 text-lg"
              autoFocus
            />
          </div>

          {/* Petunjuk singkat */}
          <div className="mt-3 flex items-center gap-2 text-xs text-brand-textDim">
            <HelpCircle size={13} className="shrink-0" />
            <span>
              Ketik ID atau nama tamu → Enter untuk check-in cepat. Bisa scan QR juga. Tamu tidak
              ditemukan? Aktifkan Auto-Create di Pengaturan.
            </span>
          </div>

          <ScanHistory logs={scanLogs} />

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger flex items-center justify-between">
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Button
              size="lg"
              className="flex-1"
              disabled={busy}
              loading={busy}
              onClick={onSearch}
            >
              {!busy && <Search size={22} />}
              {searching
                ? 'Mencari...'
                : creatingGuest
                  ? 'Membuat Tamu...'
                  : checking
                    ? 'Check-in...'
                    : 'Cari & Check-in'}
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="flex-1 sm:flex-initial text-brand-text"
              disabled={busy}
              onClick={onScanClick}
            >
              <QrCode size={22} />
              Scan QR
            </Button>

            <Button
              size="lg"
              variant="ghost"
              onClick={onSettingsClick}
              aria-label="Pengaturan"
            >
              <Settings size={22} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
