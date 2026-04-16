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
    const healthUrl = `${baseUrl}/api/public/health`;

    try {
      const startTime = performance.now();
      const response = await fetch(healthUrl, {
        method: 'GET',
        cache: 'no-cache',
        // OPTIMIZATION: Abort after 5s to prevent hanging
        signal: AbortSignal.timeout(5000)
      });

      const latency = Math.round(performance.now() - startTime);

      if (response.ok) {
        const data = await response.json();
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
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.setOffline();
      }
      this.currentInfo.status = this.status;
      this.currentInfo.lastCheck = new Date().toISOString();
    }

    this.notifyListeners();
    return { ...this.currentInfo };
  }

  startPeriodicCheck(intervalMs: number = 30000) {
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
