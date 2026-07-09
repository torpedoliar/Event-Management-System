"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { apiBase, parseErrorMessage } from "@/lib/api";
import { Html5Qrcode } from "html5-qrcode";
import {
  Search, QrCode, Loader2, CheckCircle, XCircle, AlertCircle,
  Settings, Camera, Wifi, WifiOff, Trophy, Users, Clock, X,
  RefreshCw, Trash2, LogOut
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { checkinApi } from "@/lib/tournament-api";
import type { CheckinResult } from "@/types/tournament.types";

type StationConfig = {
  adminId: string;
  adminName: string;
  counterName: string;
};

function cleanQrContent(text: string): string {
  if (!text) return "";
  try {
    if (text.startsWith("http://") || text.startsWith("https://")) {
      const url = new URL(text);
      const parts = url.pathname.split("/").filter((p) => p.trim() !== "");
      if (parts.length > 0) return parts[parts.length - 1];
    }
  } catch {}
  return text;
}

export default function TournamentCheckinPage() {
  const [station, setStation] = useState<StationConfig | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [resultType, setResultType] = useState<"success" | "reject" | "info" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Load pending count from IndexedDB
  const loadPendingCount = useCallback(async () => {
    try {
      const { indexedDBService } = await import("@/lib/indexeddb");
      const count = await indexedDBService.getTournamentPendingCount();
      setPendingCount(count);
    } catch {}
  }, []);

  // Load pending items for queue view
  const loadPendingItems = useCallback(async () => {
    try {
      const { indexedDBService } = await import("@/lib/indexeddb");
      const items = await indexedDBService.getTournamentPendingCheckins();
      setPendingItems(items);
    } catch {}
  }, []);

  // Sync pending checkins
  const syncPending = useCallback(async () => {
    if (syncing || !online) return;
    setSyncing(true);
    try {
      const { indexedDBService } = await import("@/lib/indexeddb");
      const pending = await indexedDBService.getTournamentPendingCheckins();
      if (pending.length > 0) {
        const res = await checkinApi.batchSync(pending);
        for (const r of res.results) {
          if (r.success || r.isDuplicate) {
            const item = pending.find((p) => p.guestId === r.guestId);
            if (item) {
              await indexedDBService.updateTournamentPendingCheckin(item.id, { status: "synced" });
            }
          }
        }
        await indexedDBService.clearSyncedTournamentCheckins();
        await loadPendingCount();
        await loadPendingItems();
      }
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  }, [syncing, online, loadPendingCount, loadPendingItems]);

  // Health check (ping server periodically)
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase()}/public/health`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      const isOnline = res.ok;
      setOnline(isOnline);
      setLastCheck(new Date().toISOString());
      if (isOnline && pendingCount > 0) {
        syncPending();
      }
    } catch {
      setOnline(false);
      setLastCheck(new Date().toISOString());
    }
  }, [pendingCount, syncPending]);

  // Connection monitoring with health checks
  useEffect(() => {
    checkHealth();
    healthCheckRef.current = setInterval(checkHealth, 3000);

    const handleOnline = () => {
      setOnline(true);
      checkHealth();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (healthCheckRef.current) clearInterval(healthCheckRef.current);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkHealth]);

  // Load station config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("tournament_checkin_station");
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setStation(config);
        setShowSetup(false);
      } catch {
        setShowSetup(true);
      }
    } else {
      setShowSetup(true);
    }
  }, []);

  // Load pending count on mount and when station changes
  useEffect(() => {
    loadPendingCount();
  }, [station, loadPendingCount]);

  const saveStation = (config: StationConfig) => {
    localStorage.setItem("tournament_checkin_station", JSON.stringify(config));
    setStation(config);
    setShowSetup(false);
    setShowSettings(false);
  };

  const clearStation = () => {
    localStorage.removeItem("tournament_checkin_station");
    setStation(null);
    setShowSetup(true);
    setShowSettings(false);
  };

  const showResult = (res: CheckinResult, type: "success" | "reject" | "info") => {
    setResult(res);
    setResultType(type);
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    resultTimeoutRef.current = setTimeout(() => {
      setResult(null);
      setResultType(null);
    }, 5000);
  };

  // Extract error message from various error formats
  const extractErrorMessage = (err: any): string => {
    // NestJS ConflictException with reasons
    if (err?.response?.data?.message) {
      return err.response.data.message;
    }
    if (err?.response?.data?.reasons?.length > 0) {
      return err.response.data.reasons[0];
    }
    // Standard error message
    if (err?.message) {
      return err.message;
    }
    // String error
    if (typeof err === 'string') {
      return err;
    }
    return "Terjadi kesalahan";
  };

  // Extract rejection reasons from error
  const extractReasons = (err: any): string[] => {
    if (err?.response?.data?.reasons) {
      return err.response.data.reasons;
    }
    if (err?.response?.data?.message) {
      return [err.response.data.message];
    }
    return [];
  };

  const handleCheckin = useCallback(
    async (guestId: string) => {
      if (!station) {
        setError("Station belum dikonfigurasi");
        return;
      }
      if (!guestId.trim()) {
        setError("Guest ID tidak boleh kosong");
        return;
      }

      setError(null);
      setSearching(true);
      setResult(null);
      setResultType(null);

      try {
        if (online) {
          const res = await checkinApi.checkIn({
            guestId: guestId.trim(),
            adminId: station.adminId,
            adminName: station.adminName,
            counterName: station.counterName,
          });

          if (res.alreadyCheckedIn) {
            showResult(res, "info");
          } else if (res.success) {
            showResult(res, "success");
          } else if (res.reasons && res.reasons.length > 0) {
            showResult(res, "reject");
          }
        } else {
          // Offline: queue to IndexedDB
          try {
            const { indexedDBService } = await import("@/lib/indexeddb");
            await indexedDBService.addTournamentPendingCheckin({
              guestId: guestId.trim(),
              adminId: station.adminId,
              adminName: station.adminName,
              counterName: station.counterName,
              isOffline: true,
              clientTimestamp: new Date().toISOString(),
            });
            await loadPendingCount();
            showResult(
              { success: true, alreadyCheckedIn: false, message: "Check-in berhasil (offline) — akan di-sync saat online" },
              "info"
            );
            setSearchQuery("");
          } catch (queueErr: any) {
            setError("Gagal menyimpan offline: " + (queueErr.message || "Unknown error"));
          }
        }
      } catch (err: any) {
        console.error("Check-in error:", err);
        const reasons = extractReasons(err);
        const msg = extractErrorMessage(err);
        showResult(
          { success: false, alreadyCheckedIn: false, reasons: reasons.length > 0 ? reasons : [msg] },
          "reject"
        );
      } finally {
        setSearching(false);
      }
    },
    [station, online, loadPendingCount]
  );

  // QR Scanner
  const startScanner = async () => {
    setScanning(true);
    setError(null);
    try {
      const html5QrCode = new Html5Qrcode("tournament-qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          const cleaned = cleanQrContent(decodedText);
          if (cleaned) {
            handleCheckin(cleaned);
          }
        },
        () => {} // ignore errors during scan
      );
    } catch (err: any) {
      const msg = err?.message || "Camera access denied or not available";
      setError(msg);
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch {}
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
      if (healthCheckRef.current) clearInterval(healthCheckRef.current);
    };
  }, []);

  // Show setup screen if no station configured
  if (showSetup || !station) {
    return (
      <StationSetup
        onSave={saveStation}
        initialAdminName={station?.adminName || ""}
        initialCounterName={station?.counterName || ""}
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-brand-accent" />
            <div>
              <h1 className="text-xl font-bold text-brand-text">Tournament Check-in</h1>
              <p className="text-sm text-brand-textMuted">
                {station.counterName} — {station.adminName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <button
              onClick={() => {
                if (pendingCount > 0) {
                  setShowQueue(!showQueue);
                  if (!showQueue) loadPendingItems();
                }
              }}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                online
                  ? pendingCount > 0
                    ? "bg-brand-warning/10 border-brand-warning/30"
                    : "bg-brand-success/10 border-brand-success/30"
                  : "bg-brand-danger/10 border-brand-danger/30"
              }`}
            >
              {online ? (
                <Wifi size={16} className="text-brand-success" />
              ) : (
                <WifiOff size={16} className="text-brand-danger animate-pulse" />
              )}
              <span className="text-sm font-medium text-brand-text">
                {online
                  ? pendingCount > 0
                    ? `${pendingCount} pending`
                    : "Online"
                  : "Offline"}
              </span>
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-brand-bg bg-brand-warning rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
            {/* Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-white/10 text-brand-textMuted hover:text-brand-text transition-colors"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-brand-surface rounded-2xl border border-brand-border p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-brand-text">Station Settings</h2>
                <button onClick={() => setShowSettings(false)} className="text-brand-textMuted hover:text-brand-text">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-brand-textMuted mb-1">Admin Name</label>
                  <Input
                    value={station.adminName}
                    onChange={(e) => setStation({ ...station, adminName: e.target.value })}
                    placeholder="Admin name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-brand-textMuted mb-1">Counter / Station Name</label>
                  <Input
                    value={station.counterName}
                    onChange={(e) => setStation({ ...station, counterName: e.target.value })}
                    placeholder="Counter name"
                  />
                </div>

                {/* Connection Info */}
                <div className="p-3 rounded-lg bg-brand-bg border border-brand-border">
                  <p className="text-xs text-brand-textMuted">Connection Status</p>
                  <p className="text-sm text-brand-text font-medium">
                    {online ? "Online" : "Offline"}
                    {lastCheck && ` — Last check: ${new Date(lastCheck).toLocaleTimeString("id-ID")}`}
                  </p>
                </div>

                {/* Pending Queue Info */}
                {pendingCount > 0 && (
                  <div className="p-3 rounded-lg bg-brand-warning/10 border border-brand-warning/20">
                    <p className="text-xs text-brand-warning">
                      {pendingCount} check-in(s) waiting to sync
                    </p>
                    {online && (
                      <Button size="sm" onClick={syncPending} loading={syncing} className="mt-2">
                        <RefreshCw size={14} className="mr-1" /> Sync Now
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between gap-2 mt-6">
                <Button variant="danger" size="sm" onClick={clearStation}>
                  <LogOut size={14} className="mr-1" /> Reset Station
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setShowSettings(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => saveStation(station)}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Queue Panel */}
        {showQueue && (
          <div className="mb-6 bg-brand-surface rounded-2xl border border-brand-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-brand-text">Pending Sync Queue</h3>
              <div className="flex items-center gap-2">
                {online && pendingItems.length > 0 && (
                  <Button size="sm" onClick={syncPending} loading={syncing}>
                    <RefreshCw size={14} className="mr-1" /> Sync Now
                  </Button>
                )}
                <button onClick={() => setShowQueue(false)} className="text-brand-textMuted hover:text-brand-text">
                  <X size={16} />
                </button>
              </div>
            </div>
            {pendingItems.length === 0 ? (
              <p className="text-sm text-brand-textMuted text-center py-4">No pending check-ins</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {pendingItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-brand-bg rounded-lg text-sm">
                    <div>
                      <p className="text-brand-text font-medium">{item.guestId}</p>
                      <p className="text-xs text-brand-textMuted">
                        {new Date(item.clientTimestamp).toLocaleTimeString("id-ID")}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      item.status === "pending"
                        ? "bg-brand-warning/20 text-brand-warning"
                        : "bg-brand-danger/20 text-brand-danger"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-brand-danger/10 text-brand-danger border border-brand-danger/20 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Result Popup */}
        {result && resultType && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-center ${
              resultType === "success"
                ? "bg-brand-success/10 border-brand-success/30"
                : resultType === "reject"
                  ? "bg-brand-danger/10 border-brand-danger/30"
                  : "bg-brand-surface border-brand-border"
            }`}
          >
            {resultType === "success" && (
              <>
                <CheckCircle className="w-12 h-12 mx-auto text-brand-success mb-2" />
                <p className="text-lg font-bold text-brand-success">Check-in Berhasil</p>
                {result.match && (
                  <p className="text-sm text-brand-textMuted mt-1">
                    {result.match.teamA ?? "?"} vs {result.match.teamB ?? "?"}
                  </p>
                )}
              </>
            )}
            {resultType === "reject" && (
              <>
                <XCircle className="w-12 h-12 mx-auto text-brand-danger mb-2" />
                <p className="text-lg font-bold text-brand-danger">Check-in Ditolak</p>
                {result.reasons && result.reasons.length > 0 ? (
                  result.reasons.map((r, i) => (
                    <p key={i} className="text-sm text-brand-textMuted mt-1">
                      {r}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-brand-textMuted mt-1">
                    {result.message || "Tidak dapat check-in saat ini"}
                  </p>
                )}
              </>
            )}
            {resultType === "info" && (
              <>
                <AlertCircle className="w-12 h-12 mx-auto text-brand-textMuted mb-2" />
                <p className="text-lg font-medium text-brand-textMuted">
                  {result.message || "Sudah check-in untuk match ini"}
                </p>
              </>
            )}
          </div>
        )}

        {/* Search */}
        <div className="bg-brand-surface rounded-2xl border border-brand-border p-6 mb-6">
          <h2 className="text-sm font-semibold text-brand-text mb-3 flex items-center gap-2">
            <Search size={16} /> Search by Guest ID
          </h2>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter guest ID..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  handleCheckin(searchQuery.trim());
                }
              }}
            />
            <Button
              onClick={() => {
                if (searchQuery.trim()) handleCheckin(searchQuery.trim());
              }}
              loading={searching}
              disabled={!searchQuery.trim()}
            >
              Check-in
            </Button>
          </div>
        </div>

        {/* QR Scanner */}
        <div className="bg-brand-surface rounded-2xl border border-brand-border p-6">
          <h2 className="text-sm font-semibold text-brand-text mb-3 flex items-center gap-2">
            <QrCode size={16} /> QR Scanner
          </h2>

          {!scanning ? (
            <Button onClick={startScanner} className="w-full">
              <Camera size={18} className="mr-2" /> Start QR Scanner
            </Button>
          ) : (
            <div>
              <div
                id="tournament-qr-reader"
                className="rounded-xl overflow-hidden bg-black aspect-square max-w-sm mx-auto"
              />
              <Button
                variant="secondary"
                onClick={stopScanner}
                className="w-full mt-3"
              >
                Stop Scanner
              </Button>
            </div>
          )}
        </div>

        {/* Offline notice */}
        {!online && (
          <div className="mt-4 p-3 rounded-xl bg-brand-warning/10 border border-brand-warning/20 text-sm text-center">
            <Clock size={16} className="inline mr-1" />
            Mode offline — check-in akan di-queue dan di-sync saat koneksi pulih.
          </div>
        )}
      </div>
    </div>
  );
}

// Station Setup Component
function StationSetup({
  onSave,
  initialAdminName = "",
  initialCounterName = "",
}: {
  onSave: (config: StationConfig) => void;
  initialAdminName?: string;
  initialCounterName?: string;
}) {
  const [adminName, setAdminName] = useState(initialAdminName);
  const [counterName, setCounterName] = useState(initialCounterName);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!adminName.trim()) {
      setError("Admin Name wajib diisi");
      return;
    }
    setError(null);
    onSave({
      adminId: `admin-${Date.now()}`,
      adminName: adminName.trim(),
      counterName: counterName.trim() || `Counter ${Date.now() % 100}`,
    });
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="bg-brand-surface rounded-2xl border border-brand-border p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Trophy className="w-12 h-12 mx-auto text-brand-accent mb-3" />
          <h1 className="text-2xl font-bold text-brand-text">Tournament Check-in</h1>
          <p className="text-sm text-brand-textMuted mt-1">Setup your station</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-brand-danger/10 text-brand-danger border border-brand-danger/20 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-brand-textMuted mb-1">Admin Name *</label>
            <Input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Your name"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <div>
            <label className="block text-xs text-brand-textMuted mb-1">Counter / Station Name</label>
            <Input
              value={counterName}
              onChange={(e) => setCounterName(e.target.value)}
              placeholder="e.g. Counter A"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full mt-6" disabled={!adminName.trim()}>
          Start Check-in
        </Button>
      </div>
    </div>
  );
}
