/**
 * Types for Offline Mode and Multi-Station Support
 */

export interface StationConfig {
  stationId: string;
  stationName: string;
  eventId: string;
  lastSyncAt?: string;
  isActive: boolean;
}

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

export interface SyncBatchRequest {
  stationId: string;
  stationName?: string;
  lastSyncAt?: string;
  pendingCheckins: Array<{
    guestIdentifier: string;
    clientTimestamp: string;
    photo?: string;
  }>;
}

export interface SyncBatchResponse {
  success: boolean;
  serverTimestamp: string;
  processed: number;
  successCount: number;
  conflictCount: number;
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

export interface OfflineCheckinRequest {
  stationId: string;
  stationName?: string;
  guestIdentifier: string;
  clientTimestamp: string;
  photo?: string;
}

export interface OfflineCheckinResponse {
  success: boolean;
  guest: any;
  checkin: {
    id: string;
    isOffline: boolean;
    syncedAt: string;
    isDuplicate: boolean;
  };
  conflict: boolean;
  reason?: string;
}

export interface HealthCheckResponse {
  status: 'ok';
  timestamp: string;
  eventId: string | null;
  eventName: string | null;
  allowOfflineMode: boolean;
  offlineSyncInterval: number;
  offlineQueueLimit: number;
}

export interface StationResponse {
  id: string;
  name: string;
  stationId: string;
  eventId: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  checkinCount?: number;
}

export type ConnectionStatus = 'online' | 'offline' | 'checking';
