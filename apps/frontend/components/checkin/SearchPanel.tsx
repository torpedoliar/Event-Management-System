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
    <div className="kiosk-search-wrap">
      <div className="kiosk-search">
        <div className={`kiosk-field ${busy ? 'is-busy' : ''}`}>
          <span className="kiosk-field-icon">
            <Search size={21} aria-hidden="true" />
          </span>
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pindai QR, atau ketik ID / nama tamu"
            className="kiosk-input"
            autoFocus
          />
          <kbd className="kiosk-kbd">Enter</kbd>
          <span className="kiosk-field-progress" aria-hidden="true" />
        </div>

        <div className="kiosk-hint">
          <HelpCircle size={13} aria-hidden="true" />
          <span>
            Enter langsung memproses. Tamu tidak ditemukan? Aktifkan Auto-Create di Pengaturan.
          </span>
        </div>

        <ScanHistory logs={scanLogs} />

        {error && (
          <p className="kiosk-error" role="alert">
            {error}
          </p>
        )}

        <div className="kiosk-actions">
          <Button
            size="lg"
            className="flex-1"
            disabled={busy}
            loading={busy}
            onClick={onSearch}
          >
            {!busy && <Search size={20} />}
            {searching
              ? 'Mencari...'
              : creatingGuest
                ? 'Membuat tamu...'
                : checking
                  ? 'Check-in...'
                  : 'Cari & check-in'}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="flex-1 sm:flex-initial"
            disabled={busy}
            onClick={onScanClick}
          >
            <QrCode size={20} />
            Scan QR
          </Button>

          <Button size="lg" variant="ghost" onClick={onSettingsClick} aria-label="Pengaturan">
            <Settings size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}
