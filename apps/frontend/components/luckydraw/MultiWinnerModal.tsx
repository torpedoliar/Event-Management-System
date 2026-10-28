'use client';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { Guest } from '@/lib/luckydraw/types';

/**
 * Modal pemenang undian (bisa lebih dari satu).
 *
 * Bila pemenang lebih dari 15, daftar digandakan dan diberi animasi gulir
 * otomatis agar semua nama terbaca di layar besar tanpa interaksi.
 */
export default function MultiWinnerModal({
  open,
  isRevealing,
  winners,
  totalExpected,
  prizeName,
  onClose,
}: {
  open: boolean;
  isRevealing: boolean;
  winners: Guest[];
  totalExpected: number;
  prizeName?: string;
  onClose: () => void;
}) {
  const autoScroll = winners.length > 15 && !isRevealing;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isRevealing) onClose();
      }}
      className="max-w-6xl max-h-[90vh]"
      title={
        <span className="text-center w-full block">
          <span className="block text-2xl md:text-4xl font-heading font-semibold text-brand-text">
            Selamat!
          </span>
          <span className="block text-sm text-brand-textMuted mt-1">
            {isRevealing
              ? `${winners.length} / ${totalExpected} pemenang ${prizeName ?? ''}`
              : `${winners.length} pemenang ${prizeName ?? ''}`}
          </span>
        </span>
      }
      footer={
        <Button onClick={onClose} disabled={isRevealing} className="w-full">
          {isRevealing
            ? `Mengungkap pemenang... (${winners.length}/${totalExpected})`
            : 'Tutup'}
        </Button>
      }
    >
      <div
        className={`relative ${autoScroll ? 'overflow-hidden' : 'overflow-y-auto max-h-[50vh]'}`}
      >
        {autoScroll && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
                            @keyframes modalAutoScroll { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
                            .modal-scroll { animation: modalAutoScroll 40s linear infinite; }
                        `,
            }}
          />
        )}
        <div
          className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 ${autoScroll ? 'modal-scroll' : ''}`}
        >
          {winners.map((w) => (
            <div key={w.id} className="surface p-4 text-center">
              <div className="text-brand-primary font-mono font-bold text-lg mb-1">
                {w.guestId || w.queueNumber}
              </div>
              <div className="font-semibold text-brand-text text-lg leading-tight line-clamp-2">
                {w.name}
              </div>
              <div className="text-xs text-brand-textMuted uppercase tracking-wider mt-1">
                {w.company || '-'}
              </div>
            </div>
          ))}
          {autoScroll &&
            winners.map((w) => (
              <div key={`dup-${w.id}`} className="surface p-4 text-center">
                <div className="text-brand-primary font-mono font-bold text-lg mb-1">
                  {w.guestId || w.queueNumber}
                </div>
                <div className="font-semibold text-brand-text text-lg leading-tight line-clamp-2">
                  {w.name}
                </div>
                <div className="text-xs text-brand-textMuted uppercase tracking-wider mt-1">
                  {w.company || '-'}
                </div>
              </div>
            ))}
        </div>
      </div>
    </Modal>
  );
}
