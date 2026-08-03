"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { apiBase, toApiUrl, parseErrorMessage } from "@/lib/api";
import { Html5Qrcode } from "html5-qrcode";
import { Search, QrCode, Loader2, CheckCircle, Clock, Users, X, XCircle, UserPlus, Settings, Camera, UserCheck, Trash2, Monitor, HelpCircle } from 'lucide-react';
import Label from '@/components/ui/Label';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Toggle from '@/components/ui/Toggle';
import StatusBadge from '@/components/ui/StatusBadge';
import StationSetupModal from "@/components/StationSetupModal";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import QueueManagementPanel from "@/components/QueueManagementPanel";
import { indexedDBService, StationConfig as StationConfigType, LocalGuest } from "@/lib/indexeddb";
import { offlineSyncService } from "@/lib/offline-sync.service";
import { connectionStatusService } from "@/lib/connection-status";

type EventConfig = {
  id: string;
  name: string;
  date?: string | null;
  location?: string | null;
  logoUrl?: string | null;
  backgroundType: 'NONE' | 'IMAGE' | 'VIDEO';
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  overlayOpacity: number;
  checkinPopupTimeoutMs?: number;
  autoCreateGuestOnCheckin?: boolean;
  enablePhotoCapture?: boolean;
  allowMultipleCheckinPerCounter?: boolean;
  allowOfflineMode?: boolean;
  offlineSyncInterval?: number;
  offlineQueueLimit?: number;
};

type GuestCheckin = {
  id: string;
  checkinAt: string;
  checkinByName?: string;
  counterName?: string;
};

type Guest = {
  id: string;
  queueNumber: number;
  guestId: string;
  name: string;
  photoUrl?: string | null;
  tableLocation: string;
  company?: string | null;
  department?: string | null;
  division?: string | null;
  notes?: string | null;
  checkedIn: boolean;
  checkedInAt?: string | null;
  checkedInByName?: string | null;
  checkinCount?: number;
  checkins?: GuestCheckin[];
  alreadyCheckedByThisAdmin?: boolean;
  maxReached?: boolean;
  message?: string;
};

function cleanQrContent(text: string): string {
  if (!text) return "";
  try {
    // Jika diawali http/https, anggap URL dan ambil bagian terakhir path-nya
    if (text.startsWith('http://') || text.startsWith('https://')) {
      const url = new URL(text);
      const parts = url.pathname.split('/').filter(p => p.trim() !== '');
      if (parts.length > 0) {
        return parts[parts.length - 1];
      }
    }
  } catch (e) {
    // ignore error, return original
  }
  return text;
}

function isNameSearchQuery(text: string): boolean {
  const query = text.trim();
  return !!query && !/[\d\-]/.test(query) && !/^[A-Z0-9_\-]+$/.test(query);
}

import { useSSE } from "@/lib/sse-context";
import RequireAuth from "@/components/RequireAuth";

type ScanLogItem = {
  id: string;
  guestIdOrName: string;
  status: 'SUCCESS' | 'DUPLICATE' | 'NOT_FOUND' | 'ERROR';
  message: string;
  timestamp: Date;
};

export default function CheckinPage() {
  const rapidQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef<boolean>(false);
  const [rapidLogs, setRapidLogs] = useState<ScanLogItem[]>([]);

  const appendLog = (query: string, status: ScanLogItem['status'], message: string) => {
    setRapidLogs(prev => {
      const newLog: ScanLogItem = { id: Math.random().toString(), guestIdOrName: query, status, message, timestamp: new Date() };
      const logs = [newLog, ...prev];
      if (logs.length > 20) logs.length = 20; // simpan 20 riwayat
      return logs;
    });
  };

  const doCheckinWrapperForQueue = async (g: Guest, useInternalId: boolean, activeQuery: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const endpoint = useInternalId ? `${apiBase()}/public/guests/checkin-by-id` : `${apiBase()}/public/guests/checkin`;
      const body = useInternalId ? { id: g.id } : { guestId: g.guestId };
      const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      if (res.status === 409) {
        const existing = await res.json();
        appendLog(activeQuery, 'DUPLICATE', 'Sudah Check-In sebelumnya.');
        setCheckedGuest(existing);
        setSelected(existing);
        setIsDuplicateCheckIn(true);
        refreshHistory();
        startPopupTimeout();
        return;
      }
      if (!res.ok) throw new Error('Gagal Check-In Server');
      const updated = await res.json();
      appendLog(activeQuery, 'SUCCESS', 'Check-In Server Berhasil');
      setCheckedGuest(updated);
      setSelected(updated);
      setIsDuplicateCheckIn(false);
      refreshHistory();
      startPopupTimeout();
      // Auto capture photo if enabled
      if (enablePhotoCapture && updated) {
        autoCapturephoto(updated);
      }
    } catch (e: any) {
      appendLog(activeQuery, 'ERROR', e.message || 'Error Check-In Server');
    }
  };

  const createAndCheckinWrapperForQueue = async (query: string, activeQuery: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${apiBase()}/public/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) },
        body: JSON.stringify({ guestId: query, name: query, autoCheckin: true })
      });
      if (!res.ok) throw new Error('Gagal buat & check-in');
      const newGuest = await res.json();
      appendLog(activeQuery, 'SUCCESS', 'Dibuat & Check-In');
      setCheckedGuest(newGuest);
      setSelected(newGuest);
      setIsDuplicateCheckIn(false);
      refreshHistory();
      startPopupTimeout();
      // Auto capture photo if enabled
      if (enablePhotoCapture && newGuest) {
        autoCapturephoto(newGuest);
      }
    } catch (e: any) {
      appendLog(activeQuery, 'ERROR', e.message || 'Error auto-create');
    }
  };

  const processRapidQueue = async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;
    try {
      while (rapidQueueRef.current.length > 0) {
        const activeQuery = rapidQueueRef.current.shift();
        if (!activeQuery) continue;
        const params = new URLSearchParams();
        const cleanQ = cleanQrContent(activeQuery);
        params.set('guestId', cleanQ);
        params.set('name', activeQuery);
        if (/[\d\-]/.test(activeQuery) || /^[A-Z0-9_\-]+$/.test(activeQuery)) params.set('exact', 'true');
        const isCurrentlyOffline = connectionStatusService.getStatus() !== 'online';
        try {
          if (isCurrentlyOffline && stationConfig) throw new Error('OfflineMode');
          const controller = new AbortController();
          const res = await fetch(`${apiBase()}/public/guests/search?${params.toString()}`, { signal: controller.signal });
          if (!res.ok) throw new Error('Search failed');
          const data = await res.json();
          if (data.length === 1) {
            if (isNameSearchQuery(activeQuery)) {
              setResults([data[0]]);
              setPendingNameCheckin({ guest: data[0], source: activeQuery, fromQueue: true });
              break;
            }
            await doCheckinWrapperForQueue(data[0], false, activeQuery);
          } else if (data.length === 0) {
            if (autoCreateGuest) {
              await createAndCheckinWrapperForQueue(activeQuery, activeQuery);
            } else {
              appendLog(activeQuery, 'NOT_FOUND', 'Tamu tidak ditemukan server.');
            }
          } else {
            appendLog(activeQuery, 'ERROR', `Ditemukan ${data.length}. Butuh manual klik.`);
          }
        } catch (e: any) {
          const cleanSearchQ = cleanQrContent(activeQuery);
          let matchedGuests: any[] = [];
          const exactMatch = await indexedDBService.getCachedGuestByGuestId(cleanSearchQ);
          if (exactMatch) {
            matchedGuests = [exactMatch];
          } else {
             const cachedGuests = await indexedDBService.getAllCachedGuests();
             for (const g of cachedGuests) {
               if (g.guestId.toLowerCase() === cleanSearchQ.toLowerCase() || g.name.toLowerCase() === activeQuery.toLowerCase()) {
                 matchedGuests.push(g);
               }
             }
          }
          if (matchedGuests.length === 1) {
             const matchedGuest = matchedGuests[0];
             
             // Check for duplicate check-in offline
             if (matchedGuest.checkedIn && !cfg?.allowMultipleCheckinPerCounter) {
               appendLog(activeQuery, 'DUPLICATE', 'Tamu sudah Check-In Offline sebelumnya.');
               // Show popup for duplicate too
               const dupGuest: Guest = {
                 id: matchedGuest.id,
                 guestId: matchedGuest.guestId,
                 name: matchedGuest.name,
                 queueNumber: 0,
                 tableLocation: '',
                 checkedIn: matchedGuest.checkedIn,
                 checkedInAt: matchedGuest.lastCheckinAt,
                 checkinCount: matchedGuest.checkinCount,
                 photoUrl: matchedGuest.photoUrl,
               };
               setCheckedGuest(dupGuest);
               setSelected(dupGuest);
               setIsDuplicateCheckIn(true);
               startPopupTimeout();
               continue;
             }

             await offlineSyncService.addToQueue(matchedGuest.guestId);
             await indexedDBService.updateCachedGuest(matchedGuest.id, {
                checkedIn: true, checkinCount: (matchedGuest.checkinCount || 0) + 1, lastCheckinAt: new Date().toISOString()
             });
             appendLog(activeQuery, 'SUCCESS', 'Check-In Offline Berhasil');
             
             // Show popup for successful offline check-in
             const offlineGuest: Guest = {
               id: matchedGuest.id,
               guestId: matchedGuest.guestId,
               name: matchedGuest.name,
               queueNumber: 0,
               tableLocation: '',
               checkedIn: true,
               checkedInAt: new Date().toISOString(),
               checkinCount: (matchedGuest.checkinCount || 0) + 1,
               photoUrl: matchedGuest.photoUrl,
             };
             setCheckedGuest(offlineGuest);
             setSelected(offlineGuest);
             setIsDuplicateCheckIn(false);
             refreshHistory();
             startPopupTimeout();
          } else {
             appendLog(activeQuery, 'NOT_FOUND', 'Offline ID tidak dikenali atau multiple.');
          }
        }
        await new Promise(res => setTimeout(res, 50));
      }
    } finally {
      isProcessingQueueRef.current = false;
    }
  };

  const [cfg, setCfg] = useState<EventConfig | null>(null);
  const [preview, setPreview] = useState<Partial<EventConfig> | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Guest[]>([]);
  const [selected, setSelected] = useState<Guest | null>(null);
  const [pendingNameCheckin, setPendingNameCheckin] = useState<{ guest: Guest; source: string; fromQueue: boolean } | null>(null);
  const [checkedGuest, setCheckedGuest] = useState<Guest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Guest[]>([]);
  // Overlay customization (popup only)
  const [bgMode, setBgMode] = useState<'CONFIG' | 'NONE' | 'IMAGE' | 'VIDEO'>('CONFIG');
  const [overlayOverride, setOverlayOverride] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [unchecking, setUnchecking] = useState(false);
  const [isDuplicateCheckIn, setIsDuplicateCheckIn] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<{ id: string; name: string } | null>(null);
  const [showUncheckModal, setShowUncheckModal] = useState(false);
  const [uncheckPassword, setUncheckPassword] = useState('');
  const [uncheckReason, setUncheckReason] = useState('');
  const [uncheckTarget, setUncheckTarget] = useState<Guest | null>(null);
  const [uncheckError, setUncheckError] = useState<string | null>(null);
  const [autoCreateGuest, setAutoCreateGuest] = useState(false);
  const [enablePhotoCapture, setEnablePhotoCapture] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [downloadingGuests, setDownloadingGuests] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [savingEventSetting, setSavingEventSetting] = useState(false);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [autoCapturing, setAutoCapturing] = useState(false);
  const [autoCaptureStatus, setAutoCaptureStatus] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoStreamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { addEventListener, removeEventListener } = useSSE();

  // Offline mode state
  const [showStationSetup, setShowStationSetup] = useState(false);
  const [showQueuePanel, setShowQueuePanel] = useState(false);
  const [stationConfig, setStationConfig] = useState<StationConfigType | null>(null);
  const [cachedGuestCount, setCachedGuestCount] = useState(0);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [eventChangeNotif, setEventChangeNotif] = useState<string | null>(null);
  const [pendingSyncAlert, setPendingSyncAlert] = useState<number | null>(null);

  // Initialize offline mode on mount
  useEffect(() => {
    const initOfflineMode = async () => {
      try {
        // Load station config from IndexedDB
        const config = await indexedDBService.getStationConfig();
        if (config) {
          setStationConfig(config);

          // Initialize sync service
          const health = await fetch(`${apiBase()}/public/health`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null);
          await offlineSyncService.init(config.stationId, config.stationName, health?.offlineSyncInterval ?? 30);
        } else {
          // Show station setup on first visit
          setShowStationSetup(true);
        }
      } catch (err) {
        console.error('Failed to init offline mode:', err);
      }
    };

    initOfflineMode();

    // Cleanup on unmount
    return () => {
      offlineSyncService.destroy();
      connectionStatusService.destroy();
    };
  }, []);

  useEffect(() => {
    indexedDBService.getAllCachedGuests().then(guests => setCachedGuestCount(guests.length)).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${apiBase()}/config/event`).then(async (r) => {
      const data = await r.json();
      setCfg(data);
      // Load auto-create setting from localStorage or config
      const savedAutoCreate = localStorage.getItem('checkinAutoCreateGuest');
      if (savedAutoCreate !== null) {
        setAutoCreateGuest(savedAutoCreate === 'true');
      } else if (data.autoCreateGuestOnCheckin) {
        setAutoCreateGuest(data.autoCreateGuestOnCheckin);
      }
      // Load photo capture setting from localStorage or config
      const savedPhotoCapture = localStorage.getItem('checkinEnablePhotoCapture');
      if (savedPhotoCapture !== null) {
        setEnablePhotoCapture(savedPhotoCapture === 'true');
      } else if (data.enablePhotoCapture) {
        setEnablePhotoCapture(data.enablePhotoCapture);
      }
    });
  }, []);

  const effectiveOverlay = overlayOverride ?? preview?.overlayOpacity ?? cfg?.overlayOpacity ?? 0.5;
  const overlayStyle = useMemo(() => ({
    backgroundColor: `rgba(0,0,0,${effectiveOverlay})`,
  }), [effectiveOverlay]);

  // Helper to manage popup timeout
  const startPopupTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const ms = cfg?.checkinPopupTimeoutMs ?? 5000;
    timeoutRef.current = setTimeout(() => {
      setCheckedGuest(null);
      setIsDuplicateCheckIn(false);
      timeoutRef.current = null;
    }, ms);
  };

  const clearPopupTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const toggleMultipleCheckinPerCounter = async (enabled: boolean) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Login diperlukan untuk mengubah pengaturan event');
      return;
    }
    setSavingEventSetting(true);
    try {
      const res = await fetch(`${apiBase()}/events/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ allowMultipleCheckinPerCounter: enabled }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      setCfg(prev => prev ? { ...prev, allowMultipleCheckinPerCounter: enabled } : prev);
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSavingEventSetting(false);
    }
  };

  const handleDownloadGuests = async () => {
    setDownloadingGuests(true);
    setDownloadProgress('Mengambil data tamu...');
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let allGuests: any[] = [];
      let page = 1;
      const pageSize = 500;
      let hasMore = true;

      while (hasMore) {
        const res = await fetch(`${apiBase()}/guests?page=${page}&pageSize=${pageSize}`, { headers });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(parseErrorMessage(errorText));
        }
        const responseData = await res.json();
        const batch = responseData.data || [];
        allGuests = allGuests.concat(batch);
        setDownloadProgress(`Mengambil data tamu... (${allGuests.length} sejauh ini)`);
        hasMore = batch.length === pageSize;
        page++;
        if (hasMore) await new Promise(r => setTimeout(r, 200)); // Small delay to prevent rate limiting
      }

      setDownloadProgress(`Menyimpan ${allGuests.length} tamu ke cache...`);

      const localGuests: LocalGuest[] = allGuests.map((g: any) => ({
        id: g.id,
        guestId: g.guestId,
        name: g.name,
        checkedIn: g.checkedIn,
        checkinCount: g.checkinCount || 0,
        lastCheckinAt: g.checkedInAt || undefined,
        photoUrl: g.photoUrl || undefined,
        updatedAt: new Date().toISOString(),
      }));

      const result = await indexedDBService.cacheGuestsBulk(localGuests);
      setDownloadProgress(`Berhasil: ${result.success} tamu tersimpan, ${result.failed} gagal.`);
      setCachedGuestCount(result.success);

      setTimeout(() => setDownloadProgress(null), 5000);
    } catch (e: any) {
      setError(e.message || 'Gagal mengunduh data tamu');
      setDownloadProgress(null);
    } finally {
      setDownloadingGuests(false);
    }
  };

  const handleClearCache = async () => {
    setShowClearCacheModal(true);
  };

  const executeClearCache = async () => {
    setShowClearCacheModal(false);
    try {
      await indexedDBService.clearGuestCache();
      setCachedGuestCount(0);
    } catch (e: any) {
      setError('Gagal menghapus cache: ' + e.message);
    }
  };

  const createAndCheckin = async (guestIdOrName: string) => {
    setCreatingGuest(true);
    setError(null);
    clearPopupTimeout();
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) throw new Error('Login diperlukan untuk membuat tamu baru');

      const res = await fetch(`${apiBase()}/public/guests/create-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ guestIdOrName: guestIdOrName.trim() })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal membuat tamu baru');
      }

      const newGuest = await res.json();
      setResults([newGuest]);
      setSelected(newGuest);
      setCheckedGuest(newGuest);
      setIsDuplicateCheckIn(false);
      setQ('');
      refreshHistory();
      startPopupTimeout();
      // Auto capture photo if enabled
      if (enablePhotoCapture && newGuest) {
        autoCapturephoto(newGuest);
      }
    } catch (e: any) {
      setError(e.message || 'Gagal membuat tamu baru');
    } finally {
      setCreatingGuest(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const doSearch = async () => {
    setError(null);
    setSelected(null);
    setCheckedGuest(null);
    setPendingNameCheckin(null);
    setResults([]); // Clear stale results before new search
    clearPopupTimeout(); // Clear any existing popup
    const params = new URLSearchParams();
    const searchQuery = q.trim();
    if (!searchQuery) return;
    // gunakan q untuk keduanya agar mendukung ID atau Nama
    const cleanQ = cleanQrContent(searchQuery);
    params.set('guestId', cleanQ);
    params.set('name', searchQuery);
    // Detect if input looks like a QR code / ID (contains digits, dashes, or is all uppercase)
    // Pure alphabetic names like "Budi" should still trigger fuzzy search
    const looksLikeId = !isNameSearchQuery(searchQuery);
    if (looksLikeId) {
      params.set('exact', 'true');
    }
    setSearching(true);
    // Cancel any in-flight search to prevent stale results
    if (searchAbortRef.current) searchAbortRef.current.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const isCurrentlyOffline = connectionStatusService.getStatus() !== 'online';

    try {
      if (isCurrentlyOffline && stationConfig) {
        throw new Error('OfflineMode');
      }

      const res = await fetch(`${apiBase()}/public/guests/search?${params.toString()}`, {
        signal: controller.signal
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      const data = await res.json();
      setResults(data);
      setQ(""); // Auto clear input after search
      // auto check-in hasil pertama bila ada HANYA JIKA hasil cuma 1
      if (data.length === 1) {
        if (isNameSearchQuery(searchQuery)) {
          setPendingNameCheckin({ guest: data[0], source: searchQuery, fromQueue: false });
          return;
        }
        await doCheckin(data[0]);
      } else if (data.length === 0) {
        // Guest not found - offer to create if setting is enabled
        if (autoCreateGuest) {
          await createAndCheckin(q.trim());
        } else {
          setError('Tamu tidak ditemukan');
        }
      }
      // Jika > 1, biarkan user memilih dari list
    } catch (e: any) {
      if (e.name === 'AbortError') return;

      const isForcedOffline = e.message === 'OfflineMode';
      const isNetworkError = isForcedOffline || 
                           e.message?.includes('Gagal terhubung') || 
                           e.message?.includes('NetworkError') || 
                           e.message?.includes('Failed to fetch') ||
                           e.message?.includes('network error') ||
                           !navigator.onLine;

      if (isNetworkError && stationConfig) {
        // Offline mode: search in local cache
        try {
          const cleanSearchQ = cleanQrContent(q.trim());
          let matchedGuests: LocalGuest[];

          // Try exact match on guestId index first (fast path)
          const exactMatch = await indexedDBService.getCachedGuestByGuestId(cleanSearchQ);
          if (exactMatch) {
            matchedGuests = [exactMatch];
          } else {
            // Menggunakan fast greedy loop agar UI thread tidak stuck meload 10,000 data
            const cachedGuests = await indexedDBService.getAllCachedGuests();
            matchedGuests = [];
            let matchCount = 0;
            const maxResults = 50;
            const searchLowerQ = cleanSearchQ.toLowerCase();
            const searchNameQ = q.trim().toLowerCase();

            for (const g of cachedGuests) {
              if (
                g.guestId.toLowerCase().includes(searchLowerQ) ||
                g.name.toLowerCase().includes(searchNameQ)
              ) {
                matchedGuests.push(g);
                matchCount++;
                if (matchCount >= maxResults) break;
              }
            }
          }

          if (matchedGuests.length === 1) {
            // Found single match - proceed with offline check-in
            const matchedGuest = matchedGuests[0];
            const queueLimit = cfg?.offlineQueueLimit || 500;
            const pendingCount = await offlineSyncService.getPendingCount();

            if (pendingCount >= queueLimit) {
              setError(`Antrian offline penuh (${pendingCount}/${queueLimit}). Hubungkan ke internet untuk sinkronisasi.`);
              return;
            }

            if (pendingCount >= queueLimit * 0.8) {
              setError(`⚠️ Antrian hampir penuh (${pendingCount}/${queueLimit}). Segera hubungkan ke internet.`);
            }

            // Check for duplicate check-in offline
            if (matchedGuest.checkedIn && !cfg?.allowMultipleCheckinPerCounter) {
              const guestFromCache: Guest = {
                id: matchedGuest.id,
                guestId: matchedGuest.guestId,
                name: matchedGuest.name,
                queueNumber: 0,
                tableLocation: '',
                checkedIn: matchedGuest.checkedIn,
                checkedInAt: matchedGuest.lastCheckinAt,
                checkinCount: matchedGuest.checkinCount,
              };
              setResults([guestFromCache]);
              setSelected(guestFromCache);
              setCheckedGuest(guestFromCache);
              setIsDuplicateCheckIn(true);
              setQ('');
              startPopupTimeout();
              return;
            }

            // Create a Guest object from cached data
            const guestFromCache: Guest = {
              id: matchedGuest.id,
              guestId: matchedGuest.guestId,
              name: matchedGuest.name,
              queueNumber: 0,
              tableLocation: '',
              checkedIn: true,
              checkedInAt: new Date().toISOString(),
              checkinCount: matchedGuest.checkinCount + 1,
            };

            await offlineSyncService.addToQueue(guestFromCache.guestId);
            
            // Update local cache to reflect check-in
            await indexedDBService.updateCachedGuest(matchedGuest.id, {
              checkedIn: true,
              checkinCount: matchedGuest.checkinCount + 1,
              lastCheckinAt: new Date().toISOString(),
            });

            setResults([guestFromCache]);
            setSelected(guestFromCache);
            setCheckedGuest(guestFromCache);
            setIsDuplicateCheckIn(false);
            setQ('');
            refreshHistory();
            startPopupTimeout();
            return;
          } else if (matchedGuests.length > 1) {
            // Multiple matches - show list for selection
            const guestResults: Guest[] = matchedGuests.map(g => ({
              id: g.id,
              guestId: g.guestId,
              name: g.name,
              queueNumber: 0,
              tableLocation: '',
              checkedIn: g.checkedIn,
              checkedInAt: g.lastCheckinAt,
              checkinCount: g.checkinCount,
            }));
            setResults(guestResults);
            setError(`Ditemukan ${matchedGuests.length} tamu secara lokal. Pilih satu untuk check-in.`);
            return;
          }

          setError('Tamu tidak ditemukan dalam cache lokal. Hubungkan ke internet untuk pencarian server.');
        } catch (cacheErr) {
          console.error('Cache search error:', cacheErr);
          setError('Tidak ada koneksi internet dan cache tidak tersedia.');
        }
      } else {
        setError(e.message || 'Gagal mencari tamu');
      }
    } finally {
      setSearching(false);
      // Keep focus on input for next checkin
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const doCheckin = async (g: Guest, useInternalId = false) => {
    setError(null);
    // Public check-in - use internal ID when there might be duplicates
    setChecking(true);
    setCheckingId(g.id);
    clearPopupTimeout(); // Clear existing before starting new checkin

    const isCurrentlyOffline = connectionStatusService.getStatus() !== 'online';

    try {
      if (isCurrentlyOffline && stationConfig) {
        throw new Error('OfflineMode');
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Use internal ID endpoint if explicitly requested or if there are multiple results
      const endpoint = useInternalId || results.length > 1
        ? `${apiBase()}/public/guests/checkin-by-id`
        : `${apiBase()}/public/guests/checkin`;
      const body = useInternalId || results.length > 1
        ? { id: g.id }
        : { guestId: g.guestId };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });


      if (res.status === 409) {
        const existing = await res.json();
        setCheckedGuest(existing);
        setSelected(existing);
        setIsDuplicateCheckIn(true);
        // refresh history
        refreshHistory();
        startPopupTimeout();
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      const updated = await res.json();
      setCheckedGuest(updated);
      setSelected(updated);
      setIsDuplicateCheckIn(false);
      // refresh history
      refreshHistory();
      startPopupTimeout();
      // Auto capture photo if enabled
      if (enablePhotoCapture && updated) {
        autoCapturephoto(updated);
      }
    } catch (e: any) {
      const isForcedOffline = e.message === 'OfflineMode';
      const isNetworkError = isForcedOffline || 
                           e.message?.includes('Gagal terhubung') || 
                           e.message?.includes('NetworkError') || 
                           e.message?.includes('Failed to fetch') ||
                           e.message?.includes('network error') ||
                           !navigator.onLine;

      if (isNetworkError && stationConfig) {
        // Offline mode: queue check-in
        try {
          const queueLimit = cfg?.offlineQueueLimit || 500;
          const pendingCount = await offlineSyncService.getPendingCount();

          if (pendingCount >= queueLimit) {
            setError(`Antrian offline penuh (${pendingCount}/${queueLimit}). Hubungkan ke internet untuk sinkronisasi.`);
            return;
          }

          if (pendingCount >= queueLimit * 0.8) {
            setError(`⚠️ Antrian hampir penuh (${pendingCount}/${queueLimit}). Segera hubungkan ke internet.`);
          }

          await offlineSyncService.addToQueue(g.guestId);
          
          // Update local cache to reflect offline check-in
          try {
            await indexedDBService.updateCachedGuest(g.id, {
              checkedIn: true,
              checkinCount: (g.checkinCount || 0) + 1,
              lastCheckinAt: new Date().toISOString(),
            });
          } catch {}

          setCheckedGuest(g);
          setSelected(g);
          setIsDuplicateCheckIn(false);
          refreshHistory();
          startPopupTimeout();
          return;
        } catch (queueErr) {
          console.error('Queue error:', queueErr);
        }
      }

      setError(e.message || 'Gagal check-in');
    } finally {
      setChecking(false);
      setCheckingId(null);
    }
  };

  const openUncheckModal = (g: Guest) => {
    setUncheckTarget(g);
    setUncheckPassword('');
    setUncheckReason('');
    setShowUncheckModal(true);
    clearPopupTimeout();
  };

  const closeUncheckModal = () => {
    setShowUncheckModal(false);
    setUncheckTarget(null);
    setUncheckPassword('');
    setUncheckReason('');
  };

  const confirmNameCheckin = async () => {
    if (!pendingNameCheckin) return;
    const pending = pendingNameCheckin;
    setPendingNameCheckin(null);
    if (pending.fromQueue) {
      await doCheckinWrapperForQueue(pending.guest, false, pending.source);
    } else {
      await doCheckin(pending.guest);
    }
  };

  const cancelNameCheckin = () => {
    setPendingNameCheckin(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const doUncheckin = async () => {
    if (!uncheckTarget) return;

    setError(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Login diperlukan untuk membatalkan check-in');
      return;
    }

    setUnchecking(true);
    try {
      const res = await fetch(`${apiBase()}/guests/${uncheckTarget.id}/uncheckin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          password: uncheckPassword,
          reason: uncheckReason,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal membatalkan check-in');
      }

      const updated = await res.json();
      setCheckedGuest(null);
      setSelected(updated);
      refreshHistory();
      closeUncheckModal();
    } catch (e: any) {
      setError(e.message || 'Gagal membatalkan check-in');
    } finally {
      setUnchecking(false);
    }
  };

  const refreshHistory = async () => {
    try {
      const r = await fetch(`${apiBase()}/public/guests/history?limit=10`);
      if (r.ok) setHistory(await r.json());
    } catch { }
  };

  // Photo capture functions
  const startCamera = async () => {
    try {
      // Check if we're in a secure context (required for camera access)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error('Kamera membutuhkan koneksi aman (HTTPS atau localhost). Akses via https:// atau localhost.');
      }

      // Check if camera API is available
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera. Gunakan HTTPS atau localhost.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play()
                .then(() => resolve())
                .catch(reject);
            };
          }
        });
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      let errorMsg = 'Gagal mengakses kamera';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Akses kamera ditolak. Berikan izin kamera di browser.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Kamera tidak ditemukan.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Kamera sedang digunakan oleh aplikasi lain.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Check if video is ready
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setError('Kamera belum siap. Tunggu sebentar.');
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const uploadCapturedPhoto = async () => {
    if (!capturedPhoto || !checkedGuest) return;

    setUploadingPhoto(true);
    try {
      // Convert data URL to blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      const file = new File([blob], `photo_${checkedGuest.id}.jpg`, { type: 'image/jpeg' });

      const fd = new FormData();
      fd.append('photo', file);

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${apiBase()}/guests/${checkedGuest.id}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });

      if (!res.ok) throw new Error('Gagal menyimpan foto');

      const updated = await res.json();
      setCheckedGuest(updated);
      setShowPhotoCapture(false);
      setCapturedPhoto(null);
      stopCamera();
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const closePhotoCapture = () => {
    setShowPhotoCapture(false);
    setCapturedPhoto(null);
    stopCamera();
  };

  // Auto capture photo function - automatically captures and uploads photo
  const autoCapturephoto = async (guest: Guest) => {
    if (!guest || autoCapturing) return;

    // Check if we're in a secure context (required for camera access)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      console.warn('Camera requires secure context (HTTPS or localhost)');
      return;
    }

    // Check if camera API is available
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('Camera API not available (requires HTTPS)');
      return;
    }

    setAutoCapturing(true);
    setAutoCaptureStatus('Menyiapkan kamera...');

    try {
      // Start camera for auto capture
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      autoStreamRef.current = stream;

      if (autoVideoRef.current) {
        autoVideoRef.current.srcObject = stream;

        // Wait for video to be ready with timeout
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video timeout')), 5000);
          if (autoVideoRef.current) {
            autoVideoRef.current.onloadedmetadata = () => {
              clearTimeout(timeout);
              autoVideoRef.current?.play()
                .then(() => resolve())
                .catch(reject);
            };
            autoVideoRef.current.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Video error'));
            };
          }
        });

        // Wait a moment for camera to adjust/focus
        setAutoCaptureStatus('Mengambil foto dalam 2 detik...');
        await new Promise(resolve => setTimeout(resolve, 700));
        setAutoCaptureStatus('Mengambil foto dalam 1 detik...');
        await new Promise(resolve => setTimeout(resolve, 700));
        setAutoCaptureStatus('Mengambil foto...');
        await new Promise(resolve => setTimeout(resolve, 300));

        // Capture photo
        if (autoVideoRef.current && autoCanvasRef.current) {
          const video = autoVideoRef.current;
          const canvas = autoCanvasRef.current;

          // Ensure video has valid dimensions
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            throw new Error('Video dimensions invalid');
          }

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            // Upload photo based on connectivity
            const isOffline = connectionStatusService.getStatus() !== 'online';
            
            if (isOffline && stationConfig) {
              setAutoCaptureStatus('Foto disimpan di antrean offline');
              const pending = await indexedDBService.getPendingCheckins();
              const pCheckin = pending.find(p => p.guestIdentifier === guest.guestId || p.guestIdentifier === guest.id);
              if (pCheckin) {
                await indexedDBService.updatePendingCheckin(pCheckin.id, { photo: dataUrl });
              } else {
                await offlineSyncService.addToQueue(guest.guestId, dataUrl);
              }
              // Update local cache
              await indexedDBService.updateCachedGuest(guest.id, { photoUrl: dataUrl }).catch(() => {});
            } else {
              setAutoCaptureStatus('Menyimpan foto...');
              const response = await fetch(dataUrl);
              const blob = await response.blob();
              const file = new File([blob], `photo_${guest.id}.jpg`, { type: 'image/jpeg' });

              const fd = new FormData();
              fd.append('photo', file);

              const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
              const res = await fetch(`${apiBase()}/guests/${guest.id}`, {
                method: 'PUT',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                body: fd,
              });

              if (res.ok) {
                const updated = await res.json();
                setCheckedGuest(updated);
                setAutoCaptureStatus('Foto berhasil disimpan!');
              } else {
                // Upload failed - fallback to offline queue
                setAutoCaptureStatus('Foto masuk daftar sync');
                const pending = await indexedDBService.getPendingCheckins();
                const pCheckin = pending.find(p => p.guestIdentifier === guest.guestId || p.guestIdentifier === guest.id);
                if (pCheckin) {
                  await indexedDBService.updatePendingCheckin(pCheckin.id, { photo: dataUrl });
                } else {
                  await offlineSyncService.addToQueue(guest.guestId, dataUrl);
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Auto capture error:', err);
      let errorMsg = 'Gagal mengakses kamera';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Akses kamera ditolak';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Kamera tidak ditemukan';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setAutoCaptureStatus(errorMsg);
    } finally {
      // Stop auto capture stream
      if (autoStreamRef.current) {
        autoStreamRef.current.getTracks().forEach(track => track.stop());
        autoStreamRef.current = null;
      }
      // Clear status after a moment
      setTimeout(() => {
        setAutoCapturing(false);
        setAutoCaptureStatus('');
      }, 2000);
    }
  };

  // Stop auto capture stream on unmount
  useEffect(() => {
    return () => {
      if (autoStreamRef.current) {
        autoStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => { refreshHistory(); }, []);

  // Auto focus input when popup is closed
  useEffect(() => {
    if (!checkedGuest && !searching && !checking) {
      // slight delay to ensure UI is ready
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [checkedGuest, searching, checking]);

  // Realtime: subscribe to server-sent events for config changes & history updates
  useEffect(() => {
    const onConfig = (e: MessageEvent) => {
      try { const data = JSON.parse((e as any).data); setCfg(data); } catch { }
    };
    const onPreview = (e: MessageEvent) => {
      try { const data = JSON.parse((e as any).data); setPreview(data || null); } catch { }
    };
    const onChange = () => { refreshHistory(); };
    const onEventChange = () => {
      // Reload config and clear results when event changes
      fetch(`${apiBase()}/config/event`).then(async (r) => {
        const data = await r.json();
        setCfg(data);
      }).catch(() => { });
      setResults([]);
      setSelected(null);
      setQ('');
      refreshHistory();

      // Implement cache clearing for the new event
      indexedDBService.clearEventCaches().then(async () => {
        setCachedGuestCount(0);

        // Notify the operator
        setEventChangeNotif("Event aktif telah diubah oleh Admin. Cache tamu lokal telah dikosongkan. Harap download ulang data tamu untuk akses offline event yang baru.");
        setTimeout(() => setEventChangeNotif(null), 8000);

        // Check for pending queue from previous event
        const pendingCount = await indexedDBService.getPendingCount();
        if (pendingCount > 0) {
          setPendingSyncAlert(pendingCount);
          setTimeout(() => setPendingSyncAlert(null), 10000);
        }
      }).catch(err => {
        console.error('Failed to clear event caches:', err);
      });
    };

    // Handle sync_complete event
    const onSyncComplete = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        console.log(`Sync complete: ${data.successCount} success, ${data.conflictCount} conflicts from ${data.stationName}`);
      } catch (err) { }
      refreshHistory();
    };

    // Handle guest updates (like bulk-delete or single delete)
    const onGuestUpdate = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data && data.action === 'bulk-delete') {
          indexedDBService.clearGuestCache().then(() => {
            setCachedGuestCount(0);
            console.log('[CheckinPage] Guest cache automatically cleared due to bulk-delete action from server.');
          }).catch(err => {
            console.error('[CheckinPage] Failed to clear guest cache on bulk-delete:', err);
          });
        } else if (data && data.action === 'delete' && data.id) {
          indexedDBService.deleteCachedGuest(data.id).then(() => {
            setCachedGuestCount(prev => Math.max(0, prev - 1));
            console.log(`[CheckinPage] Deleted guest ${data.id} from local cache.`);
          }).catch(err => {
            console.error(`[CheckinPage] Failed to delete guest ${data.id} from cache:`, err);
          });
        }
      } catch (err) { }
      refreshHistory();
    };

    addEventListener('config', onConfig);
    addEventListener('preview', onPreview);
    addEventListener('checkin', onChange);
    addEventListener('uncheckin', onChange);
    addEventListener('guest-update', onGuestUpdate);
    addEventListener('event_change', onEventChange);
    addEventListener('sync_complete', onSyncComplete);
    return () => {
      removeEventListener('config', onConfig);
      removeEventListener('preview', onPreview);
      removeEventListener('checkin', onChange);
      removeEventListener('uncheckin', onChange);
      removeEventListener('guest-update', onGuestUpdate);
      removeEventListener('event_change', onEventChange);
      removeEventListener('sync_complete', onSyncComplete);
    };
  }, [addEventListener, removeEventListener]);

  // Detect auth (admin logged in) to conditionally show admin-only actions
  useEffect(() => {
    const check = async () => {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('token');
      setIsAuth(!!token);

      // Fetch current admin info
      if (token) {
        try {
          const res = await fetch(`${apiBase()}/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const user = await res.json();
            setCurrentAdmin({ id: user.id, name: user.displayName || user.username });
            console.log('[CheckinPage] Current admin:', user.displayName || user.username, 'ID:', user.id);
          } else {
            setCurrentAdmin(null);
          }
        } catch {
          setCurrentAdmin(null);
        }
      } else {
        setCurrentAdmin(null);
      }
    };
    check();
    const onStorage = (e: StorageEvent) => { if (e.key === 'token') check(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Effective background mode for page (not popup): always follow config
  const pageBgType = (preview?.backgroundType as EventConfig['backgroundType'] | undefined) ?? cfg?.backgroundType;
  const pageBgImage = preview?.backgroundImageUrl ?? cfg?.backgroundImageUrl;
  const pageBgVideo = preview?.backgroundVideoUrl ?? cfg?.backgroundVideoUrl;

  const [showScanner, setShowScanner] = useState(false);

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    // Stop scanning
    setShowScanner(false);

    // Attempt check-in
    setChecking(true);
    setError(null);
    clearPopupTimeout();

    const isCurrentlyOffline = connectionStatusService.getStatus() !== 'online';

    try {
      if (isCurrentlyOffline && stationConfig) {
        throw new Error('OfflineMode');
      }

      const cleanCode = cleanQrContent(decodedText);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiBase()}/public/guests/checkin-qr`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ qrCode: cleanCode })
      });

      if (res.status === 409) {
        const existing = await res.json();
        setCheckedGuest(existing);
        setSelected(existing);
        setIsDuplicateCheckIn(true);
        refreshHistory();
        startPopupTimeout();
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      const updated = await res.json();
      setCheckedGuest(updated);
      setSelected(updated);
      setIsDuplicateCheckIn(false);
      refreshHistory();
      startPopupTimeout();
      // Auto capture photo if enabled
      if (enablePhotoCapture && updated) {
        autoCapturephoto(updated);
      }
    } catch (e: any) {
      const isForcedOffline = e.message === 'OfflineMode';
      const isNetworkError = isForcedOffline || 
                           e.message?.includes('Gagal terhubung') || 
                           e.message?.includes('NetworkError') || 
                           e.message?.includes('Failed to fetch') ||
                           e.message?.includes('network error') ||
                           !navigator.onLine;

      if (isNetworkError && stationConfig) {
        // Offline mode: queue check-in with QR code
        try {
          const queueLimit = cfg?.offlineQueueLimit || 500;
          const pendingCount = await offlineSyncService.getPendingCount();

          if (pendingCount >= queueLimit) {
            setError(`Antrian offline penuh (${pendingCount}/${queueLimit}). Hubungkan ke internet untuk sinkronisasi.`);
            return;
          }

          if (pendingCount >= queueLimit * 0.8) {
            setError(`⚠️ Antrian hampir penuh (${pendingCount}/${queueLimit}). Segera hubungkan ke internet.`);
          }

          const cleanCode = cleanQrContent(decodedText);

          // Try to find guest in local cache for better UX
          const cachedGuest = await indexedDBService.getCachedGuestByGuestId(cleanCode);

          await offlineSyncService.addToQueue(cleanCode);

          if (cachedGuest) {
            // Update local cache
            await indexedDBService.updateCachedGuest(cachedGuest.id, {
              checkedIn: true,
              checkinCount: cachedGuest.checkinCount + 1,
              lastCheckinAt: new Date().toISOString(),
            });

            const guestObj: Guest = {
              id: cachedGuest.id,
              guestId: cachedGuest.guestId,
              name: cachedGuest.name,
              queueNumber: 0,
              tableLocation: '',
              checkedIn: true,
              checkedInAt: new Date().toISOString(),
              checkinCount: cachedGuest.checkinCount + 1,
            };
            setError(null);
            setCheckedGuest(guestObj);
            setSelected(guestObj);
          } else {
            // Fallback: no cache data available
            setError(null);
            setCheckedGuest({ guestId: cleanCode, name: 'Queued (offline)', id: 'offline', queueNumber: 0, tableLocation: '', checkedIn: false } as Guest);
            setSelected({ guestId: cleanCode, name: 'Queued (offline)', id: 'offline', queueNumber: 0, tableLocation: '', checkedIn: false } as Guest);
          }

          setIsDuplicateCheckIn(false);
          refreshHistory();
          startPopupTimeout();
          return;
        } catch (queueErr) {
          console.error('Queue error:', queueErr);
        }
      }

      setError(e.message || 'Gagal scan QR');
    } finally {
      setChecking(false);
    }
  };

  return (
    <RequireAuth>
      <div className="relative min-h-[100dvh] w-full overflow-hidden">
        {/* Header */}
        <div className="relative z-30 p-4 md:p-6 pb-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {cfg?.logoUrl ? (
                  <img src={toApiUrl(cfg.logoUrl)} className="h-12 md:h-16 w-auto border border-brand-primary/30 rounded-lg" alt="logo" />
                ) : (
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-brand-primary/10 border border-brand-border flex items-center justify-center">
                    <Users size={28} className="text-brand-primary" />
                  </div>
                )}
                <div>
                  <div className="text-xl md:text-3xl font-semibold text-brand-text">{cfg?.name || 'Event'}</div>
                  {(cfg?.date || cfg?.location) && (
                    <div className="text-sm text-brand-text/70 flex items-center gap-2 mt-0.5">
                      {cfg?.date && <span>{new Date(cfg.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                      {cfg?.date && cfg?.location && <span>•</span>}
                      {cfg?.location && <span>{cfg.location}</span>}
                    </div>
                  )}
                </div>
              </div>
              {currentAdmin ? (
                <StatusBadge status="success">{currentAdmin.name}</StatusBadge>
              ) : (
                <StatusBadge status="warning">Tidak login</StatusBadge>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              {stationConfig ? (
                <StatusBadge status="info" className="flex items-center gap-1.5">
                  <Monitor size={12} />
                  {stationConfig.stationName}
                </StatusBadge>
              ) : <div />}
              <div className="flex items-center gap-3">
                <button onClick={() => setShowQueuePanel(true)} className="text-brand-text/60 hover:text-brand-text text-sm">Antrian</button>
                <button onClick={() => setShowStationSetup(true)} className="text-brand-text/60 hover:text-brand-text text-sm">Stasiun</button>
                <ConnectionStatusIndicator onShowQueue={() => setShowQueuePanel(true)} cachedGuestCount={cachedGuestCount} />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative z-10 px-4 py-6 flex flex-col items-center">
          <div className="w-full max-w-3xl">
            <div className="surface-elevated p-6 md:p-8">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-textMuted">
                  <Search size={22} />
                </div>
                <Input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!q.trim()) return;
                      rapidQueueRef.current.push(q.trim());
                      setQ('');
                      processRapidQueue();
                    }
                  }}
                  placeholder="Masukkan ID Tamu atau Nama, lalu tekan Enter"
                  className="pl-12 pr-4 py-4 text-lg"
                  autoFocus
                />
              </div>

              {/* Inline help hint */}
              <div className="mt-3 flex items-center gap-2 text-xs text-brand-textDim">
                <HelpCircle size={13} className="shrink-0" />
                <span>Ketik ID atau nama tamu → Enter untuk check-in cepat. Bisa scan QR juga. Tamu tidak ditemukan? Aktifkan Auto-Create di Pengaturan.</span>
              </div>

              {rapidLogs.length > 0 && (
                <div className="mt-4 surface-elevated p-4 text-sm max-h-48 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-brand-text font-semibold">Riwayat Scan</h3>
                    <div className="group relative">
                      <HelpCircle size={13} className="text-brand-textDim cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-brand-bgElevated border border-brand-border rounded-lg text-xs text-brand-text shadow-panel w-64 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
                        Log scan terakhir. Warna hijau = berhasil, kuning = sudah check-in, merah = error/tidak ditemukan.
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {rapidLogs.map((log) => (
                      <li key={log.id} className="flex justify-between items-center bg-brand-bgSubtle px-3 py-2 rounded-lg">
                        <div className="flex gap-3">
                          <span className="text-brand-textMuted">{log.timestamp.toLocaleTimeString()}</span>
                          <strong className="text-brand-text">{log.guestIdOrName}</strong>
                        </div>
                        <span className={`font-medium ${
                          log.status === 'SUCCESS' ? 'text-brand-success' :
                          log.status === 'DUPLICATE' ? 'text-brand-warning' :
                          'text-brand-danger'
                        }`}>
                          {log.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger flex items-center justify-between">
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                <Button
                  size="lg"
                  className="flex-1"
                  disabled={searching || checking || creatingGuest}
                  loading={searching || checking || creatingGuest}
                  onClick={doSearch}
                >
                  {!searching && !checking && !creatingGuest && <Search size={22} />}
                  {searching ? 'Mencari...' : (creatingGuest ? 'Membuat Tamu...' : (checking ? 'Check-in...' : 'Cari & Check-in'))}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 sm:flex-initial text-brand-text"
                  disabled={searching || checking || creatingGuest}
                  onClick={() => setShowScanner(true)}
                >
                  <QrCode size={22} />
                  Scan QR
                </Button>
                <Button size="lg" variant="ghost" onClick={() => setShowSettings(true)} aria-label="Pengaturan">
                  <Settings size={22} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        <Modal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          title={
            <span className="flex items-center gap-2">
              <Settings size={20} className="text-brand-primary" />
              Pengaturan Stasiun
            </span>
          }
          footer={
            <Button onClick={() => setShowSettings(false)} className="w-full">
              <CheckCircle size={18} />
              Selesai
            </Button>
          }
        >
          <div className="space-y-3">
            <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-lg p-3 mb-2">
              <div className="flex gap-2">
                <HelpCircle size={14} className="text-brand-primary shrink-0 mt-0.5" />
                <p className="text-xs text-brand-textMuted leading-relaxed">
                  Atur perilaku check-in di station ini. Perubahan tersimpan otomatis dan berlaku hanya untuk perangkat ini.
                </p>
              </div>
            </div>
            <Toggle
              icon={<UserPlus size={18} />}
              checked={autoCreateGuest}
              onChange={(checked) => {
                setAutoCreateGuest(checked);
                localStorage.setItem('checkinAutoCreateGuest', String(checked));
              }}
              label="Buat tamu baru bila tidak ditemukan"
              description="Saat pencarian tidak menemukan tamu, sistem membuat tamu baru lalu check-in. Cocok untuk walk-in guests."
            />
            <Toggle
              icon={<Camera size={18} />}
              checked={enablePhotoCapture}
              onChange={(checked) => {
                setEnablePhotoCapture(checked);
                localStorage.setItem('checkinEnablePhotoCapture', String(checked));
              }}
              label="Ambil foto otomatis saat check-in"
              description="Gunakan webcam untuk mengambil foto tamu setelah check-in berhasil."
            />

            {isAuth && (
              <div className="pt-3 border-t border-brand-border space-y-3">
                <div className="text-xs uppercase tracking-wider text-brand-textMuted">Pengaturan Event (Admin)</div>
                <Toggle
                  icon={<UserCheck size={18} />}
                  checked={cfg?.allowMultipleCheckinPerCounter ?? false}
                  onChange={(checked) => toggleMultipleCheckinPerCounter(checked)}
                  disabled={savingEventSetting}
                  label="Check-in berulang per counter"
                  description="Tamu dapat check-in di berbagai counter, maksimal 1x per counter."
                />
              </div>
            )}

            <div className="pt-3 border-t border-brand-border space-y-3">
              <div className="text-xs uppercase tracking-wider text-brand-textMuted">Akses Offline</div>
              <Button
                variant="outline"
                className="w-full justify-start text-brand-text"
                onClick={handleDownloadGuests}
                loading={downloadingGuests}
              >
                <Users size={18} />
                <span className="text-left">
                  <span className="block font-medium">Download data tamu</span>
                  <span className="block text-xs text-brand-textMuted font-normal">Simpan ke perangkat untuk pencarian offline</span>
                </span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-brand-danger border-brand-danger/30 hover:bg-brand-danger/10"
                onClick={handleClearCache}
              >
                <Trash2 size={18} />
                <span className="text-left">
                  <span className="block font-medium">Hapus cache lokal</span>
                  <span className="block text-xs text-brand-textMuted font-normal">Hapus semua data tamu tersimpan di perangkat ini</span>
                </span>
              </Button>
              {downloadProgress && !downloadingGuests && (
                <div className="text-xs text-brand-success text-center">{downloadProgress}</div>
              )}
            </div>
          </div>
        </Modal>

        {/* Results */}
        <div className="relative z-10 px-4 pb-4 flex justify-center">
          <div className="w-full max-w-3xl surface-elevated p-4 md:p-6">
            {!results.length && (
              <div className="text-center py-8 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-brand-text/5 flex items-center justify-center">
                  <Search size={32} className="text-brand-textMuted" />
                </div>
                <div>
                  <p className="text-brand-text text-lg">Siap untuk check-in</p>
                  <p className="text-brand-textMuted text-sm mt-1">Masukkan ID Tamu / Nama atau gunakan Scan QR</p>
                </div>
              </div>
            )}
            {!!results.length && (
              <div className="space-y-3">
                <div className="text-sm text-brand-textMuted font-medium mb-2">
                  {results.length} tamu ditemukan
                  {results.length > 1 && (
                    <span className="ml-2 text-brand-warning">- Pilih tamu untuk check-in</span>
                  )}
                </div>
                {results.map((g) => (
                  <div
                    key={g.id}
                    className={`flex items-center justify-between rounded-xl p-4 transition-colors ${selected?.id === g.id ? 'bg-brand-primary/10 border border-brand-primary/30' : 'surface-interactive'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-xl bg-brand-text/5 overflow-hidden flex-shrink-0">
                        {g.photoUrl ? (
                          <img src={toApiUrl(g.photoUrl)} className="h-full w-full object-cover" alt={g.name} />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Users size={24} className="text-brand-textMuted" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-brand-text text-lg">{g.name}</div>
                        <div className="text-sm text-brand-textMuted flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-brand-primary">{g.guestId}</span>
                          <span>•</span>
                          <span>{g.tableLocation}</span>
                        </div>
                        {g.company && (
                          <div className="text-sm text-brand-warning/90 mt-0.5">
                            {g.company}
                            {g.division && <span className="text-brand-textMuted"> - {g.division}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      disabled={checking}
                      loading={checking && checkingId === g.id}
                      onClick={() => doCheckin(g, true)}
                    >
                      {!checking && <CheckCircle size={16} />}
                      Check-in
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* History */}
        <div className="relative z-10 px-4 pb-6 flex justify-center">
          <div className="w-full max-w-3xl surface-elevated p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2 text-brand-text">
                <Clock size={18} className="text-brand-primary" />
                Riwayat Check-in Terbaru
              </div>
              <span className="text-xs text-brand-textMuted">{history.length} tamu</span>
            </div>
            {!history.length && (
              <div className="text-sm text-brand-textMuted py-6 text-center flex flex-col items-center gap-2">
                <Clock size={32} className="text-brand-textMuted/50" />
                Belum ada riwayat check-in
              </div>
            )}
            {!!history.length && (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 rounded-xl border border-brand-border surface-interactive p-3 hover:shadow-gold transition-all">
                    <div className="h-12 w-12 rounded-lg bg-brand-text/5 overflow-hidden flex-shrink-0">
                      {h.photoUrl ? (
                        <img src={toApiUrl(h.photoUrl)} className="h-full w-full object-cover" alt={h.name} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Users size={20} className="text-brand-textMuted" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-brand-text truncate">{h.name}</div>
                      <div className="text-xs text-brand-textMuted truncate flex items-center gap-1.5">
                        <span className="font-mono text-brand-primary/70">{h.guestId}</span>
                        <span>•</span>
                        <span>{h.tableLocation}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-brand-success font-medium">#{h.queueNumber}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Modal
          open={!!pendingNameCheckin}
          onClose={cancelNameCheckin}
          title="Konfirmasi nama tamu"
          description={`Pencarian "${pendingNameCheckin?.source ?? ''}" menemukan satu tamu. Pastikan nama sudah benar sebelum check-in.`}
          footer={
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1" onClick={cancelNameCheckin} disabled={checking}>
                Batal
              </Button>
              <Button className="flex-1" onClick={confirmNameCheckin} loading={checking}>
                <CheckCircle size={18} />
                Konfirmasi Check-in
              </Button>
            </div>
          }
        >
          {pendingNameCheckin && (
            <div className="space-y-4">
              <div className="rounded-xl border border-brand-warning/30 bg-brand-warning/10 p-4">
                <div className="text-xs uppercase tracking-wider text-brand-warning font-medium">Periksa ulang</div>
                <div className="mt-2 text-2xl font-semibold text-brand-text leading-tight">{pendingNameCheckin.guest.name}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-brand-textMuted">ID Tamu</div>
                  <div className="font-mono font-semibold text-brand-primary mt-1">{pendingNameCheckin.guest.guestId}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-brand-textMuted">Meja / Ruangan</div>
                  <div className="font-semibold text-brand-text mt-1">{pendingNameCheckin.guest.tableLocation || '-'}</div>
                </div>
                {pendingNameCheckin.guest.company && (
                  <div className="sm:col-span-2">
                    <div className="text-xs uppercase tracking-wider text-brand-textMuted">Perusahaan</div>
                    <div className="font-semibold text-brand-text mt-1">
                      {pendingNameCheckin.guest.company}
                      {pendingNameCheckin.guest.division && <span className="text-brand-textMuted"> - {pendingNameCheckin.guest.division}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Confirmation full display */}
        {checkedGuest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { setCheckedGuest(null); setIsDuplicateCheckIn(false); clearPopupTimeout(); }}>
            <div className="w-full max-w-5xl overflow-hidden rounded-2xl surface-elevated shadow-gold grid grid-cols-1 md:grid-cols-[360px_1fr]">
              <div className="bg-brand-text/5 flex items-center justify-center min-h-[300px] md:min-h-full relative">
                {autoCapturing ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <video
                      ref={autoVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                      <div className="inline-flex items-center gap-2 bg-black/60 text-brand-text px-4 py-2 rounded-full text-sm font-medium">
                        <Loader2 className="animate-spin" size={16} />
                        {autoCaptureStatus}
                      </div>
                    </div>
                  </div>
                ) : checkedGuest.photoUrl ? (
                  <img src={toApiUrl(checkedGuest.photoUrl)} alt={checkedGuest.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-brand-textMuted p-8 flex flex-col items-center gap-2">
                    <Users size={48} />
                    <span>Tidak ada foto</span>
                  </div>
                )}
                <canvas ref={autoCanvasRef} className="hidden" />
              </div>
              <div className="p-6 md:p-10 space-y-5 relative overflow-y-auto max-h-[60vh] md:max-h-full">
                {isDuplicateCheckIn ? (
                  <div className="flex items-center gap-3 text-brand-warning">
                    <div className="p-2 rounded-lg bg-brand-warning/10 border border-brand-warning/30">
                      <XCircle size={22} />
                    </div>
                    <div>
                      <div className="text-xl font-semibold">Sudah Check-in</div>
                      <div className="text-sm text-brand-warning/80">Tamu pernah check-in sebelumnya</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-brand-success">
                    <div className="p-2 rounded-lg bg-brand-success/10 border border-brand-success/30">
                      <CheckCircle size={22} />
                    </div>
                    <div>
                      <div className="text-xl font-semibold">Check-in Berhasil</div>
                      {(checkedGuest.checkinCount ?? 0) > 1 && (
                        <div className="text-sm text-brand-success/80">Check-in ke-{checkedGuest.checkinCount}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Show check-in history for both success and duplicate */}
                {checkedGuest.checkins && checkedGuest.checkins.length > 0 && (
                  <div className={`mb-4 rounded-lg p-3 ${isDuplicateCheckIn ? 'bg-brand-warning/10 border border-brand-warning/20' : 'bg-brand-success/10 border border-brand-success/20'}`}>
                    {isDuplicateCheckIn && checkedGuest.message && (
                      <div className="text-base text-brand-warning font-medium mb-2">{checkedGuest.message}</div>
                    )}
                    <div className={`text-sm uppercase tracking-wider font-medium mb-2 ${isDuplicateCheckIn ? 'text-brand-warning' : 'text-brand-success'}`}>
                      Riwayat Check-in ({checkedGuest.checkinCount || checkedGuest.checkins.length}x)
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {checkedGuest.checkins.map((c, idx) => (
                        <div key={c.id || idx} className={`flex items-center justify-between text-sm rounded px-2 py-1 ${isDuplicateCheckIn ? 'bg-brand-warning/10' : 'bg-brand-success/10'}`}>
                          <span className={`font-medium ${isDuplicateCheckIn ? 'text-brand-warning' : 'text-brand-success'}`}>
                            {c.checkinByName || 'Admin'}
                            {c.counterName && <span className="text-brand-text/50 ml-1">({c.counterName})</span>}
                          </span>
                          <span className={`font-mono text-xs ${isDuplicateCheckIn ? 'text-brand-warning' : 'text-brand-success'}`}>
                            {new Date(c.checkinAt).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback for old data without checkins array */}
                {isDuplicateCheckIn && (!checkedGuest.checkins || checkedGuest.checkins.length === 0) && checkedGuest.checkedInAt && (
                  <div className="mb-4 bg-brand-warning/10 border border-brand-warning/20 rounded-lg p-3">
                    {checkedGuest.message && (
                      <div className="text-base text-brand-warning font-medium mb-2">{checkedGuest.message}</div>
                    )}
                    <div className="text-sm text-brand-warning uppercase tracking-wider font-medium">Waktu Check-in Sebelumnya</div>
                    <div className="text-xl font-mono font-bold text-brand-warning">
                      {new Date(checkedGuest.checkedInAt).toLocaleString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                    {checkedGuest.checkedInByName && (
                      <div className="text-sm text-brand-warning mt-1">Oleh: {checkedGuest.checkedInByName}</div>
                    )}
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">ID Tamu</div>
                    <div className="text-xl font-mono font-semibold text-brand-text">{checkedGuest.guestId}</div>
                  </div>
                  <div>
                    <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">Nama</div>
                    <div className="text-3xl md:text-5xl font-semibold text-brand-text leading-tight">{checkedGuest.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">Meja / Ruangan</div>
                    <div className="text-2xl md:text-4xl font-semibold text-brand-text">{checkedGuest.tableLocation}</div>
                  </div>
                  {checkedGuest.company && (
                    <div>
                      <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">Perusahaan</div>
                      <div className="text-xl md:text-2xl font-semibold text-brand-text">{checkedGuest.company}</div>
                    </div>
                  )}
                  {checkedGuest.department && (
                    <div>
                      <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">Departemen</div>
                      <div className="text-xl md:text-2xl font-semibold text-brand-text">{checkedGuest.department}</div>
                    </div>
                  )}
                  {checkedGuest.division && (
                    <div>
                      <div className="text-sm text-brand-textMuted uppercase tracking-wider font-medium">Divisi</div>
                      <div className="text-xl md:text-2xl font-semibold text-brand-text">{checkedGuest.division}</div>
                    </div>
                  )}
                  {checkedGuest.notes && (
                    <div className="p-4 bg-brand-warning/10 border border-brand-warning/20 rounded-xl">
                      <div className="text-sm text-brand-warning uppercase tracking-wider font-medium mb-1">Catatan</div>
                      <div className="text-base text-brand-warning italic">"{checkedGuest.notes}"</div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-brand-border flex items-center justify-between">
                  <div>
                    <div className="text-xs text-brand-textMuted uppercase tracking-wider font-medium">Nomor Antrian</div>
                    <div className="text-2xl font-semibold text-brand-text">{checkedGuest.queueNumber}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" onClick={() => { setCheckedGuest(null); setIsDuplicateCheckIn(false); clearPopupTimeout(); }} disabled={autoCapturing}>
                      <X size={18} /> Tutup
                    </Button>
                    {enablePhotoCapture && !isDuplicateCheckIn && !autoCapturing && (
                      <Button onClick={() => { clearPopupTimeout(); setShowPhotoCapture(true); startCamera(); }}>
                        <Camera size={18} /> {checkedGuest?.photoUrl ? 'Ulangi Foto' : 'Ambil Foto'}
                      </Button>
                    )}
                    {isAuth && (
                      <Button variant="danger" disabled={unchecking} onClick={() => openUncheckModal(checkedGuest)}>
                        <XCircle size={18} /> Batalkan
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>


          </div>
        )}

        {/* Scanner Modal */}
        <Modal open={showScanner} onClose={() => setShowScanner(false)} className="max-w-lg" title="Scan QR Code">
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-brand-border bg-black">
              <Html5QrcodePlugin
                fps={10}
                qrbox={280}
                disableFlip={false}
                qrCodeSuccessCallback={onScanSuccess}
                onScanFailure={() => { }}
              />
            </div>
            <Button variant="outline" className="w-full text-brand-text" onClick={() => setShowScanner(false)}>
              <X size={18} />
              Tutup
            </Button>
          </div>
        </Modal>

        {/* Uncheck Confirmation Modal */}
        <Modal
          open={showUncheckModal && !!uncheckTarget}
          onClose={closeUncheckModal}
          title="Batalkan Check-in"
        >
          <div className="space-y-4">
            <p className="text-sm text-brand-textMuted">
              Check-in tamu <strong className="text-brand-text">{uncheckTarget?.name}</strong> akan dibatalkan. Hak undian tamu akan dicabut sampai check-in ulang.
            </p>
            {uncheckError && (
              <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-lg p-3 text-sm">
                {uncheckError}
              </div>
            )}
            <div>
              <Label className="text-xs uppercase tracking-wider text-brand-textMuted mb-1.5 block">Password Admin</Label>
              <Input type="password" value={uncheckPassword} onChange={(e) => { setUncheckPassword(e.target.value); setUncheckError(null); }} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-brand-textMuted mb-1.5 block">Alasan (min. 5 karakter)</Label>
              <Input value={uncheckReason} onChange={(e) => setUncheckReason(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={closeUncheckModal}>Batal</Button>
              <Button variant="danger" className="flex-1" onClick={doUncheckin} disabled={!uncheckPassword || uncheckReason.length < 5 || unchecking} loading={unchecking}>
                <XCircle size={16} />
                Konfirmasi
              </Button>
            </div>
          </div>
        </Modal>

        {/* Photo Capture Modal */}
        <Modal
          open={showPhotoCapture && !!checkedGuest}
          onClose={closePhotoCapture}
          title={`Ambil Foto: ${checkedGuest?.name}`}
        >
          <div className="space-y-4">
            <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
              {!capturedPhoto ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-3 justify-center">
              {!capturedPhoto ? (
                <>
                  <Button variant="outline" onClick={closePhotoCapture}><X size={18} /> Batal</Button>
                  <Button onClick={capturePhoto}><Camera size={18} /> Ambil Foto</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={retakePhoto}><Camera size={18} /> Ulangi</Button>
                  <Button onClick={uploadCapturedPhoto} loading={uploadingPhoto}>
                    {!uploadingPhoto && <CheckCircle size={18} />}
                    {uploadingPhoto ? 'Menyimpan...' : 'Simpan Foto'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </Modal>
        {/* Station Setup Modal */}
        <StationSetupModal
          isOpen={showStationSetup}
          onComplete={(config) => {
            setStationConfig(config);
            setShowStationSetup(false);
          }}
          existingConfig={stationConfig}
        />

        {/* Queue Management Panel */}
        <QueueManagementPanel
          isOpen={showQueuePanel}
          onClose={() => setShowQueuePanel(false)}
        />

        {/* Clear Cache Confirmation Modal */}
        <Modal
          open={showClearCacheModal}
          onClose={() => setShowClearCacheModal(false)}
          title="Hapus Cache Lokal"
          className="max-w-md"
          footer={
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setShowClearCacheModal(false)}>
                Batal
              </Button>
              <Button variant="danger" className="flex-1" onClick={executeClearCache}>
                Ya, Hapus
              </Button>
            </div>
          }
        >
          <p className="text-brand-textMuted">
            Apakah Anda yakin ingin menghapus semua cache tamu lokal di perangkat ini? Data yang tersimpan di server tidak akan terpengaruh.
          </p>
        </Modal>

        {/* Event Change Notification Banner */}
        {eventChangeNotif && (
          <div className="fixed bottom-4 right-4 z-[100] max-w-md p-4 rounded-xl bg-brand-warning/20 border border-brand-warning/30 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="flex-1 text-sm text-brand-warning">{eventChangeNotif}</div>
              <button onClick={() => setEventChangeNotif(null)} className="text-brand-warning/60 hover:text-brand-warning">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Pending Sync Alert Banner */}
        {pendingSyncAlert !== null && (
          <div className="fixed bottom-4 left-4 z-[100] max-w-md p-4 rounded-xl bg-brand-info/20 border border-brand-info/30 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="flex-1 text-sm text-brand-info">
                Anda masih memiliki {pendingSyncAlert} antrean sinkronisasi dari event sebelumnya. Harap pastikan perangkat terhubung ke internet agar sinkronisasi dapat selesai.
              </div>
              <button onClick={() => setPendingSyncAlert(null)} className="text-brand-info/60 hover:text-brand-info">
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}

// Helper component for html5-qrcode

const Html5QrcodePlugin = ({ qrCodeSuccessCallback, onScanFailure, fps, qrbox }: any) => {
  const [startError, setStartError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const uniqueIdRef = useRef(`reader-${Math.random().toString(36).slice(2)}`);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const elementId = uniqueIdRef.current;

    // Ensure element exists
    if (!document.getElementById(elementId)) return;

    const html5QrCode = new Html5Qrcode(elementId);
    scannerRef.current = html5QrCode;

    const config = { fps: fps || 10, qrbox: qrbox || 250 };

    // Start scanning
    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText, decodedResult) => {
        if (!isScanningRef.current) return;
        isScanningRef.current = false;

        html5QrCode.stop().then(() => {
          html5QrCode.clear();
          qrCodeSuccessCallback(decodedText, decodedResult);
        }).catch(err => {
          console.error("Failed to stop after scan", err);
          qrCodeSuccessCallback(decodedText, decodedResult);
        });
      },
      (errorMessage) => {
        if (onScanFailure) onScanFailure(errorMessage);
      }
    ).then(() => {
      isScanningRef.current = true;
    }).catch((err) => {
      console.error("Error starting QR scanner", err);
      setStartError(err?.message || "Gagal memulai kamera.");
    });

    return () => {
      isScanningRef.current = false;
      if (html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode.clear();
        }).catch(err => console.error(err));
      } else {
        html5QrCode.clear();
      }
    };
  }, []);

  const resizeImage = (file: File, maxWidth: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: file.type }));
            } else {
              reject(new Error("Canvas to Blob failed"));
            }
          }, file.type, 0.8);
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scannerRef.current) return;

    try {
      // Attempt 1: Original file
      await scannerRef.current.scanFileV2(file, false)
        .then((decodedText) => {
          qrCodeSuccessCallback(decodedText, null);
        });
    } catch (err: any) {
      console.warn("First scan attempt failed, retrying with resized image...", err);

      // Attempt 2: Resize image if it's likely too large
      try {
        const resizedFile = await resizeImage(file, 800); // Resize to max 800px width
        await scannerRef.current.scanFileV2(resizedFile, false)
          .then((decodedText) => {
            qrCodeSuccessCallback(decodedText, null);
          });
      } catch (retryErr: any) {
        console.error("Retry scan error:", retryErr);
        setStartError(`Gagal memindai QR Code: ${retryErr?.message || "Tidak ditemukan QR Code"}. Pastikan gambar jelas, pencahayaan cukup, dan QR Code terlihat utuh.`);
      }
    }
  };

  return (
    <div className="w-full">
      <div id={uniqueIdRef.current} className="w-full overflow-hidden rounded-lg bg-black border border-brand-border relative min-h-[300px]">
        {startError && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center bg-brand-bgElevated text-brand-text overflow-y-auto">
            <div className="max-h-full py-4">
              <p className="text-brand-danger font-semibold mb-2">Kamera Error</p>
              <p className="text-sm text-brand-textMuted mb-4">{startError}</p>
              <Button onClick={() => fileInputRef.current?.click()}>Buka Kamera / Upload</Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <button onClick={() => fileInputRef.current?.click()} className="text-sm text-brand-primary hover:text-brand-primarySoft font-medium">
          Masalah dengan kamera? Upload foto
        </button>
        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
      </div>

    </div>
  );
};
