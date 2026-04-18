'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Activity, 
  Database, 
  FileText, 
  Server, 
  Clock,
  HardDrive,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Download,
  Search,
  Filter
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { SkeletonStats, SkeletonTable } from '../../../components/ui/Skeleton';
import { ErrorBoundary } from '../../../components/ErrorBoundary';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: {
      status: string;
      responseTime: number;
      details?: any;
    };
    memory: {
      status: string;
      heapUsed: number;
      heapTotal: number;
      rss: number;
      percentUsed: number;
    };
  };
}

interface LogFile {
  name: string;
  size: number;
  date: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
}

interface AuditLog {
  id: string;
  action: string;
  metadata: any;
  adminUserId: string;
  createdAt: string;
}

interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byDate: Record<string, number>;
}

interface AuditStats {
  total: number;
  byAction: Record<string, number>;
  byDate: Record<string, number>;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  return parts.join(' ') || '< 1m';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function SystemPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'health' | 'logs' | 'audit'>('health');
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [logStats, setLogStats] = useState<LogStats | null>(null);
  const [selectedLogFile, setSelectedLogFile] = useState<string>('');
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [logLevel, setLogLevel] = useState<string>('');
  const [logSearch, setLogSearch] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);

  useEffect(() => {
    loadHealthData();
  }, []);

  useEffect(() => {
    if (tab === 'logs') {
      loadLogFiles();
      loadLogStats();
    } else if (tab === 'audit') {
      loadAuditLogs();
      loadAuditStats();
    }
  }, [tab]);

  useEffect(() => {
    if (selectedLogFile) {
      loadLogContent();
    }
  }, [selectedLogFile, logLevel, logSearch]);

  async function loadHealthData() {
    try {
      setLoading(true);
      const data = await apiFetch<HealthStatus>('/health');
      setHealth(data);
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLogFiles() {
    try {
      const data = await apiFetch<LogFile[]>('/admin/logs/files');
      setLogFiles(data);
      if (data.length > 0 && !selectedLogFile) {
        setSelectedLogFile(data[0].name);
      }
    } catch (error) {
      console.error('Failed to load log files:', error);
    }
  }

  async function loadLogStats() {
    try {
      const data = await apiFetch<LogStats>('/admin/logs/stats');
      setLogStats(data);
    } catch (error) {
      console.error('Failed to load log stats:', error);
    }
  }

  async function loadLogContent() {
    try {
      const params = new URLSearchParams({ file: selectedLogFile, lines: '200' });
      if (logLevel) params.set('level', logLevel);
      if (logSearch) params.set('search', logSearch);
      const data = await apiFetch<LogEntry[]>(`/admin/logs/content?${params}`);
      setLogEntries(data);
    } catch (error) {
      console.error('Failed to load log content:', error);
    }
  }

  async function loadAuditLogs() {
    try {
      const params = new URLSearchParams({ page: String(auditPage), pageSize: '50' });
      const data = await apiFetch<{ data: AuditLog[]; total: number }>(`/admin/audit?${params}`);
      setAuditLogs(data.data);
      setAuditTotal(data.total);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  }

  async function loadAuditStats() {
    try {
      const data = await apiFetch<AuditStats>('/admin/audit/stats');
      setAuditStats(data);
    } catch (error) {
      console.error('Failed to load audit stats:', error);
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-brand-danger bg-brand-danger/20';
      case 'warn': return 'text-brand-warning bg-brand-warning/20';
      case 'info': return 'text-brand-primary bg-brand-primary/20';
      case 'debug': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-white/60 bg-white/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-brand-success" />;
      case 'unhealthy': return <AlertCircle className="w-5 h-5 text-brand-danger" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5 text-brand-warning" />;
      default: return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading && tab === 'health') {
    return (
      <main className="min-h-screen pt-20 pb-10 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <SkeletonStats />
          <SkeletonTable rows={5} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">System Monitor</h1>
            <p className="text-white/60">Health, logs, dan audit trail sistem</p>
          </div>
          <button
            onClick={() => {
              if (tab === 'health') loadHealthData();
              else if (tab === 'logs') loadLogContent();
              else loadAuditLogs();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-2">
          <button
            onClick={() => setTab('health')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              tab === 'health' ? 'bg-brand-primary text-white' : 'text-white/60 hover:bg-white/10'
            }`}
          >
            <Activity className="w-4 h-4" />
            Health
          </button>
          <button
            onClick={() => setTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              tab === 'logs' ? 'bg-brand-primary text-white' : 'text-white/60 hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            Logs
          </button>
          <button
            onClick={() => setTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              tab === 'audit' ? 'bg-brand-primary text-white' : 'text-white/60 hover:bg-white/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            Audit Trail
          </button>
        </div>

        {/* Health Tab */}
        {tab === 'health' && health && (
          <div className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  {getStatusIcon(health.status)}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    health.status === 'healthy' ? 'bg-brand-success/20 text-brand-success' :
                    health.status === 'degraded' ? 'bg-brand-warning/20 text-brand-warning' :
                    'bg-brand-danger/20 text-brand-danger'
                  }`}>
                    {health.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-white/60 text-sm">System Status</p>
                <p className="text-2xl font-bold text-white capitalize">{health.status}</p>
              </div>

              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <Server className="w-5 h-5 text-brand-primary" />
                </div>
                <p className="text-white/60 text-sm">Uptime</p>
                <p className="text-2xl font-bold text-white">{formatUptime(health.uptime)}</p>
              </div>

              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <Database className="w-5 h-5 text-brand-accent" />
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    health.checks.database.status === 'healthy' 
                      ? 'bg-brand-success/20 text-brand-success' 
                      : 'bg-brand-danger/20 text-brand-danger'
                  }`}>
                    {health.checks.database.responseTime}ms
                  </span>
                </div>
                <p className="text-white/60 text-sm">Database</p>
                <p className="text-2xl font-bold text-white capitalize">{health.checks.database.status}</p>
              </div>

              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <HardDrive className="w-5 h-5 text-brand-warning" />
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    health.checks.memory.percentUsed > 90 ? 'bg-brand-danger/20 text-brand-danger' :
                    health.checks.memory.percentUsed > 70 ? 'bg-brand-warning/20 text-brand-warning' :
                    'bg-brand-success/20 text-brand-success'
                  }`}>
                    {health.checks.memory.percentUsed}%
                  </span>
                </div>
                <p className="text-white/60 text-sm">Memory Usage</p>
                <p className="text-2xl font-bold text-white">
                  {health.checks.memory.heapUsed} / {health.checks.memory.heapTotal} MB
                </p>
              </div>
            </div>

            {/* System Info */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-white/40 text-sm">Version</p>
                  <p className="text-white font-medium">{health.version}</p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">Last Check</p>
                  <p className="text-white font-medium">
                    {new Date(health.timestamp).toLocaleString('id-ID')}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">RSS Memory</p>
                  <p className="text-white font-medium">{health.checks.memory.rss} MB</p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">DB Response</p>
                  <p className="text-white font-medium">{health.checks.database.responseTime} ms</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {tab === 'logs' && (
          <div className="space-y-4">
            {/* Log Stats */}
            {logStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="glass-card p-4">
                  <p className="text-white/60 text-sm">Total (7 days)</p>
                  <p className="text-2xl font-bold text-white">{logStats.total.toLocaleString()}</p>
                </div>
                {Object.entries(logStats.byLevel).slice(0, 4).map(([level, count]) => (
                  <div key={level} className="glass-card p-4">
                    <p className={`text-sm capitalize ${getLevelColor(level).split(' ')[0]}`}>{level}</p>
                    <p className="text-2xl font-bold text-white">{count.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={selectedLogFile}
                onChange={(e) => setSelectedLogFile(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20"
              >
                {logFiles.map((f) => (
                  <option key={f.name} value={f.name} className="bg-gray-800">
                    {f.name} ({formatBytes(f.size)})
                  </option>
                ))}
              </select>

              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20"
              >
                <option value="" className="bg-gray-800">All Levels</option>
                <option value="error" className="bg-gray-800">Error</option>
                <option value="warn" className="bg-gray-800">Warning</option>
                <option value="info" className="bg-gray-800">Info</option>
                <option value="debug" className="bg-gray-800">Debug</option>
              </select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Cari di logs..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 placeholder:text-white/40"
                />
              </div>
            </div>

            {/* Log Entries */}
            <div className="glass-card overflow-hidden">
              <div className="max-h-[500px] overflow-auto">
                {logEntries.length === 0 ? (
                  <div className="p-8 text-center text-white/40">
                    Tidak ada log entries
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-white/60 font-medium">Timestamp</th>
                        <th className="px-4 py-3 text-left text-white/60 font-medium">Level</th>
                        <th className="px-4 py-3 text-left text-white/60 font-medium">Context</th>
                        <th className="px-4 py-3 text-left text-white/60 font-medium">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logEntries.map((entry, i) => (
                        <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                          <td className="px-4 py-2 text-white/60 whitespace-nowrap font-mono text-xs">
                            {entry.timestamp}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${getLevelColor(entry.level)}`}>
                              {entry.level}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-white/60">{entry.context || '-'}</td>
                          <td className="px-4 py-2 text-white">{entry.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Audit Tab */}
        {tab === 'audit' && (
          <div className="space-y-4">
            {/* Audit Stats */}
            {auditStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4">
                  <p className="text-white/60 text-sm">Total (7 days)</p>
                  <p className="text-2xl font-bold text-white">{auditStats.total.toLocaleString()}</p>
                </div>
                {Object.entries(auditStats.byAction)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([action, count]) => (
                    <div key={action} className="glass-card p-4">
                      <p className="text-white/60 text-sm truncate">{action.replace(/_/g, ' ')}</p>
                      <p className="text-2xl font-bold text-white">{count}</p>
                    </div>
                  ))}
              </div>
            )}

            {/* Audit Entries */}
            <div className="glass-card overflow-hidden">
              <div className="max-h-[500px] overflow-auto">
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-white/40">
                    Tidak ada audit logs
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-white/60 font-medium">Waktu</th>
                        <th className="px-4 py-3 text-left text-white/60 font-medium">Action</th>
                        <th className="px-4 py-3 text-left text-white/60 font-medium">User</th>
                        <th className="px-4 py-3 text-left text-white/60 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-t border-white/5 hover:bg-white/5">
                          <td className="px-4 py-2 text-white/60 whitespace-nowrap text-xs">
                            {new Date(log.createdAt).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 rounded text-xs bg-brand-primary/20 text-brand-primary">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-white/60">
                            {log.metadata?.adminUsername || log.adminUserId || 'System'}
                          </td>
                          <td className="px-4 py-2 text-white text-xs">
                            {log.metadata?.targetName && (
                              <span className="text-white/60">
                                Target: {log.metadata.targetName}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              {/* Pagination */}
              {auditTotal > 50 && (
                <div className="flex items-center justify-between p-4 border-t border-white/10">
                  <p className="text-white/60 text-sm">
                    Showing {(auditPage - 1) * 50 + 1} - {Math.min(auditPage * 50, auditTotal)} of {auditTotal}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                      disabled={auditPage === 1}
                      className="px-3 py-1 rounded bg-white/10 text-white disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setAuditPage(p => p + 1)}
                      disabled={auditPage * 50 >= auditTotal}
                      className="px-3 py-1 rounded bg-white/10 text-white disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SystemPageWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <SystemPage />
    </ErrorBoundary>
  );
}
