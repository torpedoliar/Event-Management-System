/**
 * QueueManagementPanel Component
 * Displays pending check-ins queue with status, retry, and clear options
 */

'use client';

import React, { useState, useEffect } from 'react';
import { indexedDBService, PendingCheckin } from '../lib/indexeddb';
import { offlineSyncService } from '../lib/offline-sync.service';

interface QueueManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QueueManagementPanel({ isOpen, onClose }: QueueManagementPanelProps) {
  const [pendingCheckins, setPendingCheckins] = useState<PendingCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadQueue();
      
      // Listen to queue changes
      const unsub = offlineSyncService.addQueueListener(() => {
        loadQueue();
      });

      return () => unsub();
    }
  }, [isOpen]);

  const loadQueue = async () => {
    const checkins = await indexedDBService.getPendingCheckins();
    setPendingCheckins(checkins);
  };

  const handleRetryFailed = async () => {
    setIsLoading(true);
    await offlineSyncService.retryFailed();
    await loadQueue();
    setIsLoading(false);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await offlineSyncService.syncPending();
    await loadQueue();
    setIsSyncing(false);
  };

  const handleClearQueue = async () => {
    if (confirm('Yakin ingin menghapus semua check-in yang pending? Tindakan ini tidak bisa dibatalkan.')) {
      await offlineSyncService.clearQueue();
      await loadQueue();
    }
  };

  const handleDeleteItem = async (id: string) => {
    await indexedDBService.deletePendingCheckin(id);
    await loadQueue();
  };

  if (!isOpen) return null;

  const failedCount = pendingCheckins.filter(c => c.status === 'failed').length;
  const pendingCount = pendingCheckins.filter(c => c.status === 'pending').length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-brand-secondary border border-brand-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Pending Check-ins
              </h2>
              <p className="text-sm text-white/60">
                {pendingCount} pending, {failedCount} failed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {pendingCheckins.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-white/20 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-white/60">
                Tidak ada check-in pending
              </p>
              <p className="text-sm text-white/40 mt-1">
                Semua check-in sudah tersinkronisasi
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingCheckins.map((checkin) => (
                <div
                  key={checkin.id}
                  className={`p-4 rounded-lg border transition-all ${
                    checkin.status === 'failed'
                      ? 'bg-brand-danger/10 border-brand-danger/30'
                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Status Icon */}
                        {checkin.status === 'pending' && (
                          <svg className="w-5 h-5 text-brand-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {checkin.status === 'failed' && (
                          <svg className="w-5 h-5 text-brand-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <span className="font-semibold text-white truncate">
                          {checkin.guestIdentifier}
                        </span>
                      </div>
                      <div className="text-xs text-white/50 space-y-1 ml-7">
                        <p>
                          Time: {new Date(checkin.clientTimestamp).toLocaleString('id-ID')}
                        </p>
                        {checkin.error && (
                          <p className="text-brand-danger">
                            Error: {checkin.error}
                          </p>
                        )}
                        <p>
                          Retries: {checkin.retryCount}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteItem(checkin.id)}
                      className="text-white/40 hover:text-brand-danger transition-colors"
                      title="Remove from queue"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {pendingCheckins.length > 0 && (
          <div className="px-6 py-4 border-t border-brand-border space-y-3">
            <div className="flex gap-2">
              <button
                onClick={handleSyncNow}
                disabled={isSyncing || pendingCheckins.length === 0}
                className="flex-1 px-4 py-2 bg-brand-primary hover:bg-brand-primarySoft disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync Now
                  </>
                )}
              </button>
              {failedCount > 0 && (
                <button
                  onClick={handleRetryFailed}
                  disabled={isLoading}
                  className="px-4 py-2 bg-brand-warning hover:bg-brand-warning/90 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry Failed
                </button>
              )}
            </div>
            <button
              onClick={handleClearQueue}
              className="w-full px-4 py-2 text-brand-danger hover:bg-brand-danger/10 text-sm font-medium rounded-lg transition-colors"
            >
              Clear All Pending
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
