"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { apiBase, apiFetch, parseErrorMessage } from "@/lib/api";
import { Html5Qrcode } from "html5-qrcode";
import { Search, QrCode, Loader2, CheckCircle, Clock, X, Gift, XCircle, Package, UserPlus, Settings, UserCheck } from 'lucide-react';
import { useSSE } from "@/lib/sse-context";
import { indexedDBService, LocalGuest } from "@/lib/indexeddb";
import { offlineSyncService } from "@/lib/offline-sync.service";
import { connectionStatusService } from "@/lib/connection-status";
import QueueManagementPanel from "@/components/QueueManagementPanel";
import StationSetupModal from "@/components/StationSetupModal";
import PrizeReceiptModal from "@/components/PrizeReceiptModal";
import Html5QrcodePlugin from "@/components/Html5QrcodePlugin";

import type { EventConfig, SouvenirTakeInfo, Guest, PrizeWin, Souvenir } from '@/lib/souvenir/types';
import SouvenirHistory from '@/components/souvenir/SouvenirHistory';
import { SouvenirConfirmation, SouvenirAlreadyTaken } from '@/components/souvenir/SouvenirPopups';
import SouvenirResults from '@/components/souvenir/SouvenirResults';
import PrizeCollection from '@/components/souvenir/PrizeCollection';
import SouvenirHeader from '@/components/souvenir/SouvenirHeader';
import SouvenirSelector from '@/components/souvenir/SouvenirSelector';

export default function SouvenirPage() {
    const [cfg, setCfg] = useState<EventConfig | null>(null);
    const [preview, setPreview] = useState<Partial<EventConfig> | null>(null);
    const [q, setQ] = useState("");
    const [results, setResults] = useState<Guest[]>([]);
    const [selected, setSelected] = useState<Guest | null>(null);
    const [checkedGuest, setCheckedGuest] = useState<Guest | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<Guest[]>([]); // Local history of souvenir takes
    const popupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Prize collection states
    const [prizeWins, setPrizeWins] = useState<PrizeWin[]>([]);
    const [loadingPrizes, setLoadingPrizes] = useState(false);
    const [collectingPrize, setCollectingPrize] = useState<string | null>(null);
    const [showPrizes, setShowPrizes] = useState(true);

    // Receipt Modal State
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedReceiptPrizeWin, setSelectedReceiptPrizeWin] = useState<PrizeWin | null>(null);

    // Souvenir inventory states
    const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
    const [loadingSouvenirs, setLoadingSouvenirs] = useState(false);
    const [selectedSouvenir, setSelectedSouvenir] = useState<string>('');
    const [showSouvenirSelect, setShowSouvenirSelect] = useState(false);

    // Overlay customization
    const [bgMode, setBgMode] = useState<'CONFIG' | 'NONE' | 'IMAGE' | 'VIDEO'>('CONFIG');
    const [overlayOverride, setOverlayOverride] = useState<number | null>(null);

    const [searching, setSearching] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [autoCreateGuest, setAutoCreateGuest] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [creatingGuest, setCreatingGuest] = useState(false);
    const [requireCheckinForSouvenir, setRequireCheckinForSouvenir] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [alreadyTakenInfo, setAlreadyTakenInfo] = useState<{ guest: Guest; takes: SouvenirTakeInfo[] } | null>(null);
    
    // Offline mode state
    const [showStationSetup, setShowStationSetup] = useState(false);
    const [showQueuePanel, setShowQueuePanel] = useState(false);
    const [stationConfig, setStationConfig] = useState<any>(null);
    const [pendingSouvCount, setPendingSouvCount] = useState(0);
    const [cachedGuestCount, setCachedGuestCount] = useState(0);

    type ScanLogItem = {
        id: string;
        guestIdOrName: string;
        status: 'SUCCESS' | 'DUPLICATE' | 'NOT_FOUND' | 'ERROR';
        message: string;
        timestamp: Date;
    };
    const rapidQueueRef = useRef<string[]>([]);
    const isProcessingQueueRef = useRef<boolean>(false);
    const [rapidLogs, setRapidLogs] = useState<ScanLogItem[]>([]);

    const appendLog = (query: string, status: ScanLogItem['status'], message: string) => {
        setRapidLogs(prev => {
            const newLog: ScanLogItem = { id: Math.random().toString(), guestIdOrName: query, status, message, timestamp: new Date() };
            const logs = [newLog, ...prev];
            if (logs.length > 20) logs.length = 20;
            return logs;
        });
    };

    const processRapidQueue = async () => {
        if (isProcessingQueueRef.current) return;
        isProcessingQueueRef.current = true;
        try {
            while (rapidQueueRef.current.length > 0) {
                const activeQuery = rapidQueueRef.current.shift();
                if (!activeQuery) continue;
                
                if (!selectedSouvenir) {
                    appendLog(activeQuery, 'ERROR', 'Souvenir belum dipilih!');
                    continue;
                }

                const params = new URLSearchParams();
                params.set('guestId', activeQuery);
                params.set('name', activeQuery);
                if (/[\d\-]/.test(activeQuery) || /^[A-Z0-9_\-]+$/.test(activeQuery)) params.set('exact', 'true');

                const isCurrentlyOffline = connectionStatusService.getStatus() !== 'online';
                
                try {
                    if (isCurrentlyOffline && stationConfig) throw new Error('OfflineMode');

                    const controller = new AbortController();
                    const res = await fetch(`${apiBase()}/public/guests/search?${params.toString()}`, { signal: controller.signal });
                    if (!res.ok) throw new Error(parseErrorMessage(await res.text()));
                    
                    const data = await res.json();
                    
                    if (data.length === 1) {
                        const guest = data[0];
                        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                        const prizeRes = await fetch(`${apiBase()}/souvenirs/prizes/guest/${guest.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                        const prizeData = prizeRes.ok ? await prizeRes.json() : null;
                        const hasUncollectedPrizes = prizeData && prizeData.some((pw: any) => !pw.collection);

                        if (!hasUncollectedPrizes) {
                            const giveRes = await fetch(`${apiBase()}/souvenirs/give`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ guestId: guest.id, souvenirId: selectedSouvenir })
                            });

                            if (!giveRes.ok) {
                                const err = await giveRes.json();
                                if (err.alreadyTaken) appendLog(activeQuery, 'DUPLICATE', 'Sudah mengambil souvenir.');
                                else throw new Error(err.message || 'Gagal server');
                            } else {
                                appendLog(activeQuery, 'SUCCESS', 'Souvenir Server Sukses');
                            }
                        } else {
                            appendLog(activeQuery, 'ERROR', 'Tamu memiliki hadiah belum diambil.');
                        }
                    } else if (data.length === 0) {
                        if (autoCreateGuest) {
                             const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                             const cRes = await fetch(`${apiBase()}/souvenirs/give-create`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ guestIdOrName: activeQuery, souvenirId: selectedSouvenir })
                            });
                            if (!cRes.ok) throw new Error('Gagal buat & beri souvenir');
                            appendLog(activeQuery, 'SUCCESS', 'Buat & Souvenir Tuntas');
                        } else {
                            appendLog(activeQuery, 'NOT_FOUND', 'Tamu tidak ditemukan.');
                        }
                    } else {
                        appendLog(activeQuery, 'ERROR', `Ditemukan ${data.length}. Butuh manual klik.`);
                    }
                } catch (e: any) {
                    let matchedGuests: any[] = [];
                    const exactMatch = await indexedDBService.getCachedGuestByGuestId(activeQuery);
                    if (exactMatch) {
                        matchedGuests = [exactMatch];
                    } else {
                        const cachedGuests = await indexedDBService.getAllCachedGuests();
                        for (const g of cachedGuests) {
                            if (g.guestId.toLowerCase() === activeQuery.toLowerCase() || g.name.toLowerCase() === activeQuery.toLowerCase()) {
                                matchedGuests.push(g);
                            }
                        }
                    }
                    if (matchedGuests.length === 1) {
                        const matchedGuest = matchedGuests[0];
                        if (matchedGuest.souvenirTaken) {
                            appendLog(activeQuery, 'DUPLICATE', 'Sudah ambil offline.');
                        } else {
                            await offlineSyncService.addPendingSouvenir(matchedGuest.guestId, selectedSouvenir);
                            await indexedDBService.updateCachedGuest(matchedGuest.id, { souvenirTaken: true });
                            appendLog(activeQuery, 'SUCCESS', 'Souvenir Offline Sukses');
                        }
                    } else {
                        appendLog(activeQuery, 'NOT_FOUND', 'Offline ID tidak logis.');
                    }
                }
                await new Promise(res => setTimeout(res, 50));
            }
        } finally {
            isProcessingQueueRef.current = false;
            debouncedLoadSouvenirs();
        }
    };

    const inputRef = useRef<HTMLInputElement>(null);
    const searchAbortRef = useRef<AbortController | null>(null);
    const debouncedLoadRef = useRef<NodeJS.Timeout | null>(null);
    const { addEventListener, removeEventListener, connected } = useSSE();

    // Debounced loadSouvenirs — collapses rapid calls into one (2s window)
    const debouncedLoadSouvenirs = useCallback(() => {
        if (debouncedLoadRef.current) clearTimeout(debouncedLoadRef.current);
        debouncedLoadRef.current = setTimeout(() => {
            loadSouvenirs();
            debouncedLoadRef.current = null;
        }, 2000);
    }, []);

    // Initialize offline mode on mount
    useEffect(() => {
        const initOfflineMode = async () => {
            try {
                // Load station config from IndexedDB
                const config = await indexedDBService.getStationConfig();
                if (config) {
                    setStationConfig(config);
                    // Initialize sync service
                    await offlineSyncService.init(config.stationId, config.stationName, 30);
                } else {
                    // Show station setup on first visit if we're in offline-capable environment
                    setShowStationSetup(true);
                }
            } catch (err) {
                console.error('Failed to init offline mode:', err);
            }
        };

        initOfflineMode();
        
        // Initial guest count
        indexedDBService.getAllCachedGuests().then(guests => setCachedGuestCount(guests.length)).catch(() => {});

        // Listen to souvenir queue changes
        const unsubQueue = offlineSyncService.addSouvenirQueueListener((count) => {
            setPendingSouvCount(count);
        });

        // Listen to sync results to refresh data
        const unsubSync = offlineSyncService.addSouvenirSyncListener((result) => {
            if (result.successCount > 0) {
                loadSouvenirs();
            }
        });

        // Cleanup on unmount
        return () => {
            unsubQueue();
            unsubSync();
            offlineSyncService.destroy();
        };
    }, []);

    useEffect(() => {
        fetch(`${apiBase()}/config/event`).then(async (r) => {
            const data = await r.json();
            setCfg(data);
            // Load auto-create setting from localStorage or config
            const savedAutoCreate = localStorage.getItem('souvenirAutoCreateGuest');
            if (savedAutoCreate !== null) {
                setAutoCreateGuest(savedAutoCreate === 'true');
            } else if (data.autoCreateGuestOnSouvenir) {
                setAutoCreateGuest(data.autoCreateGuestOnSouvenir);
            }
            // Load requireCheckinForSouvenir from event config
            if (data.requireCheckinForSouvenir !== undefined) {
                setRequireCheckinForSouvenir(data.requireCheckinForSouvenir);
            }
        });
        loadSouvenirs();

        // Real-time updates for souvenir inventory
        let timeout: NodeJS.Timeout;
        const onSouvenirChange = () => {
            clearTimeout(timeout);
            timeout = setTimeout(loadSouvenirs, 500);
        };

        const onEventChange = () => {
            // Reload all data when event changes
            fetch(`${apiBase()}/config/event`).then(async (r) => {
                const data = await r.json();
                setCfg(data);
            }).catch(() => { });
            loadSouvenirs();
            setQ('');
            setPrizeWins([]);

            // Implement cache clearing for the new event
            indexedDBService.clearEventCaches().then(async () => {
                setCachedGuestCount(0);
                setSouvenirs([]); // Clear souvenirs state too

                // Alert the operator
                alert("Event aktif telah diubah oleh Admin. Cache tamu lokal telah dikosongkan. Harap download ulang data tamu dan souvenir untuk akses offline event yang baru.");

                // Check for pending souvenir queue from previous event
                const pendingCount = await indexedDBService.getPendingSouvenirCount();
                if (pendingCount > 0) {
                    alert(`Anda masih memiliki ${pendingCount} antrean sinkronisasi souvenir dari event sebelumnya. Harap pastikan perangkat terhubung ke internet agar sinkronisasi dapat selesai.`);
                }
            }).catch(err => {
                console.error('Failed to clear event caches:', err);
            });
        };

        const onGuestUpdate = (e: MessageEvent) => {
            try {
                const data = JSON.parse(e.data);
                if (data && data.action === 'bulk-delete') {
                    indexedDBService.clearGuestCache().then(() => {
                        setCachedGuestCount(0);
                        console.log('[SouvenirPage] Guest cache automatically cleared due to bulk-delete action from server.');
                    }).catch(err => {
                        console.error('[SouvenirPage] Failed to clear guest cache on bulk-delete:', err);
                    });
                }
            } catch (err) { }
        };

        addEventListener('souvenir_given', onSouvenirChange);
        addEventListener('souvenir_removed', onSouvenirChange);
        addEventListener('souvenir_reset', onSouvenirChange);
        addEventListener('guest_created_souvenir', onSouvenirChange);
        addEventListener('prize_collected', onSouvenirChange);
        addEventListener('prize_uncollected', onSouvenirChange);
        addEventListener('event_change', onEventChange);
        addEventListener('guest-update', onGuestUpdate);

        return () => {
            removeEventListener('souvenir_given', onSouvenirChange);
            removeEventListener('souvenir_removed', onSouvenirChange);
            removeEventListener('souvenir_reset', onSouvenirChange);
            removeEventListener('guest_created_souvenir', onSouvenirChange);
            removeEventListener('prize_collected', onSouvenirChange);
            removeEventListener('prize_uncollected', onSouvenirChange);
            removeEventListener('event_change', onEventChange);
            removeEventListener('guest-update', onGuestUpdate);
            clearTimeout(timeout);
        };
    }, [addEventListener, removeEventListener]);

    const loadSouvenirs = async () => {
        setLoadingSouvenirs(true);
        try {
            if (connectionStatusService.getStatus() !== 'online') {
                const cached = await indexedDBService.getAllCachedSouvenirs();
                setSouvenirs(cached as any);
                const available = cached.find((s) => s.remaining > 0);
                if (available) setSelectedSouvenir(available.id);
                setLoadingSouvenirs(false);
                return;
            }

            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) return;
            const res = await fetch(`${apiBase()}/souvenirs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSouvenirs(data);
                indexedDBService.cacheSouvenirsBulk(data).catch(() => {});
                // Auto-select first available souvenir
                const available = data.find((s: Souvenir) => s.remaining > 0);
                if (available) setSelectedSouvenir(available.id);
            }
        } catch (e) {
            console.error('Failed to load souvenirs', e);
            const cached = await indexedDBService.getAllCachedSouvenirs();
            setSouvenirs(cached as any);
            const available = cached.find((s) => s.remaining > 0);
            if (available) setSelectedSouvenir(available.id);
        } finally {
            setLoadingSouvenirs(false);
        }
    };

    const loadGuestPrizes = async (guestId: string) => {
        setLoadingPrizes(true);
        setPrizeWins([]);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) return;
            const res = await fetch(`${apiBase()}/souvenirs/prizes/guest/${guestId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPrizeWins(data);
            }
        } catch (e) {
            console.error('Failed to load prizes', e);
        } finally {
            setLoadingPrizes(false);
        }
    };

    // Load guest prizes and return the data (for checking before auto-give souvenir)
    const loadGuestPrizesAndReturn = async (guestId: string): Promise<PrizeWin[] | null> => {
        setLoadingPrizes(true);
        setPrizeWins([]);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) return null;
            const res = await fetch(`${apiBase()}/souvenirs/prizes/guest/${guestId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPrizeWins(data);
                return data;
            }
            return null;
        } catch (e) {
            console.error('Failed to load prizes', e);
            return null;
        } finally {
            setLoadingPrizes(false);
        }
    };

    const effectiveOverlay = overlayOverride ?? preview?.overlayOpacity ?? cfg?.overlayOpacity ?? 0.5;
    const overlayStyle = useMemo(() => ({
        backgroundColor: `rgba(0,0,0,${effectiveOverlay})`,
    }), [effectiveOverlay]);

    const createAndGiveSouvenir = async (guestIdOrName: string) => {
        if (!selectedSouvenir) {
            setError('Pilih souvenir terlebih dahulu');
            return;
        }
        setCreatingGuest(true);
        setError(null);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) throw new Error('Login diperlukan');

            const res = await fetch(`${apiBase()}/souvenirs/give-create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    guestIdOrName: guestIdOrName.trim(),
                    souvenirId: selectedSouvenir
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Gagal membuat tamu dan memberikan souvenir');
            }

            const result = await res.json();
            const newGuest = result.guest;

            setResults([newGuest]);
            setSelected(newGuest);
            setCheckedGuest({ ...newGuest, souvenirTaken: true });
            addToHistory({ ...newGuest, souvenirTaken: true });
            setQ('');

            if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
            const ms = cfg?.checkinPopupTimeoutMs ?? 3000;
            popupTimeoutRef.current = setTimeout(() => {
                setCheckedGuest(null);
                popupTimeoutRef.current = null;
            }, ms);

            loadSouvenirs();
            setTimeout(() => inputRef.current?.focus(), 100);
        } catch (e: any) {
            setError(e.message || 'Gagal membuat tamu');
        } finally {
            setCreatingGuest(false);
        }
    };

    const doSearch = async () => {
        setError(null);
        setSelected(null);
        setCheckedGuest(null);
        setAlreadyTakenInfo(null);
        setPrizeWins([]);
        if (!q.trim()) return;

        const searchTerm = q.trim();
        const looksLikeId = /[\d\-]/.test(searchTerm) || /^[A-Z0-9_\-]+$/.test(searchTerm);

        setSearching(true);
        // Cancel any in-flight search to prevent stale results
        if (searchAbortRef.current) searchAbortRef.current.abort();
        const controller = new AbortController();
        searchAbortRef.current = controller;

        const isOffline = connectionStatusService.getStatus() !== 'online';

        try {
            let data: Guest[] = [];

            if (isOffline) {
                // ═══ OFFLINE PATH: Search from IndexedDB cache ═══
                const exactMatch = await indexedDBService.getCachedGuestByGuestId(searchTerm);
                if (exactMatch) {
                    data = [exactMatch as any];
                } else {
                    // Fuzzy search by name or guestId in local cache
                    const allCached = await indexedDBService.getAllCachedGuests();
                    const lower = searchTerm.toLowerCase();
                    data = allCached.filter((g: any) =>
                        g.guestId?.toLowerCase() === lower ||
                        g.name?.toLowerCase().includes(lower)
                    ).slice(0, 20) as any;
                }
            } else {
                // ═══ ONLINE PATH: Search from server ═══
                const params = new URLSearchParams();
                params.set('guestId', searchTerm);
                params.set('name', searchTerm);
                if (looksLikeId) params.set('exact', 'true');

                const res = await fetch(`${apiBase()}/public/guests/search?${params.toString()}`, {
                    signal: controller.signal
                });
                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(parseErrorMessage(errorText));
                }
                data = await res.json();
            }

            setResults(data);

            if (data.length > 0) {
                // If exact match or single result
                if (data.length === 1) {
                    const guest = data[0];
                    setSelected(guest);

                    if (isOffline) {
                        // Offline: skip prize check (no server), just give souvenir
                        if (selectedSouvenir) {
                            await giveSouvenir(guest, selectedSouvenir);
                            setQ('');
                            setTimeout(() => inputRef.current?.focus(), 100);
                        }
                    } else {
                        // Online: check prizes first, then give souvenir
                        const prizePromise = loadGuestPrizesAndReturn(guest.id);

                        if (selectedSouvenir) {
                            const prizeData = await prizePromise;
                            const hasUncollectedPrizes = prizeData && prizeData.some((pw: any) => !pw.collection);

                            if (!hasUncollectedPrizes) {
                                await giveSouvenir(guest, selectedSouvenir);
                                setQ('');
                                setTimeout(() => inputRef.current?.focus(), 100);
                            } else {
                                setError('Tamu ini memiliki hadiah yang belum diambil. Silakan ambil hadiah terlebih dahulu.');
                            }
                        }
                    }
                }
                // If multiple results, let user choose manually
            } else {
                // Guest not found - offer to create if setting is enabled
                if (!isOffline && autoCreateGuest) {
                    await createAndGiveSouvenir(searchTerm);
                } else {
                    setError(isOffline ? 'Tamu tidak ditemukan di cache offline' : 'Tamu tidak ditemukan');
                    setQ('');
                }
            }
        } catch (e: any) {
            // Network failure fallback: try offline search
            if (!isOffline && e.name !== 'AbortError') {
                try {
                    const exactMatch = await indexedDBService.getCachedGuestByGuestId(searchTerm);
                    if (exactMatch) {
                        const guest = exactMatch as any;
                        setResults([guest]);
                        setSelected(guest);
                        if (selectedSouvenir) {
                            await giveSouvenir(guest, selectedSouvenir);
                            setQ('');
                        }
                        return;
                    }
                } catch (_) { /* IndexedDB also failed, show original error */ }
            }
            setError(e.message || 'Gagal mencari tamu');
        } finally {
            setSearching(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const selectGuest = (g: Guest) => {
        setSelected(g);
        loadGuestPrizes(g.id);
    };

    const collectPrize = async (prizeWinnerId: string) => {
        setCollectingPrize(prizeWinnerId);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) throw new Error('Login diperlukan');

            const res = await fetch(`${apiBase()}/souvenirs/prizes/collect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    prizeWinnerId,
                    collectedByName: 'Operator'
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Gagal mengambil hadiah');
            }

            // Refresh prize wins
            if (selected) {
                await loadGuestPrizes(selected.id);
            }
        } catch (e: any) {
            setError(e.message || 'Gagal mengambil hadiah');
        } finally {
            setCollectingPrize(null);
        }
    };

    const giveSouvenir = async (g: Guest, souvenirId: string) => {
        setError(null);
        setProcessing(true);
        setProcessingId(g.id);
        try {
            if (connectionStatusService.getStatus() !== 'online') {
                // Offline claiming
                await offlineSyncService.addPendingSouvenir(g.guestId, souvenirId);
                
                const newResults = results.map(r => r.id === g.id ? { ...r, souvenirTaken: true } : r);
                setResults(newResults);
                if (selected?.id === g.id) {
                    setSelected({ ...selected, souvenirTaken: true });
                }

                // Update local cache
                await indexedDBService.updateCachedGuest(g.id, { souvenirTaken: true });

                // Optimistically update souvenir count
                const newSouvenirs = souvenirs.map(s => s.id === souvenirId ? { ...s, remaining: s.remaining - 1, takenCount: s.takenCount + 1 } : s);
                setSouvenirs(newSouvenirs);
                indexedDBService.cacheSouvenirsBulk(newSouvenirs as any).catch(() => {});

                setCheckedGuest({ ...g, souvenirTaken: true });
                addToHistory({ ...g, souvenirTaken: true });

                if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
                const ms = cfg?.checkinPopupTimeoutMs ?? 3000;
                popupTimeoutRef.current = setTimeout(() => {
                    setCheckedGuest(null);
                    popupTimeoutRef.current = null;
                }, ms);
                
                setShowSouvenirSelect(false);
                return;
            }

            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) throw new Error('Login diperlukan');

            const res = await fetch(`${apiBase()}/souvenirs/give`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ guestId: g.id, souvenirId })
            });

            if (!res.ok) {
                const err = await res.json();
                // Check if this is an "already taken" error with previous takes info
                if (err.alreadyTaken && err.previousTakes) {
                    setAlreadyTakenInfo({ guest: g, takes: err.previousTakes });
                    return;
                }
                throw new Error(err.message || 'Gagal memberikan souvenir');
            }

            const updated = await res.json();

            // Update guest's souvenirTaken status
            const newResults = results.map(r => r.id === g.id ? { ...r, souvenirTaken: true } : r);
            setResults(newResults);
            if (selected?.id === g.id) {
                setSelected({ ...selected, souvenirTaken: true });
            }

            // Show confirmation
            setCheckedGuest({ ...g, souvenirTaken: true });
            addToHistory({ ...g, souvenirTaken: true });

            if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
            const ms = cfg?.checkinPopupTimeoutMs ?? 3000;
            popupTimeoutRef.current = setTimeout(() => {
                setCheckedGuest(null);
                popupTimeoutRef.current = null;
            }, ms);

            // Reload souvenirs to update stock (debounced, fire-and-forget)
            debouncedLoadSouvenirs();
        } catch (e: any) {
            setError(e.message || 'Gagal memproses souvenir');
        } finally {
            setProcessing(false);
            setProcessingId(null);
            setShowSouvenirSelect(false);
        }
    };

    const toggleSouvenir = async (g: Guest) => {
        // If souvenirs inventory exists, show selection
        if (souvenirs.length > 0 && !g.souvenirTaken) {
            setSelected(g);
            setShowSouvenirSelect(true);
            return;
        }

        // Legacy mode - just toggle flag
        setError(null);
        setProcessing(true);
        setProcessingId(g.id);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const newStatus = !g.souvenirTaken;
            const res = await fetch(`${apiBase()}/guests/${g.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ souvenirTaken: newStatus })
            });

            if (!res.ok) throw new Error('Gagal update status souvenir');
            const updated = await res.json();

            // Update local state
            const newResults = results.map(r => r.id === updated.id ? updated : r);
            setResults(newResults);
            setSelected(updated);

            if (newStatus) {
                // Only show popup if taking souvenir
                setCheckedGuest(updated);
                addToHistory(updated);

                if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
                const ms = cfg?.checkinPopupTimeoutMs ?? 3000;
                popupTimeoutRef.current = setTimeout(() => {
                    setCheckedGuest(null);
                    popupTimeoutRef.current = null;
                }, ms);
            }
        } catch (e: any) {
            setError(e.message || 'Gagal memproses souvenir');
        } finally {
            setProcessing(false);
            setProcessingId(null);
        }
    };

    const addToHistory = (g: Guest) => {
        setHistory(prev => {
            const filtered = prev.filter(h => h.id !== g.id);
            return [g, ...filtered].slice(0, 10);
        });
    };

    // Effective background mode
    const pageBgType = (preview?.backgroundType as EventConfig['backgroundType'] | undefined) ?? cfg?.backgroundType;
    const pageBgImage = preview?.backgroundImageUrl ?? cfg?.backgroundImageUrl;
    const pageBgVideo = preview?.backgroundVideoUrl ?? cfg?.backgroundVideoUrl;

    const onScanSuccess = async (decodedText: string, decodedResult: any) => {
        setShowScanner(false);
        setQ(decodedText);

        // Auto search and process
        setSearching(true);
        setPrizeWins([]);
        setError(null);
        setCheckedGuest(null);
        setAlreadyTakenInfo(null);
        try {
            if (connectionStatusService.getStatus() !== 'online') {
                const cachedGuest = await indexedDBService.getCachedGuestByGuestId(decodedText.trim());
                if (cachedGuest) {
                    const guest = cachedGuest as any;
                    setResults([guest]);
                    setSelected(guest);

                    if (selectedSouvenir) {
                        await giveSouvenir(guest, selectedSouvenir);
                        setQ('');
                        setTimeout(() => inputRef.current?.focus(), 100);
                    }
                } else {
                    setError('QR Code tidak dikenali (Mode Offline)');
                    setQ('');
                }
                return;
            }

            // 1. Try search by ID/GuestID
            const params = new URLSearchParams();
            params.set('guestId', decodedText);
            params.set('name', decodedText);
            params.set('exact', 'true'); // Flag to skip fuzzy fallback on backend
            const res = await fetch(`${apiBase()}/public/guests/search?${params.toString()}`);
            const data = await res.json();

            if (data && data.length === 1) {
                const guest = data[0] as Guest;
                setResults([guest]);
                setSelected(guest);

                // Load prize wins first to check if guest has uncollected prizes
                const prizeData = await loadGuestPrizesAndReturn(guest.id);
                const hasUncollectedPrizes = prizeData && prizeData.some((pw: any) => !pw.collection);

                // Only auto-give souvenir if guest has NO uncollected prizes
                if (selectedSouvenir && !hasUncollectedPrizes) {
                    await giveSouvenir(guest, selectedSouvenir);
                    setQ('');
                    setTimeout(() => inputRef.current?.focus(), 100);
                } else if (hasUncollectedPrizes) {
                    // Guest has prizes - show message
                    setError('Tamu ini memiliki hadiah yang belum diambil. Silakan ambil hadiah terlebih dahulu.');
                }
            } else if (data && data.length > 1) {
                // Multiple results - show list for manual selection
                setResults(data);
            } else {
                // Guest not found
                if (autoCreateGuest) {
                    await createAndGiveSouvenir(decodedText.trim());
                } else {
                    setError('QR Code tidak dikenali atau tamu tidak ditemukan');
                    setQ('');
                }
            }
        } catch (e: any) {
            setError('Gagal memproses QR Code');
        } finally {
            setSearching(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    // Count uncollected prizes
    const uncollectedPrizes = prizeWins.filter(pw => !pw.collection);
    const collectedPrizes = prizeWins.filter(pw => pw.collection);

    return (
        <div className="kiosk-shell relative min-h-screen w-full overflow-hidden">
            {/* Header brand */}
            <SouvenirHeader
                logoUrl={cfg?.logoUrl}
                eventName={cfg?.name}
                connected={connected}
                cachedGuestCount={cachedGuestCount}
                onShowQueue={() => setShowQueuePanel(true)}
            />

            {/* Search */}
            <div className="relative z-10 p-6 flex flex-col items-center">
                <div className="w-full max-w-3xl">
                    {/* Souvenir Selector Dropdown */}
                    <SouvenirSelector
                        souvenirs={souvenirs}
                        selectedId={selectedSouvenir}
                        onSelect={setSelectedSouvenir}
                        disabled={searching || processing || creatingGuest}
                    />

                    <div className="kiosk-field">
                        <span className="kiosk-field-icon">
                            <Search size={21} aria-hidden="true" />
                        </span>
                        <input
                            ref={inputRef}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    doSearch();
                                }
                            }}
                            placeholder="Pindai QR, atau ketik ID / nama tamu"
                            className="kiosk-input"
                            autoFocus
                        />
                        <kbd className="kiosk-kbd">Enter</kbd>
                    </div>

                    {rapidLogs.length > 0 && (
                        <div className="relative z-10 mt-4 flex flex-col items-center">
                            <div className="w-full surface p-4 md:p-6 text-sm text-brand-text overflow-y-auto max-h-48 border border-brand-border rounded-xl">
                                <h3 className="text-brand-text font-semibold mb-3">Rapid Scan Logs</h3>
                                <ul className="space-y-2">
                                    {rapidLogs.map((log) => (
                                        <li key={log.id} className="flex justify-between items-center bg-brand-bgSubtle px-3 py-2 rounded-lg">
                                            <div className="flex gap-3">
                                                <span className="text-brand-textDim">{log.timestamp.toLocaleTimeString()}</span>
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
                        </div>
                    )}

                    {error && (
                        <div className="text-brand-danger mt-2 flex items-center justify-between">
                            <span>{error}</span>
                            {error === 'Tamu tidak ditemukan' && !autoCreateGuest && (
                                <button
                                    onClick={() => {
                                        setAutoCreateGuest(true);
                                        localStorage.setItem('souvenirAutoCreateGuest', 'true');
                                        doSearch();
                                    }}
                                    className="text-sm text-brand-primarySoft hover:text-brand-text flex items-center gap-1 underline"
                                >
                                    <UserPlus size={14} />
                                    Buat & Berikan Souvenir
                                </button>
                            )}
                        </div>
                    )}
                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                        <button
                            disabled={searching || processing || creatingGuest}
                            onClick={doSearch}
                            className="flex items-center gap-2 rounded-lg bg-brand-primary px-6 py-3 text-lg font-semibold text-brand-bg shadow-gold hover:bg-brand-primarySoft disabled:opacity-50 transition-all active:scale-95"
                        >
                            {searching || creatingGuest ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
                            {searching ? 'Mencari...' : (creatingGuest ? 'Membuat Tamu...' : 'Cari Souvenir')}
                        </button>
                        <button
                            disabled={searching || processing || creatingGuest}
                            onClick={() => setShowScanner(true)}
                            className="flex items-center gap-2 rounded-lg bg-brand-success px-6 py-3 text-lg font-semibold text-brand-bg shadow-soft hover:opacity-90 disabled:opacity-50 transition-all active:scale-95"
                        >
                            <QrCode size={24} />
                            Scan QR
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="flex items-center gap-2 rounded-lg bg-brand-surfaceMuted border border-brand-border px-4 py-3 text-brand-text hover:bg-brand-surfaceBright transition-all"
                            title="Pengaturan"
                        >
                            <Settings size={24} />
                        </button>

                        <button
                            onClick={() => setShowQueuePanel(true)}
                            className="relative flex items-center gap-2 rounded-lg bg-brand-surfaceMuted border border-brand-border px-4 py-3 text-brand-text hover:bg-brand-surfaceBright transition-all"
                            title="Antrean Offline"
                        >
                            <Clock size={24} />
                            {pendingSouvCount > 0 && (
                                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-danger text-2xs font-bold text-brand-bg shadow-lg animate-pulse">
                                    {pendingSouvCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-xl surface-elevated text-brand-text shadow-gold p-6 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Settings size={24} className="text-brand-primary" />
                                Pengaturan Souvenir
                            </h3>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="text-brand-textDim hover:text-brand-text"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Require Check-in Toggle - Event Level Setting */}
                            <label className="flex items-center justify-between p-4 rounded-lg border border-brand-primary/30 bg-brand-primary/10 cursor-pointer hover:bg-brand-primary/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <UserCheck size={20} className="text-brand-primary" />
                                    <div>
                                        <div className="font-medium text-brand-text">Wajib Check-in Dulu</div>
                                        <div className="text-sm text-brand-textMuted">Tamu harus check-in sebelum bisa mengambil souvenir/konsumsi</div>
                                    </div>
                                </div>
                                <div className={`w-12 h-7 rounded-full transition-colors relative ${requireCheckinForSouvenir ? 'bg-brand-primary' : 'bg-brand-surfaceMuted'}`}>
                                    <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${requireCheckinForSouvenir ? 'translate-x-5' : 'translate-x-0'}`} />
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={requireCheckinForSouvenir}
                                        onChange={async (e) => {
                                            const checked = e.target.checked;
                                            setRequireCheckinForSouvenir(checked);
                                            // Save to backend
                                            setSavingSettings(true);
                                            try {
                                                const token = localStorage.getItem('token');
                                                await fetch(`${apiBase()}/config/event`, {
                                                    method: 'PATCH',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                                                    },
                                                    body: JSON.stringify({ requireCheckinForSouvenir: checked })
                                                });
                                            } catch (e) {
                                                console.error('Failed to save setting', e);
                                            } finally {
                                                setSavingSettings(false);
                                            }
                                        }}
                                    />
                                </div>
                            </label>

                            <label className="flex items-center justify-between p-4 rounded-lg border border-brand-border bg-brand-bgSubtle cursor-pointer hover:bg-brand-surfaceMuted transition-colors">
                                <div className="flex items-center gap-3">
                                    <UserPlus size={20} className="text-brand-primary" />
                                    <div>
                                        <div className="font-medium text-brand-text">Auto Buat Tamu Baru</div>
                                        <div className="text-sm text-brand-textMuted">Jika tamu tidak ditemukan, buat tamu baru dan langsung berikan souvenir</div>
                                    </div>
                                </div>
                                <div className={`w-12 h-7 rounded-full transition-colors relative ${autoCreateGuest ? 'bg-brand-primary' : 'bg-brand-surfaceMuted'}`}>
                                    <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${autoCreateGuest ? 'translate-x-5' : 'translate-x-0'}`} />
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={autoCreateGuest}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setAutoCreateGuest(checked);
                                            localStorage.setItem('souvenirAutoCreateGuest', String(checked));
                                        }}
                                    />
                                </div>
                            </label>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setShowSettings(false)}
                                disabled={savingSettings}
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-3 font-medium text-brand-bg hover:bg-brand-primarySoft disabled:opacity-50 transition-colors"
                            >
                                {savingSettings ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                {savingSettings ? 'Menyimpan...' : 'Selesai'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results */}
            <SouvenirResults
                results={results}
                selectedId={selected?.id ?? null}
                souvenirs={souvenirs}
                processing={processing}
                processingId={processingId}
                onSelect={selectGuest}
                onToggleSouvenir={toggleSouvenir}
            />

            {/* Prize Collection Section - Shows when guest is selected */}
            {selected && prizeWins.length > 0 && (
                <PrizeCollection
                    uncollected={uncollectedPrizes}
                    collected={collectedPrizes}
                    showPrizes={showPrizes}
                    onTogglePrizes={() => setShowPrizes(!showPrizes)}
                    collectingPrize={collectingPrize}
                    onCollectPrize={collectPrize}
                    onPrintReceipt={(pw) => { setSelectedReceiptPrizeWin(pw); setShowReceiptModal(true); }}
                />
            )}

            {/* Loading Prizes Indicator */}
            {selected && loadingPrizes && (
                <div className="relative z-10 px-6 pb-6 flex justify-center">
                    <div className="w-full max-w-5xl rounded-xl surface-elevated p-4 text-brand-textDim flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin" size={16} />
                        Memuat data hadiah...
                    </div>
                </div>
            )}

            {/* History */}
            <SouvenirHistory history={history} />

            {/* Souvenir Selection Modal */}
            {showSouvenirSelect && selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-xl surface-elevated text-brand-text shadow-gold p-6 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Package size={24} className="text-brand-primary" />
                                Pilih Souvenir untuk {selected.name}
                            </h3>
                            <button
                                onClick={() => setShowSouvenirSelect(false)}
                                className="text-brand-textDim hover:text-brand-text"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {souvenirs.filter(s => s.remaining > 0).length === 0 ? (
                                <div className="text-center py-8 text-brand-textDim">
                                    Semua souvenir sudah habis
                                </div>
                            ) : (
                                souvenirs.filter(s => s.remaining > 0).map((s) => (
                                    <div
                                        key={s.id}
                                        className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors ${selectedSouvenir === s.id
                                            ? 'border-brand-primary bg-brand-primary/20'
                                            : 'border-brand-border surface-interactive'
                                            }`}
                                        onClick={() => setSelectedSouvenir(s.id)}
                                    >
                                        <div>
                                            <div className="font-semibold text-brand-text">{s.name}</div>
                                            {s.description && (
                                                <div className="text-sm text-brand-textMuted">{s.description}</div>
                                            )}
                                            <div className="text-xs text-brand-primarySoft mt-1">
                                                Sisa: {s.remaining} / {s.quantity}
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedSouvenir === s.id
                                            ? 'border-brand-primary bg-brand-primary'
                                            : 'border-brand-border'
                                            }`}>
                                            {selectedSouvenir === s.id && (
                                                <CheckCircle size={14} className="text-brand-bg" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setShowSouvenirSelect(false)}
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-surfaceMuted px-4 py-3 font-medium text-brand-text hover:bg-brand-surfaceBright transition-colors"
                            >
                                <X size={18} />
                                Batal
                            </button>
                            <button
                                onClick={() => selected && selectedSouvenir && giveSouvenir(selected, selectedSouvenir)}
                                disabled={!selectedSouvenir || processing}
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-3 font-medium text-brand-bg hover:bg-brand-primarySoft disabled:opacity-50 transition-colors"
                            >
                                {processing ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <Gift size={18} />
                                )}
                                {processing ? 'Memproses...' : 'Berikan Souvenir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Popup */}
            {
            <SouvenirConfirmation
                guest={checkedGuest}
                onClose={() => setCheckedGuest(null)}
            />
            }

            {/* Already Taken Popup - Shows when souvenir was already given */}
            <SouvenirAlreadyTaken
                info={alreadyTakenInfo}
                onClose={() => setAlreadyTakenInfo(null)}
            />

            {/* Scanner Modal */}
            {
                showScanner && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
                        <div className="w-full max-w-md rounded-xl surface-elevated p-6 text-center shadow-2xl">
                            <h3 className="mb-4 text-xl font-bold text-brand-text flex items-center justify-center gap-2">
                                <QrCode size={24} />
                                Scan QR Code
                            </h3>
                            <Html5QrcodePlugin
                                fps={10}
                                qrbox={250}
                                qrCodeSuccessCallback={onScanSuccess}
                            />
                            <button
                                className="mt-6 flex items-center justify-center gap-2 w-full rounded-lg bg-brand-danger px-4 py-3 text-brand-bg font-medium hover:opacity-90 transition-colors"
                                onClick={() => setShowScanner(false)}
                            >
                                <X size={20} />
                                Batal
                            </button>
                        </div>
                    </div>
                )
            }
            {/* Modals & Panels */}
            <StationSetupModal 
                isOpen={showStationSetup} 
                onComplete={(config) => {
                    setStationConfig(config);
                    setShowStationSetup(false);
                }}
                existingConfig={stationConfig}
            />

            <QueueManagementPanel 
                isOpen={showQueuePanel} 
                onClose={() => setShowQueuePanel(false)} 
            />

            {/* Receipt Modal Overlay */}
            {showReceiptModal && selectedReceiptPrizeWin && selected && (
                <PrizeReceiptModal
                    isOpen={showReceiptModal}
                    onClose={() => {
                        setShowReceiptModal(false);
                        setSelectedReceiptPrizeWin(null);
                    }}
                    winner={{
                        id: selected.id,
                        guestId: selected.guestId,
                        name: selected.name,
                        company: selected.company || undefined,
                        division: selected.division || undefined,
                        queueNumber: selected.queueNumber,
                        wonAt: selectedReceiptPrizeWin.wonAt
                    }}
                    prize={{
                        id: selectedReceiptPrizeWin.prize.id,
                        name: selectedReceiptPrizeWin.prize.name,
                        category: selectedReceiptPrizeWin.prize.category
                    }}
                    logoUrl={stationConfig?.logoUrl} // Try to pass logoUrl if available in station settings
                />
            )}
        </div >
    );
}
