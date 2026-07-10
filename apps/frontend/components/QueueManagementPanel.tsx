/**
 * QueueManagementPanel Component
 * Displays pending check-ins and souvenir takes queue with status, retry, and clear options
 */

'use client';

import React, { useState, useEffect } from 'react';
import { indexedDBService, PendingCheckin, PendingSouvenir } from '../lib/indexeddb';
import { offlineSyncService } from '../lib/offline-sync.service';

interface QueueManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QueueManagementPanel({ isOpen, onClose }: QueueManagementPanelProps) {
  const [activeTab, setActiveTab] = useState<'checkin' | 'souvenir'>('checkin');
  const [pendingCheckins, setPendingCheckins] = useState<PendingCheckin[]>([]);
  const [pendingSouvenirs, setPendingSouvenirs] = useState<PendingSouvenir[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadQueues();
      
      // Listen to queue changes
      const unsubCheckin = offlineSyncService.addQueueListener(() => {
        loadQueues();
      });

      const unsubSouvenir = offlineSyncService.addSouvenirQueueListener(() => {
        loadQueues();
      });

      return () => {
        unsubCheckin();
        unsubSouvenir();
      };
    }
  }, [isOpen]);

  const loadQueues = async () => {
    const [checkins, souvenirs] = await Promise.all([
      indexedDBService.getPendingCheckins(),
      indexedDBService.getPendingSouvenirs()
    ]);
    setPendingCheckins(checkins);
    setPendingSouvenirs(souvenirs);
  };

  const handleRetryFailed = async () => {
    setIsLoading(true);
    await offlineSyncService.retryFailed();
    await loadQueues();
    setIsLoading(false);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    if (activeTab === 'checkin') {
      await offlineSyncService.syncPending();
    } else {
      await offlineSyncService.syncPendingSouvenirs();
    }
    await loadQueues();
    setIsSyncing(false);
  };

  const handleClearQueue = async () => {
    const typeLabel = activeTab === 'checkin' ? 'check-in' : 'pengambilan souvenir';
    if (confirm(`Yakin ingin menghapus semua ${typeLabel} yang pending? Tindakan ini tidak bisa dibatalkan.`)) {
      if (activeTab === 'checkin') {
        await offlineSyncService.clearQueue();
      } else {
        await offlineSyncService.clearSouvenirQueue();
      }
      await loadQueues();
    }
  };

  const handleDeleteCheckin = async (id: string) => {
    await indexedDBService.deletePendingCheckin(id);
    await loadQueues();
  };

  const handleDeleteSouvenir = async (id: string) => {
    await indexedDBService.deletePendingSouvenir(id);
    await loadQueues();
  };

  if (!isOpen) return null;

  const currentQueue = activeTab === 'checkin' ? pendingCheckins : pendingSouvenirs;
  const failedCount = currentQueue.filter(c => c.status === 'failed').length;
  const pendingCount = currentQueue.filter(c => c.status === 'pending').length;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Kelola Antrean Offline"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="surface-elevated max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-panel">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-brand-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-text">
                Kelola Antrean Offline
              </h2>
              <p className="text-sm text-brand-textMuted">
                Data yang tersimpan lokal dan belum terkirim
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="text-brand-textDim hover:text-brand-text transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-brand-border bg-brand-bgElevated/50">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'checkin' 
                ? 'text-brand-primary border-brand-primary bg-brand-primary/5' 
                : 'text-brand-textMuted border-transparent hover:text-brand-text hover:bg-brand-surface/30'
            }`}
          >
            Check-in ({pendingCheckins.length})
          </button>
          <button
            onClick={() => setActiveTab('souvenir')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'souvenir' 
                ? 'text-brand-primary border-brand-primary bg-brand-primary/5' 
                : 'text-brand-textMuted border-transparent hover:text-brand-text hover:bg-brand-surface/30'
            }`}
          >
            Souvenirs ({pendingSouvenirs.length})
          </button>
        </div>

        {/* Queue Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {currentQueue.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-brand-surface/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-textDim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-brand-text font-medium">
                Antrean Kosong
              </p>
              <p className="text-sm text-brand-textDim mt-1">
                Semua data {activeTab === 'checkin' ? 'check-in' : 'souvenir'} sudah tersinkronisasi
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-brand-textDim uppercase tracking-widest mb-2">
                 <span>Detail {activeTab === 'checkin' ? 'Guest' : 'Souvenir'}</span>
                 <span>Status</span>
              </div>
              {currentQueue.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border transition-all ${
                    item.status === 'failed'
                      ? 'bg-brand-danger/10 border-brand-danger/30'
                      : 'bg-brand-surface/30 border-brand-border hover:border-brand-borderHover'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-brand-text truncate">
                          {item.guestIdentifier}
                        </span>
                        {'souvenirId' in item && (
                          <span className="px-2 py-0.5 rounded bg-brand-primary/20 text-brand-primary text-2xs font-bold">
                             SOUVENIR ID: {item.souvenirId}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-brand-textDim space-y-1">
                        <p className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(item.clientTimestamp).toLocaleString('id-ID')}
                        </p>
                        {item.error && (
                          <p className="text-brand-danger font-medium flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {item.error}
                          </p>
                        )}
                        <p className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Retries: {item.retryCount}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                       <span className={`px-2 py-1 rounded text-2xs font-bold uppercase transition-colors ${
                         item.status === 'failed' ? 'bg-brand-danger text-white' : 
                         item.status === 'syncing' ? 'bg-brand-primary text-white animate-pulse' : 
                         'bg-brand-warning text-black'
                       }`}>
                         {item.status}
                       </span>
                       <button
                        onClick={() => 'souvenirId' in item ? handleDeleteSouvenir(item.id) : handleDeleteCheckin(item.id)}
                        className="p-1.5 text-brand-textDim hover:text-brand-danger hover:bg-brand-danger/10 rounded transition-all"
                        title="Remove from queue"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {currentQueue.length > 0 && (
          <div className="px-6 py-4 border-t border-brand-border bg-brand-surface/50 space-y-3">
            <div className="flex gap-3">
              <button
                onClick={handleSyncNow}
                disabled={isSyncing || currentQueue.length === 0}
                className="flex-[2] px-4 py-3 bg-brand-primary hover:bg-brand-primarySoft disabled:opacity-50 text-white font-bold rounded-lg shadow-lg shadow-brand-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95"
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
                    Sync Sekarang
                  </>
                )}
              </button>
              
              <button
                onClick={handleClearQueue}
                disabled={isSyncing || currentQueue.length === 0}
                className="flex-1 px-4 py-3 bg-brand-surface/30 hover:bg-brand-danger hover:text-white text-brand-textMuted font-medium rounded-lg border border-brand-border transition-all active:scale-95"
              >
                Clear All
              </button>
            </div>
            
            {failedCount > 0 && (
              <button
                onClick={handleRetryFailed}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-brand-warning/10 hover:bg-brand-warning/20 text-brand-warning text-sm font-bold rounded-lg border border-brand-warning/20 transition-colors"
              >
                Retry {failedCount} Gagal
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
