/**
 * ConnectionStatusIndicator Component
 * Shows real-time connection status, sync progress, and queue count
 */

'use client';

import React, { useState, useEffect } from 'react';
import { connectionStatusService, ConnectionInfo } from '../lib/connection-status';
import { offlineSyncService } from '../lib/offline-sync.service';
import { ConnectionStatus } from '../types/offline.types';
import { indexedDBService } from '../lib/indexeddb';

interface ConnectionStatusIndicatorProps {
  className?: string;
  onShowQueue?: () => void;
  cachedGuestCount?: number;
}

export default function ConnectionStatusIndicator({ className = '', onShowQueue, cachedGuestCount = 0 }: ConnectionStatusIndicatorProps) {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Listen to connection status
    const unsubStatus = connectionStatusService.addListener((newStatus: ConnectionStatus, info: ConnectionInfo) => {
      setStatus(newStatus);
      setLastSync(info.lastCheck);
    });

    // Listen to queue changes
    const unsubQueue = offlineSyncService.addQueueListener((count) => {
      setPendingCount(count);
    });

    // Initial health check and start periodic checking (every 2 seconds)
    connectionStatusService.checkHealth();
    connectionStatusService.startPeriodicCheck(2000);

    return () => {
      unsubStatus();
      unsubQueue();
      connectionStatusService.stopPeriodicCheck();
    };
  }, []);

  const handleSyncNow = async () => {
    await offlineSyncService.syncPending();
  };

  const getStatusIcon = () => {
    if (status === 'online') {
      return (
        <svg className="w-5 h-5 text-brand-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-brand-danger animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0" />
        </svg>
      );
    }
  };

  const getStatusText = () => {
    if (status === 'online') {
      if (pendingCount > 0) {
        return `Offline Mode - ${pendingCount} pending`;
      }
      return 'Online';
    } else {
      return 'Connection Lost';
    }
  };

  const getStatusBg = () => {
    if (status === 'online') {
      return pendingCount > 0
        ? 'bg-brand-warning/10 border-brand-warning/30'
        : 'bg-brand-success/10 border-brand-success/30';
    } else {
      return 'bg-brand-danger/10 border-brand-danger/30';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Indicator */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:shadow-md ${getStatusBg()}`}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium text-brand-text">
          {getStatusText()}
        </span>
        {pendingCount > 0 && (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-brand-bg bg-brand-warning rounded-full">
            {pendingCount}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-brand-textDim transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="absolute top-full mt-2 right-0 w-80 surface-elevated shadow-panel z-50">
          <div className="p-4 space-y-3">
            {/* Status Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-brand-border">
              {getStatusIcon()}
              <div className="flex-1">
                <p className="font-semibold text-brand-text">
                  {getStatusText()}
                </p>
                <p className="text-xs text-brand-textDim">
                  Last check: {lastSync ? new Date(lastSync).toLocaleTimeString('id-ID') : '-'}
                </p>
              </div>
            </div>

            {/* Offline Mode Info */}
            {pendingCount > 0 && (
              <div className="bg-brand-warning/10 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-warning mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-brand-warning">
                      {pendingCount} check-in pending sync
                    </p>
                    <p className="text-xs text-brand-warning mt-1">
                      {status === 'online'
                        ? 'Will sync automatically'
                        : 'Will sync when connection restored'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cached Guests Info */}
            {cachedGuestCount > 0 && (
              <div className="bg-brand-info/10 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-info mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-brand-info">
                      {cachedGuestCount} tamu ditarik cache lokal
                    </p>
                    <p className="text-xs text-brand-info/80 mt-1">
                      Tersedia untuk pencarian offline
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {pendingCount > 0 && status === 'online' && (
                <button
                  onClick={handleSyncNow}
                  className="flex-1 px-3 py-2 bg-brand-primary hover:opacity-90 text-brand-bg text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync Now
                </button>
              )}
              {onShowQueue && (
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onShowQueue();
                  }}
                  className="flex-1 px-3 py-2 bg-brand-surfaceMuted hover:bg-brand-surfaceBright text-brand-textMuted text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  View Queue
                </button>
              )}
            </div>

            {/* Retry Status (if offline) */}
            {status !== 'online' && (
              <div className="text-xs text-brand-textDim text-center">
                <p>Retrying connection check...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
