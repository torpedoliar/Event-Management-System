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
  private status: ConnectionStatus = navigator.onLine ? 'online' : 'offline';
  private listeners: StatusListener[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private currentInfo: ConnectionInfo = {
    status: this.status,
    lastCheck: new Date().toISOString()
  };

  constructor() {
    // Listen to browser events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setOnline());
      window.addEventListener('offline', () => this.setOffline());
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
      const startTime = Date.now();
      const response = await fetch(healthUrl, {
        method: 'GET',
        cache: 'no-cache'
      });

      const latency = Date.now() - startTime;

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
      // Don't set offline if browser says online (might be CORS or server down)
      if (!navigator.onLine) {
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
  }
}

export const connectionStatusService = new ConnectionStatusService();
