'use client';

import type { ReactNode, RefObject } from 'react';
import { Award, Hash, HelpCircle, Search, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import type { EligibleGuest } from '@/lib/luckydraw/types';

/** Tab filter daftar tamu. */
export type EligibleTab = 'all' | 'eligible' | 'won';

export interface EligibleMeta {
  total: number;
  eligible: number;
  won: number;
  totalCheckedIn: number;
  page: number;
  totalPages: number;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-brand-primary/15 text-brand-primary' : 'text-brand-textMuted hover:text-brand-text hover:bg-brand-text/5'}`}
    >
      {children}
    </button>
  );
}

/**
 * Modal daftar tamu yang berhak mengikuti undian, dengan pencarian,
 * filter tab, dan pemuatan bertahap (infinite scroll).
 *
 * Diekstrak dari halaman lucky draw; data dan aksi masuk lewat props.
 */
export default function EligibleGuestsModal({
  open,
  onClose,
  meta,
  data,
  loading,
  loadingMore,
  searchQuery,
  onSearchQueryChange,
  searchGuestId,
  onSearchGuestIdChange,
  activeTab,
  onTabChange,
  listEndRef,
  onLoadMore,
  pageSize,
}: {
  open: boolean;
  onClose: () => void;
  meta: EligibleMeta;
  data: EligibleGuest[];
  loading: boolean;
  loadingMore: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchGuestId: string;
  onSearchGuestIdChange: (value: string) => void;
  activeTab: EligibleTab;
  onTabChange: (tab: EligibleTab) => void;
  listEndRef: RefObject<HTMLDivElement>;
  onLoadMore: () => void;
  pageSize: number;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-4xl"
      title={
        <span className="flex items-center gap-2">
          <Users className="text-brand-primary" size={20} />
          Daftar Tamu
          <span className="text-sm font-mono text-brand-textMuted ml-2">
            ({meta.eligible} berhak)
          </span>
        </span>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted"
          />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Cari nama, perusahaan, atau nomor antrian..."
            className="pl-10"
          />
        </div>

        <div className="relative">
          <Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted" />
          <Input
            value={searchGuestId}
            onChange={(e) => onSearchGuestIdChange(e.target.value)}
            placeholder="Cari ID Tamu (contoh: G001, INV-0042)..."
            className="pl-10 font-mono"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <TabButton active={activeTab === 'all'} onClick={() => onTabChange('all')}>
            Semua ({meta.totalCheckedIn})
          </TabButton>
          <TabButton active={activeTab === 'eligible'} onClick={() => onTabChange('eligible')}>
            Berhak ({meta.eligible})
          </TabButton>
          <TabButton active={activeTab === 'won'} onClick={() => onTabChange('won')}>
            Menang ({meta.won})
          </TabButton>
        </div>

        <div className="flex items-start gap-2 text-xs text-brand-textDim px-1">
          <HelpCircle size={13} className="shrink-0 mt-0.5" />
          <span>
            Semua = tamu yang sudah check-in. Berhak = bisa ikut undian (belum menang hadiah
            apapun). Menang = sudah pernah menang. Jika &quot;allowMultipleWins&quot; aktif, tamu
            yang sudah menang tetap berhak.
          </span>
        </div>

        <div className="max-h-[50vh] overflow-y-auto space-y-2 pt-1">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
            </div>
          )}

          {!loading &&
            data.map((guest) => (
              <div
                key={guest.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${guest.wonPrizes.length > 0 ? 'bg-brand-primary/5 border-brand-primary/20' : 'bg-brand-text/5 border-brand-border'}`}
              >
                <div className="font-bold text-xs font-mono text-brand-primary shrink-0">
                  {guest.guestId || guest.queueNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-brand-text text-sm truncate">{guest.name}</div>
                  <div className="text-xs text-brand-textMuted truncate">
                    {guest.company || '-'}
                    {guest.division && <span> ({guest.division})</span>}
                  </div>
                </div>
                {guest.wonPrizes.length > 0 ? (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-brand-primary/15 text-brand-primary text-xs font-mono whitespace-nowrap">
                    <Award size={12} />
                    <span className="truncate max-w-[120px]">{guest.wonPrizes.join(', ')}</span>
                  </div>
                ) : (
                  <div className="px-2 py-1 rounded-full bg-brand-success/15 text-brand-success text-xs font-mono">
                    Berhak
                  </div>
                )}
              </div>
            ))}

          {!loading && data.length === 0 && (
            <div className="text-center py-10 text-brand-textMuted">
              <Users className="mx-auto mb-2 opacity-50" size={28} />
              Tidak ada tamu yang cocok.
            </div>
          )}

          {meta.page < meta.totalPages && (
            <div ref={listEndRef} className="flex justify-center py-3">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-brand-textMuted text-sm">
                  <div className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                  Memuat lagi...
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={onLoadMore}>
                  Muat {Math.min(pageSize, meta.total - data.length)} tamu lagi
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between text-xs text-brand-textMuted pt-2 border-t border-brand-border">
          <span>Hadir: {meta.totalCheckedIn}</span>
          <span>Berhak: {meta.eligible}</span>
          <span>Menang: {meta.won}</span>
        </div>
      </div>
    </Modal>
  );
}
