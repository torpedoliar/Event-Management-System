'use client';

import { Monitor, Users } from 'lucide-react';
import ConnectionStatusIndicator from '@/components/ConnectionStatusIndicator';
import StatusBadge from '@/components/ui/StatusBadge';
import { toApiUrl } from '@/lib/api';
import type { EventConfig } from '@/lib/checkin/types';

export interface StationInfo {
  stationName: string;
}

/**
 * Kepala halaman kiosk: identitas event, admin yang login, dan status stasiun.
 *
 * Navigasi (antrian, stasiun) dikembalikan ke halaman lewat callback agar
 * komponen ini tetap murni tampilan.
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
  const hasMeta = Boolean(cfg?.date || cfg?.location);

  return (
    <div className="relative z-30 p-4 md:p-6 pb-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {cfg?.logoUrl ? (
              <img
                src={toApiUrl(cfg.logoUrl)}
                className="h-12 md:h-16 w-auto border border-brand-primary/30 rounded-lg"
                alt="logo"
              />
            ) : (
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-brand-primary/10 border border-brand-border flex items-center justify-center">
                <Users size={28} className="text-brand-primary" />
              </div>
            )}

            <div>
              <div className="text-xl md:text-3xl font-semibold text-brand-text">
                {cfg?.name || 'Event'}
              </div>
              {hasMeta && (
                <div className="text-sm text-brand-text/70 flex items-center gap-2 mt-0.5">
                  {cfg?.date && (
                    <span>
                      {new Date(cfg.date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                  {cfg?.date && cfg?.location && <span>•</span>}
                  {cfg?.location && <span>{cfg.location}</span>}
                </div>
              )}
            </div>
          </div>

          {currentAdmin ? (
            <StatusBadge status="success">{currentAdmin.name}</StatusBadge>
          ) : (
            <StatusBadge status="warning">Tidak login</StatusBadge>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          {stationConfig ? (
            <StatusBadge status="info" className="flex items-center gap-1.5">
              <Monitor size={12} />
              {stationConfig.stationName}
            </StatusBadge>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onShowQueue}
              className="text-brand-text/60 hover:text-brand-text text-sm"
            >
              Antrian
            </button>
            <button
              onClick={onShowStationSetup}
              className="text-brand-text/60 hover:text-brand-text text-sm"
            >
              Stasiun
            </button>
            <ConnectionStatusIndicator onShowQueue={onShowQueue} cachedGuestCount={cachedGuestCount} />
          </div>
        </div>
      </div>
    </div>
  );
}
