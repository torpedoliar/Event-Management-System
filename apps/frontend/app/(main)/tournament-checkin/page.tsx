"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { apiBase, parseErrorMessage } from "@/lib/api";
import { Html5Qrcode } from "html5-qrcode";
import {
  Search, QrCode, Loader2, CheckCircle, XCircle, AlertCircle,
  Settings, Camera, Wifi, WifiOff, Trophy, Users, Clock, X
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
  const [showSetup, setShowSetup] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [resultType, setResultType] = useState<"success" | "reject" | "info" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connection status + auto-sync on reconnect
  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true);
      // Auto-sync tournament pending checkins
      try {
        const { indexedDBService } = await import("@/lib/indexeddb");
        const pending = await indexedDBService.getTournamentPendingCheckins();
        if (pending.length > 0 && station) {
          const { checkinApi } = await import("@/lib/tournament-api");
          const result = await checkinApi.batchSync(pending);
          // Mark synced items
          for (const r of result.results) {
            if (r.success || r.isDuplicate) {
              const item = pending.find((p) => p.guestId === r.guestId);
              if (item) {
                await indexedDBService.updateTournamentPendingCheckin(item.id, { status: "synced" });
              }
            }
          }
          await indexedDBService.clearSyncedTournamentCheckins();
          setPendingCount(await indexedDBService.getTournamentPendingCount());
        }
      } catch (err) {
        console.error("Failed to sync tournament checkins:", err);
      }
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [station]);

  // Load station config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("tournament_checkin_station");
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setStation(config);
        setShowSetup(false);
      } catch {}
    }
  }, []);

  const saveStation = (config: StationConfig) => {
    localStorage.setItem("tournament_checkin_station", JSON.stringify(config));
    setStation(config);
    setShowSetup(false);
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

  const handleCheckin = useCallback(
    async (guestId: string) => {
      if (!station) return;
      setError(null);
      setSearching(true);

      try {
        if (online) {
          const res = await checkinApi.checkIn({
            guestId,
            adminId: station.adminId,
            adminName: station.adminName,
            counterName: station.counterName,
          });

          if (res.alreadyCheckedIn) {
            showResult(res, "info");
          } else if (res.success) {
            showResult(res, "success");
          }
        } else {
          // Offline: queue to IndexedDB
          try {
            const { indexedDBService } = await import("@/lib/indexeddb");
            await indexedDBService.addTournamentPendingCheckin({
              guestId,
              adminId: station.adminId,
              adminName: station.adminName,
              counterName: station.counterName,
              isOffline: true,
              clientTimestamp: new Date().toISOString(),
            });
            setPendingCount((c) => c + 1);
            showResult(
              { success: true, alreadyCheckedIn: false, message: "Queued for sync (offline)" },
              "info"
            );
          } catch (err: any) {
            setError("Failed to queue offline: " + (err.message || "Unknown error"));
          }
        }
      } catch (err: any) {
        const msg = parseErrorMessage(err);
        // Extract reasons from conflict error
        const reasons = err?.response?.data?.reasons || [];
        showResult(
          { success: false, alreadyCheckedIn: false, reasons: reasons.length > 0 ? reasons : [msg] },
          "reject"
        );
      } finally {
        setSearching(false);
      }
    },
    [station, online]
  );

  // QR Scanner
  const startScanner = async () => {
    setScanning(true);
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
      setError("Camera access denied or not available");
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
    };
  }, []);

  // Station Setup Modal
  if (showSetup) {
    return <StationSetup onSave={saveStation} />;
  }

  return (
    <div className="min-h-screen bg-brand-bg p-4 md:p-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-brand-accent" />
            <div>
              <h1 className="text-xl font-bold text-brand-text">Tournament Check-in</h1>
              <p className="text-sm text-brand-textMuted">{station?.counterName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {online ? (
              <span className="flex items-center gap-1 text-sm text-brand-success">
                <Wifi size={16} /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-brand-danger">
                <WifiOff size={16} /> Offline
                {pendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-brand-danger/20 rounded text-xs">
                    {pendingCount} queued
                  </span>
                )}
              </span>
            )}
            <button
              onClick={() => setShowSetup(true)}
              className="p-2 rounded-lg hover:bg-white/10 text-brand-textMuted"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-brand-danger/10 text-brand-danger border border-brand-danger/20 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Result Popup */}
        {result && resultType && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-center animate-in fade-in zoom-in-95 duration-200 ${
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
                {result.reasons?.map((r, i) => (
                  <p key={i} className="text-sm text-brand-textMuted mt-1">
                    {r}
                  </p>
                ))}
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

        {/* Pending sync info */}
        {!online && pendingCount > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-brand-warning/10 border border-brand-warning/20 text-sm text-center">
            <Clock size={16} className="inline mr-1" />
            {pendingCount} check-in(s) queued. Will sync when online.
          </div>
        )}
      </div>
    </div>
  );
}

// Station Setup Component
function StationSetup({ onSave }: { onSave: (config: StationConfig) => void }) {
  const [adminName, setAdminName] = useState("");
  const [counterName, setCounterName] = useState("");

  const handleSave = () => {
    if (!adminName.trim()) return;
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
