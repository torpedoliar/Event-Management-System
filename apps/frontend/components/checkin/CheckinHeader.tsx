'use client';

import { Monitor } from 'lucide-react';
import ConnectionStatusIndicator from '@/components/ConnectionStatusIndicator';
import { toApiUrl } from '@/lib/api';
import type { EventConfig } from '@/lib/checkin/types';

export interface StationInfo {
  stationName: string;
}

/**
 * Bar atas kiosk: identitas event, stasiun, koneksi, dan tautan operator.
 *
 * Padanan "backstage" dari layar panggung — informasi padat, tanpa dekorasi,
 * supaya operator bisa memastikan perangkat ini benar dalam sekali lihat.
 */
export default function CheckinHeader({
  cfg,
  currentAdmin,
  stationConfig,
  cachedGuestCount,
  onShowQueue,
  onShowStationSetup,
}: {
  cfg?: Partial<EventConfig> | null;
  currentAdmin?: { name: string } | null;
  stationConfig?: StationInfo | null;
  cachedGuestCount?: number;
  onShowQueue: () => void;
  onShowStationSetup: () => void;
}) {
  const dateLabel = cfg?.date
    ? new Date(cfg.date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <header className="kiosk-bar">
      <div className="kiosk-event">
        {cfg?.logoUrl ? (
          <img src={toApiUrl(cfg.logoUrl)} className="kiosk-event-logo" alt="" />
        ) : null}

        <div>
          <div className="kiosk-event-name">{cfg?.name || 'Event'}</div>
          <div className="kiosk-event-meta">
            {stationConfig ? (
              <span className="kiosk-station">
                <Monitor size={11} aria-hidden="true" />
                {stationConfig.stationName}
              </span>
            ) : (
              <span>Stasiun belum diatur</span>
            )}
            {(dateLabel || cfg?.location) && <span className="kiosk-divider" aria-hidden="true" />}
            {dateLabel && <span>{dateLabel}</span>}
            {cfg?.location && <span>{cfg.location}</span>}
          </div>
        </div>
      </div>

      <div className="kiosk-bar-right">
        <ConnectionStatusIndicator onShowQueue={onShowQueue} cachedGuestCount={cachedGuestCount} />
        <button type="button" onClick={onShowQueue} className="kiosk-link">
          Antrean
        </button>
        <button type="button" onClick={onShowStationSetup} className="kiosk-link">
          Stasiun
        </button>
        <span className={`kiosk-operator ${currentAdmin ? '' : 'is-guest'}`}>
          <span className="kiosk-operator-dot" aria-hidden="true" />
          {currentAdmin ? currentAdmin.name : 'Belum login'}
        </span>
      </div>
    </header>
  );
}
