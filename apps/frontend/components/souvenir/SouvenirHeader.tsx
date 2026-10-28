'use client';

import { Radio } from 'lucide-react';
import ConnectionStatusIndicator from '@/components/ConnectionStatusIndicator';
import { toApiUrl } from '@/lib/api';

/**
 * Bar atas kiosk souvenir.
 *
 * Sama seperti kiosk check-in: satu baris padat berisi identitas event,
 * status koneksi realtime, dan akses operator.
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
    <header className="kiosk-bar">
      <div className="kiosk-event">
        {logoUrl ? <img src={toApiUrl(logoUrl)} className="kiosk-event-logo" alt="" /> : null}
        <div>
          <div className="kiosk-event-name">{eventName || 'Souvenir'}</div>
          <div className="kiosk-event-meta">
            <span className="kiosk-station">
              <Radio size={11} aria-hidden="true" />
              {connected ? 'Live' : 'Offline'}
            </span>
            <span className="kiosk-divider" aria-hidden="true" />
            <span>Meja souvenir</span>
          </div>
        </div>
      </div>

      <div className="kiosk-bar-right">
        <ConnectionStatusIndicator onShowQueue={onShowQueue} cachedGuestCount={cachedGuestCount} />
      </div>
    </header>
  );
}
