/**
 * Offline Sync Service
 * Manages offline check-in queue and automatic synchronization with server
 */

import { indexedDBService, PendingCheckin, PendingSouvenir } from './indexeddb';
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
type SouvenirQueueChangeListener = (pendingCount: number) => void;

const SYNC_RETRY_INTERVAL = 30000; // 30 seconds
const MAX_RETRY_COUNT = 10;

class OfflineSyncService {
  private isSyncing = false;
  private isSyncingSouvenirs = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;
  private syncListeners: SyncListener[] = [];
  private souvenirSyncListeners: SyncListener[] = [];
  private queueListeners: QueueChangeListener[] = [];
  private souvenirQueueListeners: SouvenirQueueChangeListener[] = [];
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
        this.syncPendingSouvenirs();
      }
    });

    this.initialized = true;
    this.notifyQueueListeners();
    this.notifySouvenirQueueListeners();
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

  // ==================== SOUVENIR QUEUE MANAGEMENT ====================

  async addPendingSouvenir(guestIdentifier: string, souvenirId: string): Promise<string> {
    const pending: Omit<PendingSouvenir, 'id' | 'createdAt' | 'updatedAt'> = {
      guestIdentifier,
      souvenirId,
      clientTimestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0
    };

    const id = await indexedDBService.addPendingSouvenir(pending);
    this.notifySouvenirQueueListeners();

    if (connectionStatusService.getStatus() === 'online') {
      this.syncPendingSouvenirs();
    }

    return id;
  }

  async getPendingSouvenirCount(): Promise<number> {
    return indexedDBService.getPendingSouvenirCount();
  }

  async getPendingSouvenirs(): Promise<PendingSouvenir[]> {
    return indexedDBService.getPendingSouvenirs();
  }

  // ==================== ERROR RECOVERY ====================

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

    const pendingSouvs = await indexedDBService.getPendingSouvenirs();
    const failedSouvs = pendingSouvs.filter(p => p.status === 'failed');

    for (const souv of failedSouvs) {
      await indexedDBService.updatePendingSouvenir(souv.id, {
        status: 'pending',
        retryCount: 0,
        error: undefined
      });
    }

    this.notifyQueueListeners();
    this.notifySouvenirQueueListeners();
    
    if (connectionStatusService.getStatus() === 'online') {
      this.syncPending();
      this.syncPendingSouvenirs();
    }
  }

  async clearQueue(): Promise<void> {
    const pending = await indexedDBService.getPendingCheckins();
    for (const checkin of pending) {
      await indexedDBService.deletePendingCheckin(checkin.id);
    }
    this.notifyQueueListeners();
  }

  async clearSouvenirQueue(): Promise<void> {
    const pending = await indexedDBService.getPendingSouvenirs();
    for (const p of pending) {
      await indexedDBService.deletePendingSouvenir(p.id);
    }
    this.notifySouvenirQueueListeners();
  }

  // ==================== SYNC ====================

  async syncPending(): Promise<SyncResult | null> {
    if (!this.stationId || this.isSyncing) return null;

    const pending = await indexedDBService.getPendingCheckins();
    if (pending.length === 0) return null;

    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request('offline-sync-lock', { mode: 'exclusive' }, async () => {
        return this.executeSync(pending);
      });
    } else {
      return this.executeSync(pending);
    }
  }

  async syncPendingSouvenirs(): Promise<SyncResult | null> {
    if (!this.stationId || this.isSyncingSouvenirs) return null;

    const pending = await indexedDBService.getPendingSouvenirs();
    if (pending.length === 0) return null;

    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request('offline-sync-souvenir-lock', { mode: 'exclusive' }, async () => {
        return this.executeSouvenirSync(pending);
      });
    } else {
      return this.executeSouvenirSync(pending);
    }
  }

  private async executeSync(pending: PendingCheckin[]): Promise<SyncResult | null> {
    if (!this.stationId) return null;

    this.isSyncing = true;
    this.notifyQueueListeners();

    try {
      const [stationConfig] = await Promise.all([
        indexedDBService.getStationConfig()
      ]);
      
      const lastSyncAt = stationConfig?.lastSyncAt;

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

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/public/guests/sync-batch', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }

      const result: SyncResult = await response.json();

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

      await Promise.all([
        indexedDBService.clearSyncedCheckins(),
        stationConfig ? indexedDBService.saveStationConfig({ ...stationConfig, lastSyncAt: result.serverTimestamp }) : Promise.resolve()
      ]);

      await indexedDBService.addSyncLogEntry({
        type: 'sync_complete',
        details: {
          processed: result.processed,
          successCount: result.successCount,
          conflictCount: result.conflictCount
        }
      });

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

      this.notifySyncListeners(result);
      this.notifyQueueListeners();

      return result;
    } catch (error: any) {
      console.error('Sync error:', error);

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

  private async executeSouvenirSync(pending: PendingSouvenir[]): Promise<SyncResult | null> {
    if (!this.stationId) return null;

    this.isSyncingSouvenirs = true;
    this.notifySouvenirQueueListeners();

    try {
      const [stationConfig] = await Promise.all([
        indexedDBService.getStationConfig()
      ]);
      
      const lastSyncAt = stationConfig?.lastSyncAt;

      const payload = {
        stationId: this.stationId,
        stationName: this.stationName,
        lastSyncAt,
        pendingTakes: pending.map(p => ({
          guestIdentifier: p.guestIdentifier,
          souvenirId: p.souvenirId,
          clientTimestamp: p.clientTimestamp
        }))
      };

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/public/souvenirs/sync-batch', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }

      const result: SyncResult = await response.json();

      await Promise.all(
        pending.map(async (pendingItem, i) => {
          const itemResult = result.results[i];
          if (!itemResult) return;

          const updates: Partial<PendingSouvenir> = itemResult.success
            ? { status: 'synced', error: undefined }
            : itemResult.conflict
              ? { status: 'failed', error: `Conflict: ${itemResult.reason}`, retryCount: pendingItem.retryCount + 1 }
              : { status: 'failed', error: itemResult.reason || 'Unknown error', retryCount: pendingItem.retryCount + 1 };

          return indexedDBService.updatePendingSouvenir(pendingItem.id, updates);
        })
      );

      await Promise.all([
        indexedDBService.clearSyncedSouvenirs(),
        stationConfig ? indexedDBService.saveStationConfig({ ...stationConfig, lastSyncAt: result.serverTimestamp }) : Promise.resolve()
      ]);

      // OPTIMIZATION: Update local guest cache souvenirTaken=true
      const successfulTakes = pending.filter((_, i) => result.results[i]?.success);
      const cacheUpdates = successfulTakes.map(async (take) => {
        const cachedGuest = await indexedDBService.getCachedGuestByGuestId(take.guestIdentifier);
        if (cachedGuest) {
          return indexedDBService.updateCachedGuest(cachedGuest.id, {
            souvenirTaken: true
          });
        }
        return Promise.resolve();
      });
      await Promise.all(cacheUpdates);

      this.notifySouvenirSyncListeners(result);
      this.notifySouvenirQueueListeners();

      return result;
    } catch (error: any) {
      console.error('Souvenir Sync error:', error);

      await Promise.all(
        pending.map(souv =>
          indexedDBService.updatePendingSouvenir(souv.id, {
            status: 'failed',
            error: error.message || 'Sync failed',
            retryCount: souv.retryCount + 1
          })
        )
      );

      this.notifySouvenirQueueListeners();

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
      this.isSyncingSouvenirs = false;
    }
  }

  addSyncListener(listener: SyncListener): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  addSouvenirSyncListener(listener: SyncListener): () => void {
    this.souvenirSyncListeners.push(listener);
    return () => {
      this.souvenirSyncListeners = this.souvenirSyncListeners.filter(l => l !== listener);
    };
  }

  addQueueListener(listener: QueueChangeListener): () => void {
    this.queueListeners.push(listener);
    this.getPendingCount().then(count => listener(count));
    return () => {
      this.queueListeners = this.queueListeners.filter(l => l !== listener);
    };
  }

  addSouvenirQueueListener(listener: SouvenirQueueChangeListener): () => void {
    this.souvenirQueueListeners.push(listener);
    this.getPendingSouvenirCount().then(count => listener(count));
    return () => {
      this.souvenirQueueListeners = this.souvenirQueueListeners.filter(l => l !== listener);
    };
  }

  // ==================== PRIVATE ====================

  private startPeriodicSync() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      if (connectionStatusService.getStatus() === 'online') {
        this.syncPending();
        this.syncPendingSouvenirs();
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
        this.syncPendingSouvenirs();
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

  private notifySouvenirSyncListeners(result: SyncResult) {
    for (const listener of this.souvenirSyncListeners) {
      try {
        listener(result);
      } catch (error) {
        console.error('Error notifying souvenir sync listener:', error);
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

  private notifySouvenirQueueListeners() {
    this.getPendingSouvenirCount().then(count => {
      for (const listener of this.souvenirQueueListeners) {
        try {
          listener(count);
        } catch (error) {
          console.error('Error notifying souvenir queue listener:', error);
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
    this.souvenirSyncListeners = [];
    this.queueListeners = [];
    this.souvenirQueueListeners = [];
  }
}

export const offlineSyncService = new OfflineSyncService();
