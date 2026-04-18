/**
 * IndexedDB Service for Offline Check-in Storage
 * Provides Promise-based API for storing pending check-ins, guest cache, and station config
 */

import { openDB, IDBPDatabase } from 'idb';

export interface PendingCheckin {
  id: string;
  guestIdentifier: string;
  clientTimestamp: string;
  photo?: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingSouvenir {
  id: string;
  guestIdentifier: string;
  souvenirId: string;
  clientTimestamp: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StationConfig {
  stationId: string;
  stationName: string;
  eventId: string;
  lastSyncAt?: string;
  isActive: boolean;
}

export interface LocalGuest {
  id: string; // Guest UUID
  guestId: string;
  name: string;
  checkedIn: boolean;
  checkinCount: number;
  lastCheckinAt?: string;
  photoUrl?: string;
  updatedAt: string;
  souvenirTaken?: boolean;
}

export interface LocalSouvenirCache {
  id: string;
  name: string;
  quantity: number;
  takenCount: number;
  remaining: number;
  updatedAt: string;
}

const DB_NAME = 'guest-checkin-db';
const DB_VERSION = 2;

class IndexedDBService {
  private db: IDBPDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion) {
          // Create pending check-ins store
          if (!db.objectStoreNames.contains('pendingCheckins')) {
            const pendingStore = db.createObjectStore('pendingCheckins', { keyPath: 'id' });
            pendingStore.createIndex('guestIdentifier', 'guestIdentifier', { unique: false });
            pendingStore.createIndex('clientTimestamp', 'clientTimestamp', { unique: false });
            pendingStore.createIndex('status', 'status', { unique: false });
            pendingStore.createIndex('createdAt', 'createdAt', { unique: false });
          }

          // Create local guests cache store
          if (!db.objectStoreNames.contains('localGuests')) {
            const guestsStore = db.createObjectStore('localGuests', { keyPath: 'id' });
            guestsStore.createIndex('guestId', 'guestId', { unique: false });
            guestsStore.createIndex('name', 'name', { unique: false });
            guestsStore.createIndex('checkedIn', 'checkedIn', { unique: false });
          }

          // Create station config store
          if (!db.objectStoreNames.contains('stationConfig')) {
            db.createObjectStore('stationConfig', { keyPath: 'stationId' });
          }

          // Create sync log store
          if (!db.objectStoreNames.contains('syncLog')) {
            const syncStore = db.createObjectStore('syncLog', { keyPath: 'id' });
            syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // Version 2 additions: Pending Souvenirs and Souvenir Cache
          if (!db.objectStoreNames.contains('pendingSouvenirs')) {
            const souvStore = db.createObjectStore('pendingSouvenirs', { keyPath: 'id' });
            souvStore.createIndex('guestIdentifier', 'guestIdentifier', { unique: false });
            souvStore.createIndex('souvenirId', 'souvenirId', { unique: false });
            souvStore.createIndex('clientTimestamp', 'clientTimestamp', { unique: false });
            souvStore.createIndex('status', 'status', { unique: false });
            souvStore.createIndex('createdAt', 'createdAt', { unique: false });
          }

          if (!db.objectStoreNames.contains('souvenirCache')) {
            db.createObjectStore('souvenirCache', { keyPath: 'id' });
          }
        }
      });
    })();

    return this.initPromise;
  }

  // ==================== PENDING CHECKINS ====================

  async addPendingCheckin(checkin: Omit<PendingCheckin, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await this.init();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db!.add('pendingCheckins', {
      ...checkin,
      id,
      createdAt: now,
      updatedAt: now
    });

    return id;
  }

  async getPendingCheckins(): Promise<PendingCheckin[]> {
    await this.init();
    const all = await this.db!.getAll('pendingCheckins');
    return all
      .filter(c => c.status === 'pending' || c.status === 'failed')
      .sort((a, b) => new Date(a.clientTimestamp).getTime() - new Date(b.clientTimestamp).getTime());
  }

  async updatePendingCheckin(id: string, updates: Partial<PendingCheckin>): Promise<void> {
    await this.init();
    const existing = await this.db!.get('pendingCheckins', id);
    if (!existing) return;

    await this.db!.put('pendingCheckins', {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deletePendingCheckin(id: string): Promise<void> {
    await this.init();
    await this.db!.delete('pendingCheckins', id);
  }

  async clearSyncedCheckins(): Promise<void> {
    await this.init();
    const tx = this.db!.transaction('pendingCheckins', 'readwrite');
    const store = tx.objectStore('pendingCheckins');
    let cursor = await store.openCursor();

    while (cursor) {
      if (cursor.value.status === 'synced') {
        cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  }

  async getPendingCount(): Promise<number> {
    await this.init();
    const pending = await this.db!.countFromIndex('pendingCheckins', 'status', 'pending');
    const failed = await this.db!.countFromIndex('pendingCheckins', 'status', 'failed');
    return pending + failed;
  }

  // ==================== STATION CONFIG ====================

  async saveStationConfig(config: StationConfig): Promise<void> {
    await this.init();
    await this.db!.put('stationConfig', config);
  }

  async getStationConfig(): Promise<StationConfig | null> {
    await this.init();
    const all = await this.db!.getAll('stationConfig');
    return all.length > 0 ? all[0] : null;
  }

  async deleteStationConfig(): Promise<void> {
    await this.init();
    const all = await this.db!.getAll('stationConfig');
    for (const config of all) {
      await this.db!.delete('stationConfig', config.stationId);
    }
  }

  // ==================== LOCAL GUESTS CACHE ====================

  async cacheGuest(guest: LocalGuest): Promise<void> {
    await this.init();
    await this.db!.put('localGuests', guest);
  }

  async cacheGuestsBulk(guests: LocalGuest[]): Promise<{ success: number; failed: number }> {
    await this.init();
    let success = 0;
    let failed = 0;

    const tx = this.db!.transaction('localGuests', 'readwrite');
    const store = tx.objectStore('localGuests');

    // Eksekusi paralel yang dilemparkan ke dalam satu antrean transaksi.
    // Transaksi IndexedDB secara native sangat pintar menampung antrean operasi 'put'.
    // Ini menghilangkan delay (blocking) per-baris dari event loop dan mempercepat proses Download dari ~4 detik menjadi ~0.1 detik.
    for (const guest of guests) {
      store.put(guest)
        .then(() => { success++; })
        .catch(() => { failed++; });
    }
    
    // Perintah ini akan merangkum (commit) seluruh antrean 'put' yang dilemparkan di atas sekaligus
    await tx.done;

    return { success, failed };
  }

  async getCachedGuest(id: string): Promise<LocalGuest | null> {
    await this.init();
    return this.db!.get('localGuests', id) || null;
  }

  async getCachedGuestByGuestId(guestId: string): Promise<LocalGuest | null> {
    await this.init();
    const all = await this.db!.getAllFromIndex('localGuests', 'guestId', guestId);
    return all.length > 0 ? all[0] : null;
  }

  async getAllCachedGuests(): Promise<LocalGuest[]> {
    await this.init();
    return this.db!.getAll('localGuests');
  }

  async updateCachedGuest(id: string, updates: Partial<LocalGuest>): Promise<void> {
    await this.init();
    const existing = await this.db!.get('localGuests', id);
    if (!existing) return;

    await this.db!.put('localGuests', {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async clearGuestCache(): Promise<void> {
    await this.init();
    await this.db!.clear('localGuests');
  }

  async deleteCachedGuest(id: string): Promise<void> {
    await this.init();
    await this.db!.delete('localGuests', id);
  }

  // ==================== SYNC LOG ====================

  async addSyncLogEntry(entry: {
    type: 'sync_start' | 'sync_complete' | 'sync_error';
    details: any;
  }): Promise<void> {
    await this.init();
    const id = crypto.randomUUID();
    await this.db!.add('syncLog', {
      id,
      timestamp: new Date().toISOString(),
      ...entry
    });
  }

  async getRecentSyncLogs(limit: number = 20): Promise<any[]> {
    await this.init();
    const all = await this.db!.getAll('syncLog');
    return all
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // ==================== UTILITY ====================

  async getDatabaseSize(): Promise<number> {
    if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  }

  // ==================== PENDING SOUVENIRS ====================

  async addPendingSouvenir(take: Omit<PendingSouvenir, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await this.init();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db!.add('pendingSouvenirs', {
      ...take,
      id,
      createdAt: now,
      updatedAt: now
    });

    return id;
  }

  async getPendingSouvenirs(): Promise<PendingSouvenir[]> {
    await this.init();
    const all = await this.db!.getAll('pendingSouvenirs');
    return all
      .filter(c => c.status === 'pending' || c.status === 'failed')
      .sort((a, b) => new Date(a.clientTimestamp).getTime() - new Date(b.clientTimestamp).getTime());
  }

  async updatePendingSouvenir(id: string, updates: Partial<PendingSouvenir>): Promise<void> {
    await this.init();
    const existing = await this.db!.get('pendingSouvenirs', id);
    if (!existing) return;

    await this.db!.put('pendingSouvenirs', {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deletePendingSouvenir(id: string): Promise<void> {
    await this.init();
    await this.db!.delete('pendingSouvenirs', id);
  }

  async clearSyncedSouvenirs(): Promise<void> {
    await this.init();
    const tx = this.db!.transaction('pendingSouvenirs', 'readwrite');
    const store = tx.objectStore('pendingSouvenirs');
    let cursor = await store.openCursor();

    while (cursor) {
      if (cursor.value.status === 'synced') {
        cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  }

  async getPendingSouvenirCount(): Promise<number> {
    await this.init();
    const pending = await this.db!.countFromIndex('pendingSouvenirs', 'status', 'pending');
    const failed = await this.db!.countFromIndex('pendingSouvenirs', 'status', 'failed');
    return pending + failed;
  }

  // ==================== SOUVENIR CACHE ====================

  async cacheSouvenir(souvenir: LocalSouvenirCache): Promise<void> {
    await this.init();
    await this.db!.put('souvenirCache', souvenir);
  }

  async cacheSouvenirsBulk(souvenirs: LocalSouvenirCache[]): Promise<void> {
    await this.init();
    const tx = this.db!.transaction('souvenirCache', 'readwrite');
    const store = tx.objectStore('souvenirCache');
    for (const souvenir of souvenirs) {
      store.put(souvenir);
    }
    await tx.done;
  }

  async getAllCachedSouvenirs(): Promise<LocalSouvenirCache[]> {
    await this.init();
    return this.db!.getAll('souvenirCache');
  }

  async updateCachedSouvenir(id: string, updates: Partial<LocalSouvenirCache>): Promise<void> {
    await this.init();
    const existing = await this.db!.get('souvenirCache', id);
    if (!existing) return;

    await this.db!.put('souvenirCache', {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async clearSouvenirCache(): Promise<void> {
    await this.init();
    await this.db!.clear('souvenirCache');
  }

  async clearAll(): Promise<void> {
    await this.init();
    await this.db!.clear('pendingCheckins');
    await this.db!.clear('localGuests');
    await this.db!.clear('stationConfig');
    await this.db!.clear('syncLog');
    await this.db!.clear('pendingSouvenirs');
    await this.db!.clear('souvenirCache');
  }
}

export const indexedDBService = new IndexedDBService();
