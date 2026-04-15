/**
 * Offline Sync Service
 * Manages offline check-in queue and automatic synchronization with server
 */

import { indexedDBService, PendingCheckin } from './indexeddb';
import { connectionStatusService } from './connection-status';

export interface SyncResult {
  success: boolean;
  processed: number;
  successCount: number;
  conflictCount: number;
  serverTimestamp: string;
  results: Array<{
    clientTimestamp: string;
    success: boolean;
    checkinId?: string;
    conflict?: boolean;
    reason?: string;
  }>;
  remoteUpdates: Array<{
    guestId: string;
    guestName: string;
    checkinAt: string;
    stationName: string | null;
  }>;
}

type SyncListener = (result: SyncResult) => void;
type QueueChangeListener = (pendingCount: number) => void;

const SYNC_RETRY_INTERVAL = 30000; // 30 seconds
const MAX_RETRY_COUNT = 10;

class OfflineSyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;
  private syncListeners: SyncListener[] = [];
  private queueListeners: QueueChangeListener[] = [];
  private initialized = false;
  private stationId: string | null = null;
  private stationName: string | null = null;
  private syncIntervalSeconds = SYNC_RETRY_INTERVAL / 1000;

  // ==================== INITIALIZATION ====================

  async init(stationId: string, stationName: string, syncInterval?: number): Promise<void> {
    this.stationId = stationId;
    this.stationName = stationName;
    this.syncIntervalSeconds = syncInterval || 30;

    // Initialize IndexedDB
    await indexedDBService.init();

    // Start periodic sync
    this.startPeriodicSync();

    // Listen to connection status
    connectionStatusService.addListener((status) => {
      if (status === 'online') {
        // Immediately sync when connection restored
        this.syncPending();
      }
    });

    this.initialized = true;
    this.notifyQueueListeners();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // ==================== QUEUE MANAGEMENT ====================

  async addToQueue(guestIdentifier: string, photo?: string): Promise<string> {
    const pending: Omit<PendingCheckin, 'id' | 'createdAt' | 'updatedAt'> = {
      guestIdentifier,
      clientTimestamp: new Date().toISOString(),
      photo,
      status: 'pending',
      retryCount: 0
    };

    const id = await indexedDBService.addPendingCheckin(pending);
    this.notifyQueueListeners();

    // Trigger immediate sync if online
    if (connectionStatusService.getStatus() === 'online') {
      this.syncPending();
    }

    return id;
  }

  async getPendingCount(): Promise<number> {
    return indexedDBService.getPendingCount();
  }

  async getPendingCheckins(): Promise<PendingCheckin[]> {
    return indexedDBService.getPendingCheckins();
  }

  async retryFailed(): Promise<void> {
    const pending = await indexedDBService.getPendingCheckins();
    const failed = pending.filter(p => p.status === 'failed');

    for (const checkin of failed) {
      await indexedDBService.updatePendingCheckin(checkin.id, {
        status: 'pending',
        retryCount: 0,
        error: undefined
      });
    }

    this.notifyQueueListeners();
    
    if (connectionStatusService.getStatus() === 'online') {
      this.syncPending();
    }
  }

  async clearQueue(): Promise<void> {
    const pending = await indexedDBService.getPendingCheckins();
    for (const checkin of pending) {
      await indexedDBService.deletePendingCheckin(checkin.id);
    }
    this.notifyQueueListeners();
  }

  // ==================== SYNC ====================

  async syncPending(): Promise<SyncResult | null> {
    if (!this.stationId || this.isSyncing) return null;

    const pending = await indexedDBService.getPendingCheckins();
    if (pending.length === 0) return null;

    this.isSyncing = true;
    this.notifyQueueListeners();

    try {
      // OPTIMIZATION: Batch get station config (avoid sequential await)
      const [stationConfig] = await Promise.all([
        indexedDBService.getStationConfig()
      ]);
      
      const lastSyncAt = stationConfig?.lastSyncAt;

      // Build payload
      const payload = {
        stationId: this.stationId,
        stationName: this.stationName,
        lastSyncAt,
        pendingCheckins: pending.map(p => ({
          guestIdentifier: p.guestIdentifier,
          clientTimestamp: p.clientTimestamp,
          photo: p.photo
        }))
      };

      // Call sync endpoint
      const response = await fetch('/api/public/guests/sync-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }

      const result: SyncResult = await response.json();

      // OPTIMIZATION: Batch update all pending check-ins (parallel)
      await Promise.all(
        pending.map(async (pendingItem, i) => {
          const itemResult = result.results[i];
          if (!itemResult) return;

          const updates: Partial<PendingCheckin> = itemResult.success
            ? { status: 'synced', error: undefined }
            : itemResult.conflict
              ? { status: 'failed', error: `Conflict: ${itemResult.reason}`, retryCount: pendingItem.retryCount + 1 }
              : { status: 'failed', error: itemResult.reason || 'Unknown error', retryCount: pendingItem.retryCount + 1 };

          return indexedDBService.updatePendingCheckin(pendingItem.id, updates);
        })
      );

      // OPTIMIZATION: Parallel cleanup and station update
      await Promise.all([
        indexedDBService.clearSyncedCheckins(),
        stationConfig ? indexedDBService.saveStationConfig({ ...stationConfig, lastSyncAt: result.serverTimestamp }) : Promise.resolve()
      ]);

      // Log sync
      await indexedDBService.addSyncLogEntry({
        type: 'sync_complete',
        details: {
          processed: result.processed,
          successCount: result.successCount,
          conflictCount: result.conflictCount
        }
      });

      // OPTIMIZATION: Batch update local guest cache (parallel)
      const cacheUpdates = result.remoteUpdates.map(async (remoteUpdate) => {
        const cachedGuest = await indexedDBService.getCachedGuest(remoteUpdate.guestId);
        if (cachedGuest) {
          return indexedDBService.updateCachedGuest(remoteUpdate.guestId, {
            checkedIn: true,
            checkinCount: cachedGuest.checkinCount + 1,
            lastCheckinAt: remoteUpdate.checkinAt
          });
        }
        return Promise.resolve();
      });
      await Promise.all(cacheUpdates);

      // Notify listeners
      this.notifySyncListeners(result);
      this.notifyQueueListeners();

      return result;
    } catch (error: any) {
      console.error('Sync error:', error);

      // OPTIMIZATION: Batch mark all as failed (parallel)
      await Promise.all(
        pending.map(checkin =>
          indexedDBService.updatePendingCheckin(checkin.id, {
            status: 'failed',
            error: error.message || 'Sync failed',
            retryCount: checkin.retryCount + 1
          })
        )
      );

      this.notifyQueueListeners();

      // Schedule retry if max retries not reached
      const hasRetriesLeft = pending.some(p => p.retryCount < MAX_RETRY_COUNT);
      if (hasRetriesLeft) {
        this.scheduleRetry();
      }

      return {
        success: false,
        processed: pending.length,
        successCount: 0,
        conflictCount: 0,
        serverTimestamp: new Date().toISOString(),
        results: [],
        remoteUpdates: []
      };
    } finally {
      this.isSyncing = false;
    }
  }

  addSyncListener(listener: SyncListener): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  addQueueListener(listener: QueueChangeListener): () => void {
    this.queueListeners.push(listener);
    // Immediately notify with current count
    this.getPendingCount().then(count => listener(count));
    return () => {
      this.queueListeners = this.queueListeners.filter(l => l !== listener);
    };
  }

  // ==================== PRIVATE ====================

  private startPeriodicSync() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      if (connectionStatusService.getStatus() === 'online') {
        this.syncPending();
      }
    }, this.syncIntervalSeconds * 1000);
  }

  private stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private scheduleRetry() {
    if (this.retryTimeout) return;

    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      if (connectionStatusService.getStatus() === 'online') {
        this.syncPending();
      }
    }, SYNC_RETRY_INTERVAL);
  }

  private notifySyncListeners(result: SyncResult) {
    for (const listener of this.syncListeners) {
      try {
        listener(result);
      } catch (error) {
        console.error('Error notifying sync listener:', error);
      }
    }
  }

  private notifyQueueListeners() {
    this.getPendingCount().then(count => {
      for (const listener of this.queueListeners) {
        try {
          listener(count);
        } catch (error) {
          console.error('Error notifying queue listener:', error);
        }
      }
    });
  }

  destroy() {
    this.stopPeriodicSync();
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.syncListeners = [];
    this.queueListeners = [];
  }
}

export const offlineSyncService = new OfflineSyncService();
