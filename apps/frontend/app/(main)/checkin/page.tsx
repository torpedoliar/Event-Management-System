"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { apiBase, toApiUrl, parseErrorMessage } from "@/lib/api";
import { Search, QrCode, Loader2, CheckCircle, Users, X, XCircle, Settings, Camera, Monitor } from 'lucide-react';
import Label from '@/components/ui/Label';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import ScanHistory from '@/components/checkin/ScanHistory';
import CheckinResults from '@/components/checkin/CheckinResults';
import CheckinResultPopup from '@/components/checkin/CheckinResultPopup';
import Html5QrcodePlugin from '@/components/Html5QrcodePlugin';
import { usePopupTimeout } from '@/hooks/usePopupTimeout';
import { findCachedGuests, localGuestToGuest } from '@/lib/checkin/offline-lookup';
import CheckinHistory from '@/components/checkin/CheckinHistory';
import ClearCacheModal from '@/components/checkin/ClearCacheModal';
import { UncheckModal, PhotoCaptureModal } from '@/components/checkin/CheckinModals';
import SearchPanel from '@/components/checkin/SearchPanel';
import SettingsModal from '@/components/checkin/SettingsModal';
import CheckinHeader from '@/components/checkin/CheckinHeader';
import { EventChangeBanner, PendingSyncBanner } from '@/components/checkin/Banners';
import StationSetupModal from "@/components/StationSetupModal";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import QueueManagementPanel from "@/components/QueueManagementPanel";
import { indexedDBService, StationConfig as StationConfigType, LocalGuest } from "@/lib/indexeddb";
import { offlineSyncService } from "@/lib/offline-sync.service";
import { connectionStatusService } from "@/lib/connection-status";

import { useSSE } from "@/lib/sse-context";
import RequireAuth from "@/components/RequireAuth";
import { cleanQrContent, isNameSearchQuery } from "@/lib/checkin/qr";
import type { EventConfig, Guest, GuestCheckin, ScanLogItem } from "@/lib/checkin/types";

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
            setResults(data);
            appendLog(activeQuery, 'DUPLICATE', `Ditemukan ${data.length} tamu. Silakan pilih tamu di bawah.`);
            break;
          }
        } catch (e: any) {
          const matchedGuests = await findCachedGuests(indexedDBService, activeQuery);

          if (matchedGuests.length === 1) {
             const matchedGuest = matchedGuests[0];
             const guestFromCache = localGuestToGuest(matchedGuest);


             if (isNameSearchQuery(activeQuery)) {
               setResults([guestFromCache]);
               setPendingNameCheckin({ guest: guestFromCache, source: activeQuery, fromQueue: true });
               break;
             }
             
             // Check for duplicate check-in offline
             if (matchedGuest.checkedIn && !cfg?.allowMultipleCheckinPerCounter) {
               appendLog(activeQuery, 'DUPLICATE', 'Tamu sudah Check-In Offline sebelumnya.');
               setCheckedGuest(guestFromCache);
               setSelected(guestFromCache);
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
               ...guestFromCache,
               checkedIn: true,
               checkedInAt: new Date().toISOString(),
               checkinCount: (matchedGuest.checkinCount || 0) + 1,
             };
             setCheckedGuest(offlineGuest);
             setSelected(offlineGuest);
             setIsDuplicateCheckIn(false);
             refreshHistory();
             startPopupTimeout();
          } else if (matchedGuests.length > 1) {
             const guestResults: Guest[] = matchedGuests.map(localGuestToGuest);

             setResults(guestResults);
             appendLog(activeQuery, 'DUPLICATE', `Ditemukan ${matchedGuests.length} tamu (offline). Silakan pilih tamu di bawah.`);
             break;
          } else {
             appendLog(activeQuery, 'NOT_FOUND', 'Tamu tidak ditemukan dalam cache offline.');
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

  // Timer popup dikelola hook agar ikut dibersihkan saat komponen dilepas.
  const { start: startPopupTimeout, clear: clearPopupTimeout } = usePopupTimeout(
    cfg?.checkinPopupTimeoutMs ?? 5000,
    () => {
      setCheckedGuest(null);
      setIsDuplicateCheckIn(false);
    },
  );

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
            const guestFromCache: Guest = {
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

            if (isNameSearchQuery(searchQuery)) {
              setResults([guestFromCache]);
              setPendingNameCheckin({ guest: guestFromCache, source: searchQuery, fromQueue: false });
              return;
            }

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
              setResults([guestFromCache]);
              setSelected(guestFromCache);
              setCheckedGuest(guestFromCache);
              setIsDuplicateCheckIn(true);
              setQ('');
              startPopupTimeout();
              return;
            }

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
              photoUrl: g.photoUrl,
            }));
            setResults(guestResults);
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
      await doCheckinWrapperForQueue(pending.guest, true, pending.source);
    } else {
      await doCheckin(pending.guest, true);
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
      <div className="kiosk-shell relative min-h-[100dvh] w-full overflow-hidden">
        {/* Header */}
        <CheckinHeader
          cfg={cfg}
          currentAdmin={currentAdmin}
          stationConfig={stationConfig}
          cachedGuestCount={cachedGuestCount}
          onShowQueue={() => setShowQueuePanel(true)}
          onShowStationSetup={() => setShowStationSetup(true)}
        />

        {/* Search */}
        <SearchPanel
          value={q}
          onChange={setQ}
          onSubmit={() => {
            rapidQueueRef.current.push(q.trim());
            setQ('');
            processRapidQueue();
          }}
          inputRef={inputRef}
          scanLogs={rapidLogs}
          error={error}
          searching={searching}
          checking={checking}
          creatingGuest={creatingGuest}
          onSearch={doSearch}
          onScanClick={() => setShowScanner(true)}
          onSettingsClick={() => setShowSettings(true)}
        />

        {/* Settings Modal */}
        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          autoCreateGuest={autoCreateGuest}
          onAutoCreateChange={(checked) => {
            setAutoCreateGuest(checked);
            localStorage.setItem('checkinAutoCreateGuest', String(checked));
          }}
          enablePhotoCapture={enablePhotoCapture}
          onPhotoCaptureChange={(checked) => {
            setEnablePhotoCapture(checked);
            localStorage.setItem('checkinEnablePhotoCapture', String(checked));
          }}
          isAuth={isAuth}
          allowMultiplePerCounter={cfg?.allowMultipleCheckinPerCounter ?? false}
          onMultiplePerCounterChange={toggleMultipleCheckinPerCounter}
          savingEventSetting={savingEventSetting}
          onDownloadGuests={handleDownloadGuests}
          downloadingGuests={downloadingGuests}
          onClearCache={handleClearCache}
          downloadProgress={downloadProgress}
        />

        {/* Results */}
        <CheckinResults
          results={results}
          selectedId={selected?.id ?? null}
          checking={checking}
          checkingId={checkingId}
          allowMultiplePerCounter={cfg?.allowMultipleCheckinPerCounter}
          onCheckin={(g) => doCheckin(g, true)}
        />

        {/* History */}
        <CheckinHistory history={history} />

        <Modal
          open={!!pendingNameCheckin}
          onClose={cancelNameCheckin}
          title="Konfirmasi Check-in Tamu"
          description={`Hasil pencarian untuk "${pendingNameCheckin?.source ?? ''}". Pastikan identitas tamu sudah sesuai.`}
          footer={
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1" onClick={cancelNameCheckin} disabled={checking}>
                <X size={18} />
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
              <div className="flex items-center gap-4 rounded-xl border border-brand-primary/30 bg-brand-primary/10 p-4">
                <div className="h-16 w-16 rounded-xl bg-brand-text/5 overflow-hidden flex-shrink-0 border border-brand-primary/20">
                  {pendingNameCheckin.guest.photoUrl ? (
                    <img src={toApiUrl(pendingNameCheckin.guest.photoUrl)} className="h-full w-full object-cover" alt={pendingNameCheckin.guest.name} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Users size={28} className="text-brand-primary" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase tracking-wider text-brand-primary font-semibold">Tamu Ditemukan</div>
                  <div className="text-xl md:text-2xl font-bold text-brand-text leading-tight truncate">{pendingNameCheckin.guest.name}</div>
                  <div className="mt-1 flex items-center gap-2">
                    {pendingNameCheckin.guest.checkedIn ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-brand-warning/20 text-brand-warning border border-brand-warning/30 font-medium">
                        Sudah Pernah Check-in ({pendingNameCheckin.guest.checkinCount || 1}x)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-brand-success/20 text-brand-success border border-brand-success/30 font-medium">
                        Belum Check-in
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-brand-bgSubtle rounded-xl border border-brand-border text-center">
                <p className="text-sm font-medium text-brand-text">
                  Apakah benar <span className="font-bold text-brand-primary">{pendingNameCheckin.guest.name}</span> ini yang mau check-in?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-brand-bgSubtle/50 p-3 rounded-xl border border-brand-border/60">
                <div>
                  <div className="text-xs uppercase tracking-wider text-brand-textMuted">ID Tamu</div>
                  <div className="font-mono font-semibold text-brand-primary mt-0.5">{pendingNameCheckin.guest.guestId}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-brand-textMuted">Meja / Ruangan</div>
                  <div className="font-semibold text-brand-text mt-0.5">{pendingNameCheckin.guest.tableLocation || '-'}</div>
                </div>
                {pendingNameCheckin.guest.company && (
                  <div className="sm:col-span-2 pt-1 border-t border-brand-border/40">
                    <div className="text-xs uppercase tracking-wider text-brand-textMuted">Perusahaan / Instansi</div>
                    <div className="font-semibold text-brand-text mt-0.5">
                      {pendingNameCheckin.guest.company}
                      {pendingNameCheckin.guest.division && <span className="text-brand-textMuted font-normal"> • {pendingNameCheckin.guest.division}</span>}
                    </div>
                  </div>
                )}
                {pendingNameCheckin.guest.notes && (
                  <div className="sm:col-span-2 pt-1 border-t border-brand-border/40">
                    <div className="text-xs uppercase tracking-wider text-brand-warning font-medium">Catatan</div>
                    <div className="text-xs text-brand-warning italic mt-0.5">{pendingNameCheckin.guest.notes}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Confirmation full display */}
        <CheckinResultPopup
          guest={checkedGuest}
          isDuplicate={isDuplicateCheckIn}
          autoCapturing={autoCapturing}
          autoCaptureStatus={autoCaptureStatus}
          videoRef={autoVideoRef}
          canvasRef={autoCanvasRef}
          enablePhotoCapture={enablePhotoCapture}
          isAuth={isAuth}
          unchecking={unchecking}
          onClose={() => { setCheckedGuest(null); setIsDuplicateCheckIn(false); clearPopupTimeout(); }}
          onPhotoCapture={() => { clearPopupTimeout(); setShowPhotoCapture(true); startCamera(); }}
          onUncheck={openUncheckModal}
        />

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
        <UncheckModal
          open={showUncheckModal && !!uncheckTarget}
          targetName={uncheckTarget?.name}
          error={uncheckError}
          password={uncheckPassword}
          onPasswordChange={(v) => { setUncheckPassword(v); setUncheckError(null); }}
          reason={uncheckReason}
          onReasonChange={setUncheckReason}
          onClose={closeUncheckModal}
          onConfirm={doUncheckin}
          submitting={unchecking}
        />

        {/* Photo Capture Modal */}
        <PhotoCaptureModal
          open={showPhotoCapture && !!checkedGuest}
          guestName={checkedGuest?.name}
          capturedPhoto={capturedPhoto}
          videoRef={videoRef}
          canvasRef={canvasRef}
          onClose={closePhotoCapture}
          onCapture={capturePhoto}
          onRetake={retakePhoto}
          onUpload={uploadCapturedPhoto}
          uploading={uploadingPhoto}
        />
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
        <ClearCacheModal
          open={showClearCacheModal}
          onCancel={() => setShowClearCacheModal(false)}
          onConfirm={executeClearCache}
        />

        {/* Event Change Notification Banner */}
        <EventChangeBanner
          message={eventChangeNotif}
          onDismiss={() => setEventChangeNotif(null)}
        />

        {/* Pending Sync Alert Banner */}
        <PendingSyncBanner
          count={pendingSyncAlert}
          onDismiss={() => setPendingSyncAlert(null)}
        />
      </div>
    </RequireAuth>
  );
}
