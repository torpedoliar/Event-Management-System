/**
 * Connection Status Service
 * Monitors online/offline status and provides health check functionality
 */

type ConnectionStatus = 'online' | 'offline' | 'checking';

type StatusListener = (status: ConnectionStatus, info: ConnectionInfo) => void;

export interface ConnectionInfo {
  status: ConnectionStatus;
  lastCheck: string;
  serverLatency?: number;
  eventId?: string | null;
  allowOfflineMode?: boolean;
  offlineSyncInterval?: number;
  offlineQueueLimit?: number;
}

class ConnectionStatusService {
  private status: ConnectionStatus = typeof navigator !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : 'online';
  private listeners: StatusListener[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private currentInfo: ConnectionInfo = {
    status: this.status,
    lastCheck: new Date().toISOString()
  };
  private onlineHandler = () => this.setOnline();
  private offlineHandler = () => this.setOffline();
  private consecutiveFailures = 0;
  private baseInterval = 2000; // 2s interval - safe now because backend caches via Redis

  constructor() {
    // Listen to browser events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
    }
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getInfo(): ConnectionInfo {
    return { ...this.currentInfo };
  }

  addListener(listener: StatusListener): () => void {
    this.listeners.push(listener);
    // Immediately notify with current status
    listener(this.status, this.currentInfo);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  setOnline() {
    if (this.status !== 'online') {
      this.status = 'online';
      this.currentInfo.status = 'online';
      this.notifyListeners();
    }
  }

  setOffline() {
    if (this.status !== 'offline') {
      this.status = 'offline';
      this.currentInfo.status = 'offline';
      this.notifyListeners();
    }
  }

  async checkHealth(backendUrl?: string): Promise<ConnectionInfo> {
    const baseUrl = backendUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const healthUrl = `${baseUrl}/api/public/health?t=${Date.now()}`;

    try {
      const startTime = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(healthUrl, {
        method: 'GET',
        cache: 'no-store',
        // These headers tell the Service Worker / Workbox to skip caching entirely
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'ngsw-bypass': 'true',  // Standard SW bypass header
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latency = Math.round(performance.now() - startTime);

      if (response.ok) {
        const data = await response.json();
        this.consecutiveFailures = 0; // Reset on success
        this.setOnline();
        this.currentInfo = {
          status: 'online',
          lastCheck: new Date().toISOString(),
          serverLatency: latency,
          eventId: data.eventId,
          allowOfflineMode: data.allowOfflineMode,
          offlineSyncInterval: data.offlineSyncInterval,
          offlineQueueLimit: data.offlineQueueLimit
        };

        // If we were in backoff mode, restart periodic check at normal interval
        if (this.healthCheckInterval) {
          this.startPeriodicCheck(this.baseInterval);
        }
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      this.consecutiveFailures++;
      // Only mark offline after 3+ consecutive failures to avoid false positives
      if (this.consecutiveFailures >= 3) {
        this.setOffline();
      }
      this.currentInfo.status = this.status;
      this.currentInfo.lastCheck = new Date().toISOString();

      // Exponential backoff: after repeated failures, slow down polling
      // to avoid hammering an overloaded server
      if (this.consecutiveFailures >= 2 && this.healthCheckInterval) {
        const backoffInterval = Math.min(
          this.baseInterval * Math.pow(2, this.consecutiveFailures - 1),
          120000 // Max 2 minutes
        );
        console.log(`[ConnectionStatus] Health check failed ${this.consecutiveFailures}x, backing off to ${backoffInterval / 1000}s`);
        this.startPeriodicCheck(backoffInterval);
      }
    }

    this.notifyListeners();
    return { ...this.currentInfo };
  }

  startPeriodicCheck(intervalMs: number = 2000) {
    this.baseInterval = intervalMs;
    this.stopPeriodicCheck();
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, intervalMs);
  }

  stopPeriodicCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.status, { ...this.currentInfo });
      } catch (error) {
        console.error('Error notifying connection status listener:', error);
      }
    }
  }
  destroy() {
    this.stopPeriodicCheck();
    this.listeners = [];
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      window.removeEventListener('offline', this.offlineHandler);
    }
  }
}

export const connectionStatusService = new ConnectionStatusService();
