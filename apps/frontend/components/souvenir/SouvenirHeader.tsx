'use client';

import { Gift, Radio } from 'lucide-react';
import ConnectionStatusIndicator from '@/components/ConnectionStatusIndicator';
import { toApiUrl } from '@/lib/api';

/**
 * Kepala halaman souvenir: brand event dan indikator koneksi realtime.
 */
export default function SouvenirHeader({
  logoUrl,
  eventName,
  connected,
  cachedGuestCount,
  onShowQueue,
}: {
  logoUrl?: string | null;
  eventName?: string | null;
  connected: boolean;
  cachedGuestCount?: number;
  onShowQueue: () => void;
}) {
  return (
    <div className="relative z-10 p-6 flex items-center gap-4">
      {logoUrl && <img src={toApiUrl(logoUrl)} className="h-12 w-auto" alt="logo" />}

      <div className="text-brand-text">
        <div className="text-2xl md:text-4xl font-bold text-shadow-lg flex items-center gap-3">
          <Gift className="text-brand-primary" size={32} />
          Souvenir Check-in
        </div>
        <div className="text-sm md:text-base opacity-80 text-shadow flex items-center gap-2">
          {eventName}
          <span className="mx-2">•</span>
          <Radio
            size={12}
            className={`${connected ? 'text-brand-success animate-pulse' : 'text-brand-danger'}`}
          />
          <span className="text-xs">{connected ? 'Live' : 'Offline'}</span>
          <div className="ml-4">
            <ConnectionStatusIndicator
              onShowQueue={onShowQueue}
              cachedGuestCount={cachedGuestCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
