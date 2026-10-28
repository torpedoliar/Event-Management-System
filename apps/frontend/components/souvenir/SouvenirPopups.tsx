'use client';

import { AlertTriangle, CheckCircle, Clock, Gift, Package, Users, X } from 'lucide-react';
import { toApiUrl } from '@/lib/api';
import type { Guest, SouvenirTakeInfo } from '@/lib/souvenir/types';

/**
 * Popup konfirmasi souvenir berhasil diambil.
 * Ditampilkan besar agar terbaca dari jarak beberapa meter di kiosk.
 */
export function SouvenirConfirmation({
  guest,
  onClose,
}: {
  guest: Guest | null;
  onClose: () => void;
}) {
  if (!guest) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-xl surface-elevated text-brand-text shadow-gold grid grid-cols-1 md:grid-cols-[320px_1fr] animate-in fade-in zoom-in duration-300">
        <div className="bg-brand-bgSubtle flex items-center justify-center min-h-[300px] md:min-h-full">
          {guest.photoUrl ? (
            <img
              src={toApiUrl(guest.photoUrl)}
              alt={guest.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-brand-textDim p-8 flex flex-col items-center gap-2">
              <Users size={48} className="opacity-50" />
              <span>No Photo</span>
            </div>
          )}
        </div>

        <div className="p-6 md:p-10 space-y-4 relative overflow-y-auto max-h-[60vh] md:max-h-full">
          <div className="text-brand-primary text-xl font-bold flex items-center gap-2">
            <Gift size={24} />
            SOUVENIR DIAMBIL
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">
                Queue
              </div>
              <div className="text-5xl md:text-7xl font-extrabold text-brand-text leading-none">
                {guest.queueNumber}
              </div>
            </div>
            <div>
              <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">
                Guest ID
              </div>
              <div className="text-2xl md:text-3xl font-mono font-semibold text-brand-text">
                {guest.guestId}
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">
              Nama
            </div>
            <div className="text-3xl md:text-5xl font-bold text-brand-text leading-tight">
              {guest.name}
            </div>
          </div>

          <div>
            <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">
              Meja / Ruangan
            </div>
            <div className="text-2xl md:text-3xl text-brand-text">{guest.tableLocation}</div>
          </div>

          <div className="pt-6 flex items-center gap-3">
            <button
              className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surfaceMuted px-6 py-3 text-base font-medium text-brand-text hover:bg-brand-surfaceBright transition-colors"
              onClick={onClose}
            >
              <X size={20} />
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Popup peringatan saat souvenir sudah pernah diambil tamu tersebut,
 * lengkap dengan riwayat pengambilannya.
 */
export function SouvenirAlreadyTaken({
  info,
  onClose,
}: {
  info: { guest: Guest; takes: SouvenirTakeInfo[] } | null;
  onClose: () => void;
}) {
  if (!info) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl surface-elevated text-brand-text shadow-gold p-6 animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-brand-warning">
            <AlertTriangle size={24} />
            Souvenir Sudah Diambil
          </h3>
          <button
            onClick={onClose}
            className="text-brand-textDim hover:text-brand-text"
            aria-label="Tutup"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4 p-4 rounded-lg border border-brand-border bg-brand-bgSubtle">
          <div className="text-sm text-brand-textMuted mb-1">Tamu</div>
          <div className="text-xl font-bold text-brand-text">{info.guest.name}</div>
          <div className="text-sm text-brand-textMuted font-mono">{info.guest.guestId}</div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-brand-warning font-medium mb-2 flex items-center gap-2">
            <Package size={16} />
            Riwayat Pengambilan Souvenir:
          </div>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {info.takes.map((take, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-brand-warning/20 bg-brand-warning/10"
              >
                <div className="font-semibold text-brand-text flex items-center gap-2">
                  <Gift size={16} className="text-brand-warning" />
                  {take.souvenirName}
                </div>
                <div className="text-sm text-brand-textMuted mt-1 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(take.takenAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {take.takenByName && (
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      Admin: {take.takenByName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-warning px-4 py-3 font-medium text-brand-bg hover:opacity-90 transition-colors"
          >
            <CheckCircle size={18} />
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
