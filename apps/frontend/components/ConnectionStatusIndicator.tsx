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

    // Initial health check
    connectionStatusService.checkHealth();

    return () => {
      unsubStatus();
      unsubQueue();
    };
  }, []);

  const handleSyncNow = async () => {
    await offlineSyncService.syncPending();
  };

  const getStatusIcon = () => {
    if (status === 'online') {
      return (
        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    } else {
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
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
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {getStatusText()}
        </span>
        {pendingCount > 0 && (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-yellow-600 rounded-full">
            {pendingCount}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4 space-y-3">
            {/* Status Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              {getStatusIcon()}
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {getStatusText()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last check: {lastSync ? new Date(lastSync).toLocaleTimeString('id-ID') : '-'}
                </p>
              </div>
            </div>

            {/* Offline Mode Info */}
            {pendingCount > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      {pendingCount} check-in pending sync
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
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
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      {cachedGuestCount} tamu ditarik cache lokal
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
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
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                <p>Retrying connection check...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
