"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { apiBase, toApiUrl, apiFetch, parseErrorMessage } from "../../lib/api";
import { Html5Qrcode } from "html5-qrcode";
import { Search, QrCode, Loader2, CheckCircle, Clock, Users, X, Gift, XCircle, Trophy, Package, ChevronDown, ChevronUp, UserPlus, Settings, Radio, UserCheck, AlertTriangle } from 'lucide-react';
import { useSSE } from "../../lib/sse-context";

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
    autoCreateGuestOnSouvenir?: boolean;
    requireCheckinForSouvenir?: boolean;
};

type SouvenirTakeInfo = {
    souvenirName: string;
    takenAt: string;
    takenByName?: string;
};

type Guest = {
    id: string;
    queueNumber: number;
    guestId: string;
    name: string;
    photoUrl?: string | null;
    tableLocation: string;
    company?: string | null;
    division?: string | null;
    notes?: string | null;
    checkedIn: boolean;
    checkedInAt?: string | null;
    souvenirTaken: boolean;
};

type PrizeWin = {
    id: string;
    guestId: string;
    prizeId: string;
    wonAt: string;
    prize: {
        id: string;
        name: string;
        description?: string;
        category: string;
    };
    collection?: {
        id: string;
        collectedAt: string;
        collectedByName?: string;
    } | null;
};

type Souvenir = {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    takenCount: number;
    remaining: number;
};

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
            setResults([]);
            setSelected(null);
            setQ('');
            setPrizeWins([]);
        };

        addEventListener('souvenir_given', onSouvenirChange);
        addEventListener('souvenir_removed', onSouvenirChange);
        addEventListener('souvenir_reset', onSouvenirChange);
        addEventListener('guest_created_souvenir', onSouvenirChange);
        addEventListener('prize_collected', onSouvenirChange);
        addEventListener('prize_uncollected', onSouvenirChange);
        addEventListener('event_change', onEventChange);

        return () => {
            removeEventListener('souvenir_given', onSouvenirChange);
            removeEventListener('souvenir_removed', onSouvenirChange);
            removeEventListener('souvenir_reset', onSouvenirChange);
            removeEventListener('guest_created_souvenir', onSouvenirChange);
            removeEventListener('prize_collected', onSouvenirChange);
            removeEventListener('prize_uncollected', onSouvenirChange);
            removeEventListener('event_change', onEventChange);
            clearTimeout(timeout);
        };
    }, [addEventListener, removeEventListener]);

    const loadSouvenirs = async () => {
        setLoadingSouvenirs(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) return;
            const res = await fetch(`${apiBase()}/souvenirs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSouvenirs(data);
                // Auto-select first available souvenir
                const available = data.find((s: Souvenir) => s.remaining > 0);
                if (available) setSelectedSouvenir(available.id);
            }
        } catch (e) {
            console.error('Failed to load souvenirs', e);
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
        const params = new URLSearchParams();
        if (!q.trim()) return;

        params.set('guestId', q.trim());
        params.set('name', q.trim());
        // Detect if input looks like a QR code / ID (contains digits, dashes, or is all uppercase)
        // Pure alphabetic names like "Budi" should still trigger fuzzy search
        const looksLikeId = /[\d\-]/.test(q.trim()) || /^[A-Z0-9_\-]+$/.test(q.trim());
        if (looksLikeId) {
            params.set('exact', 'true');
        }
        setSearching(true);
        // Cancel any in-flight search to prevent stale results
        if (searchAbortRef.current) searchAbortRef.current.abort();
        const controller = new AbortController();
        searchAbortRef.current = controller;
        try {
            // Use public search to find guest first
            const res = await fetch(`${apiBase()}/public/guests/search?${params.toString()}`, {
                signal: controller.signal
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(parseErrorMessage(errorText));
            }
            const data = await res.json();
            setResults(data);

            if (data.length > 0) {
                // If exact match or single result
                if (data.length === 1) {
                    const guest = data[0];
                    setSelected(guest);

                    // Fire prize check and souvenir give in parallel for speed
                    const prizePromise = loadGuestPrizesAndReturn(guest.id);

                    if (selectedSouvenir) {
                        // Check prizes while preparing to give souvenir
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
                // If multiple results, let user choose manually
            } else {
                // Guest not found - offer to create if setting is enabled
                if (autoCreateGuest) {
                    await createAndGiveSouvenir(q.trim());
                } else {
                    setError('Tamu tidak ditemukan');
                    setQ('');
                }
            }
        } catch (e: any) {
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
        <div className="relative min-h-screen w-full overflow-hidden">
            {/* Background */}
            {pageBgType === 'IMAGE' && pageBgImage && (
                <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${toApiUrl(pageBgImage)})` }} />
            )}
            {pageBgType === 'VIDEO' && pageBgVideo && (
                <video className="absolute inset-0 w-full h-full object-cover" src={toApiUrl(pageBgVideo)} muted loop autoPlay playsInline />
            )}
            <div className="absolute inset-0" style={overlayStyle} />

            {/* Header brand */}
            <div className="relative z-10 p-6 flex items-center gap-4">
                {cfg?.logoUrl && <img src={toApiUrl(cfg.logoUrl)} className="h-12 w-auto" alt="logo" />}
                <div className="text-white">
                    <div className="text-2xl md:text-4xl font-bold text-shadow-lg flex items-center gap-3">
                        <Gift className="text-purple-400" size={32} />
                        Souvenir Check-in
                    </div>
                    <div className="text-sm md:text-base opacity-80 text-shadow flex items-center gap-2">
                        {cfg?.name}
                        <span className="mx-2">•</span>
                        <Radio size={12} className={`${connected ? 'text-emerald-400 animate-pulse' : 'text-red-400'}`} />
                        <span className="text-xs">{connected ? 'Live' : 'Offline'}</span>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative z-10 p-6 flex flex-col items-center">
                <div className="w-full max-w-3xl rounded-2xl border border-white/20 bg-slate-900/75 px-4 py-5 shadow-glass">
                    {/* Souvenir Selector Dropdown */}
                    {souvenirs.length > 0 && (
                        <div className="mb-4">
                            <label className="text-sm text-white/70 mb-2 block flex items-center gap-2">
                                <Package size={16} className="text-purple-400" />
                                Pilih Souvenir untuk Check-in:
                            </label>
                            <select
                                value={selectedSouvenir}
                                onChange={(e) => setSelectedSouvenir(e.target.value)}
                                className="w-full rounded-lg border border-purple-500/50 bg-purple-500/10 px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/70 appearance-none cursor-pointer"
                                disabled={searching || processing || creatingGuest}
                            >
                                <option value="" className="bg-slate-900 text-white">-- Pilih Souvenir --</option>
                                {souvenirs.filter(s => s.remaining > 0).map((s) => (
                                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                                        {s.name} (Sisa: {s.remaining}/{s.quantity})
                                    </option>
                                ))}
                            </select>
                            {selectedSouvenir && (
                                <div className="mt-2 text-sm text-purple-300 flex items-center gap-2">
                                    <CheckCircle size={14} />
                                    <span>Pencarian akan otomatis memberikan souvenir ini</span>
                                </div>
                            )}
                        </div>
                    )}

                    <input
                        ref={inputRef}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !searching && !processing && !creatingGuest) { e.preventDefault(); doSearch(); } }}
                        placeholder="Masukkan Guest ID atau Nama..."
                        className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-3 text-white placeholder:text-white/60 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-purple-500/70"
                        disabled={searching || processing || creatingGuest}
                        autoFocus
                    />
                    {error && (
                        <div className="text-red-300 mt-2 flex items-center justify-between">
                            <span>{error}</span>
                            {error === 'Tamu tidak ditemukan' && !autoCreateGuest && (
                                <button
                                    onClick={() => {
                                        setAutoCreateGuest(true);
                                        localStorage.setItem('souvenirAutoCreateGuest', 'true');
                                        doSearch();
                                    }}
                                    className="text-sm text-purple-300 hover:text-purple-100 flex items-center gap-1 underline"
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
                            className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-lg font-semibold text-white shadow-soft hover:bg-purple-700 disabled:opacity-50 transition-all active:scale-95"
                        >
                            {searching || creatingGuest ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
                            {searching ? 'Mencari...' : (creatingGuest ? 'Membuat Tamu...' : 'Cari Souvenir')}
                        </button>
                        <button
                            disabled={searching || processing || creatingGuest}
                            onClick={() => setShowScanner(true)}
                            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-lg font-semibold text-white shadow-soft hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95"
                        >
                            <QrCode size={24} />
                            Scan QR
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white hover:bg-white/20 transition-all"
                            title="Pengaturan"
                        >
                            <Settings size={24} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-xl border border-white/20 bg-slate-900/95 text-white shadow-glass p-6 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Settings size={24} className="text-purple-400" />
                                Pengaturan Souvenir
                            </h3>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="text-white/60 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Require Check-in Toggle - Event Level Setting */}
                            <label className="flex items-center justify-between p-4 rounded-lg border border-purple-500/30 bg-purple-500/10 cursor-pointer hover:bg-purple-500/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <UserCheck size={20} className="text-purple-400" />
                                    <div>
                                        <div className="font-medium text-white">Wajib Check-in Dulu</div>
                                        <div className="text-sm text-white/60">Tamu harus check-in sebelum bisa mengambil souvenir/konsumsi</div>
                                    </div>
                                </div>
                                <div className={`w-12 h-7 rounded-full transition-colors relative ${requireCheckinForSouvenir ? 'bg-purple-500' : 'bg-white/20'}`}>
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

                            <label className="flex items-center justify-between p-4 rounded-lg border border-white/20 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <UserPlus size={20} className="text-purple-400" />
                                    <div>
                                        <div className="font-medium text-white">Auto Buat Tamu Baru</div>
                                        <div className="text-sm text-white/60">Jika tamu tidak ditemukan, buat tamu baru dan langsung berikan souvenir</div>
                                    </div>
                                </div>
                                <div className={`w-12 h-7 rounded-full transition-colors relative ${autoCreateGuest ? 'bg-purple-500' : 'bg-white/20'}`}>
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
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            >
                                {savingSettings ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                {savingSettings ? 'Menyimpan...' : 'Selesai'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results */}
            <div className="relative z-10 p-6 flex justify-center">
                <div className="w-full max-w-5xl rounded-xl border border-white/20 bg-slate-900/75 p-4 text-white shadow-glass backdrop-blur-sm">
                    {!results.length && (
                        <div className="text-center text-white/80 py-8 flex flex-col items-center gap-3">
                            <Gift size={48} className="text-white/20" />
                            <p>Cari tamu untuk memproses pengambilan souvenir</p>
                        </div>
                    )}
                    {!!results.length && (
                        <div className="space-y-2">
                            {results.map((g) => (
                                <div
                                    key={g.id}
                                    onClick={() => selectGuest(g)}
                                    className={`cursor-pointer flex items-center justify-between rounded border p-3 bg-white/5 transition-colors ${selected?.id === g.id ? 'border-purple-500/80 bg-purple-500/10' : 'border-white/20 hover:bg-white/10'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 bg-white/10 rounded overflow-hidden flex-shrink-0">
                                            {g.photoUrl ? (
                                                <img src={toApiUrl(g.photoUrl)} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-xs text-white/60">No Photo</div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-white">
                                                {g.name} <span className="text-white/70 font-mono text-sm">({g.guestId})</span>
                                            </div>
                                            <div className="text-sm text-white/70">
                                                {g.tableLocation} {g.company ? `• ${g.company}` : ''} {g.division ? `• ${g.division}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className={`flex items-center gap-2 rounded-full px-4 py-2 font-medium text-white shadow-soft disabled:opacity-50 transition-colors ${g.souvenirTaken
                                                ? 'bg-green-600 hover:bg-green-700'
                                                : 'bg-purple-600 hover:bg-purple-700'
                                                }`}
                                            disabled={processing}
                                            onClick={(e) => { e.stopPropagation(); toggleSouvenir(g); }}
                                        >
                                            {processing && processingId === g.id ? (
                                                <Loader2 className="animate-spin" size={16} />
                                            ) : g.souvenirTaken ? (
                                                <CheckCircle size={16} />
                                            ) : (
                                                <Gift size={16} />
                                            )}
                                            {processing && processingId === g.id
                                                ? 'Memproses...'
                                                : (g.souvenirTaken ? 'Sudah Diambil' : 'Ambil Souvenir')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Prize Collection Section - Shows when guest is selected */}
            {selected && prizeWins.length > 0 && (
                <div className="relative z-10 px-6 pb-6 flex justify-center">
                    <div className="w-full max-w-5xl rounded-xl border border-amber-500/30 bg-amber-900/30 p-4 text-white shadow-glass backdrop-blur-sm">
                        <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => setShowPrizes(!showPrizes)}
                        >
                            <div className="font-semibold flex items-center gap-2 text-amber-300">
                                <Trophy size={20} />
                                Hadiah Lucky Draw ({uncollectedPrizes.length} belum diambil, {collectedPrizes.length} sudah diambil)
                            </div>
                            <button className="text-amber-300 hover:text-amber-100">
                                {showPrizes ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                        </div>

                        {showPrizes && (
                            <div className="mt-4 space-y-3">
                                {/* Uncollected Prizes */}
                                {uncollectedPrizes.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs uppercase tracking-wider text-amber-400/80 font-medium">
                                            Belum Diambil - Pilih hadiah yang akan diambil:
                                        </div>
                                        {uncollectedPrizes.map((pw) => (
                                            <div key={pw.id} className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                                                <div>
                                                    <div className="font-semibold text-white flex items-center gap-2">
                                                        <Trophy size={16} className="text-amber-400" />
                                                        {pw.prize.name}
                                                    </div>
                                                    <div className="text-xs text-white/60">
                                                        Kategori: {pw.prize.category === 'UTAMA' ? 'Hadiah Utama' : 'Hadiah Hiburan'}
                                                        {pw.prize.description && ` • ${pw.prize.description}`}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => collectPrize(pw.id)}
                                                    disabled={collectingPrize === pw.id}
                                                    className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {collectingPrize === pw.id ? (
                                                        <Loader2 className="animate-spin" size={16} />
                                                    ) : (
                                                        <CheckCircle size={16} />
                                                    )}
                                                    {collectingPrize === pw.id ? 'Memproses...' : 'Ambil Hadiah Ini'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Collected Prizes */}
                                {collectedPrizes.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs uppercase tracking-wider text-green-400/80 font-medium">
                                            Sudah Diambil:
                                        </div>
                                        {collectedPrizes.map((pw) => (
                                            <div key={pw.id} className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 p-3 opacity-75">
                                                <div>
                                                    <div className="font-semibold text-white flex items-center gap-2">
                                                        <CheckCircle size={16} className="text-green-400" />
                                                        {pw.prize.name}
                                                    </div>
                                                    <div className="text-xs text-green-300/80">
                                                        Diambil pada {new Date(pw.collection!.collectedAt).toLocaleString('id-ID')}
                                                        {pw.collection!.collectedByName && ` oleh ${pw.collection!.collectedByName}`}
                                                    </div>
                                                </div>
                                                <span className="px-3 py-1 rounded-full bg-green-600/30 text-green-300 text-sm font-medium">
                                                    Sudah Diambil
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Loading Prizes Indicator */}
            {selected && loadingPrizes && (
                <div className="relative z-10 px-6 pb-6 flex justify-center">
                    <div className="w-full max-w-5xl rounded-xl border border-white/20 bg-slate-900/75 p-4 text-white/60 flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin" size={16} />
                        Memuat data hadiah...
                    </div>
                </div>
            )}

            {/* History */}
            <div className="relative z-10 p-6 flex justify-center">
                <div className="w-full max-w-5xl rounded-xl border border-white/20 bg-slate-900/75 p-4 text-white shadow-glass backdrop-blur-sm">
                    <div className="mb-3 font-semibold flex items-center gap-2 border-b border-white/10 pb-2">
                        <Clock size={18} />
                        Riwayat Pengambilan Terbaru
                    </div>
                    {!history.length && <div className="text-sm text-white/70 py-4 text-center">Belum ada riwayat sesi ini</div>}
                    {!!history.length && (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {history.map((h) => (
                                <div key={h.id} className="flex items-center gap-3 rounded border border-white/20 bg-white/5 p-2">
                                    <div className="h-10 w-10 rounded bg-white/10 overflow-hidden flex-shrink-0">
                                        {h.photoUrl ? (
                                            <img src={toApiUrl(h.photoUrl)} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-[10px] text-white/60">No Photo</div>
                                        )}
                                    </div>
                                    <div className="text-sm overflow-hidden">
                                        <div className="font-medium text-white truncate">
                                            {h.name}
                                        </div>
                                        <div className="text-green-400 text-xs flex items-center gap-1">
                                            <CheckCircle size={10} /> Souvenir Diambil
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Souvenir Selection Modal */}
            {showSouvenirSelect && selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-xl border border-white/20 bg-slate-900/95 text-white shadow-glass p-6 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Package size={24} className="text-purple-400" />
                                Pilih Souvenir untuk {selected.name}
                            </h3>
                            <button
                                onClick={() => setShowSouvenirSelect(false)}
                                className="text-white/60 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {souvenirs.filter(s => s.remaining > 0).length === 0 ? (
                                <div className="text-center py-8 text-white/60">
                                    Semua souvenir sudah habis
                                </div>
                            ) : (
                                souvenirs.filter(s => s.remaining > 0).map((s) => (
                                    <div
                                        key={s.id}
                                        className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors ${selectedSouvenir === s.id
                                            ? 'border-purple-500 bg-purple-500/20'
                                            : 'border-white/20 bg-white/5 hover:bg-white/10'
                                            }`}
                                        onClick={() => setSelectedSouvenir(s.id)}
                                    >
                                        <div>
                                            <div className="font-semibold text-white">{s.name}</div>
                                            {s.description && (
                                                <div className="text-sm text-white/60">{s.description}</div>
                                            )}
                                            <div className="text-xs text-purple-300 mt-1">
                                                Sisa: {s.remaining} / {s.quantity}
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedSouvenir === s.id
                                            ? 'border-purple-400 bg-purple-400'
                                            : 'border-white/30'
                                            }`}>
                                            {selectedSouvenir === s.id && (
                                                <CheckCircle size={14} className="text-white" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setShowSouvenirSelect(false)}
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-3 font-medium text-white hover:bg-white/20 transition-colors"
                            >
                                <X size={18} />
                                Batal
                            </button>
                            <button
                                onClick={() => selected && selectedSouvenir && giveSouvenir(selected, selectedSouvenir)}
                                disabled={!selectedSouvenir || processing}
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
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
                checkedGuest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="w-full max-w-5xl overflow-hidden rounded-xl border border-white/20 bg-slate-900/90 text-white shadow-glass grid grid-cols-1 md:grid-cols-[320px_1fr] animate-in fade-in zoom-in duration-300">
                            <div className="bg-white/10 flex items-center justify-center min-h-[300px] md:min-h-full">
                                {checkedGuest.photoUrl ? (
                                    <img src={toApiUrl(checkedGuest.photoUrl)} alt={checkedGuest.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-gray-400 p-8 flex flex-col items-center gap-2">
                                        <Users size={48} className="opacity-50" />
                                        <span>No Photo</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 md:p-10 space-y-4 relative overflow-y-auto max-h-[60vh] md:max-h-full">
                                <div className="text-purple-400 text-xl font-bold flex items-center gap-2">
                                    <Gift size={24} />
                                    SOUVENIR DIAMBIL
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-white/60 uppercase tracking-wider font-medium">Queue</div>
                                        <div className="text-5xl md:text-7xl font-extrabold text-white leading-none">{checkedGuest.queueNumber}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-white/60 uppercase tracking-wider font-medium">Guest ID</div>
                                        <div className="text-2xl md:text-3xl font-mono font-semibold text-white">{checkedGuest.guestId}</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm text-white/60 uppercase tracking-wider font-medium">Nama</div>
                                    <div className="text-3xl md:text-5xl font-bold text-white leading-tight">{checkedGuest.name}</div>
                                </div>

                                <div>
                                    <div className="text-sm text-white/60 uppercase tracking-wider font-medium">Meja / Ruangan</div>
                                    <div className="text-2xl md:text-3xl text-white">{checkedGuest.tableLocation}</div>
                                </div>

                                <div className="pt-6 flex items-center gap-3">
                                    <button
                                        className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-base font-medium text-white hover:bg-white/20 transition-colors"
                                        onClick={() => setCheckedGuest(null)}
                                    >
                                        <X size={20} />
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Already Taken Popup - Shows when souvenir was already given */}
            {alreadyTakenInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-xl border border-amber-500/30 bg-slate-900/95 text-white shadow-glass p-6 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-amber-400">
                                <AlertTriangle size={24} />
                                Souvenir Sudah Diambil
                            </h3>
                            <button
                                onClick={() => setAlreadyTakenInfo(null)}
                                className="text-white/60 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="mb-4 p-4 rounded-lg border border-white/20 bg-white/5">
                            <div className="text-sm text-white/60 mb-1">Tamu</div>
                            <div className="text-xl font-bold text-white">{alreadyTakenInfo.guest.name}</div>
                            <div className="text-sm text-white/60 font-mono">{alreadyTakenInfo.guest.guestId}</div>
                        </div>

                        <div className="mb-4">
                            <div className="text-sm text-amber-400 font-medium mb-2 flex items-center gap-2">
                                <Package size={16} />
                                Riwayat Pengambilan Souvenir:
                            </div>
                            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                                {alreadyTakenInfo.takes.map((take, idx) => (
                                    <div key={idx} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10">
                                        <div className="font-semibold text-white flex items-center gap-2">
                                            <Gift size={16} className="text-amber-400" />
                                            {take.souvenirName}
                                        </div>
                                        <div className="text-sm text-white/70 mt-1 flex items-center gap-4">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {new Date(take.takenAt).toLocaleString('id-ID', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                            {take.takenByName && (
                                                <span className="flex items-center gap-1">
                                                    <Users size={12} />
                                                    Admin: {take.takenByName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setAlreadyTakenInfo(null)}
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-3 font-medium text-white hover:bg-amber-700 transition-colors"
                            >
                                <CheckCircle size={18} />
                                Mengerti
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scanner Modal */}
            {
                showScanner && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
                        <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-2xl">
                            <h3 className="mb-4 text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
                                <QrCode size={24} />
                                Scan QR Code
                            </h3>
                            <Html5QrcodePlugin
                                fps={10}
                                qrbox={250}
                                qrCodeSuccessCallback={onScanSuccess}
                            />
                            <button
                                className="mt-6 flex items-center justify-center gap-2 w-full rounded-lg bg-red-600 px-4 py-3 text-white font-medium hover:bg-red-700 transition-colors"
                                onClick={() => setShowScanner(false)}
                            >
                                <X size={20} />
                                Batal
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// Reusing the robust Html5QrcodePlugin from checkin page
const Html5QrcodePlugin = ({ qrCodeSuccessCallback, onScanFailure, fps, qrbox }: any) => {
    const [startError, setStartError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isScanningRef = useRef(false);
    const uniqueIdRef = useRef(`reader-${Math.random().toString(36).slice(2)}`);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const elementId = uniqueIdRef.current;
        if (!document.getElementById(elementId)) return;

        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;
        const config = { fps: fps || 10, qrbox: qrbox || 250 };

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
                html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
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
                        if (blob) resolve(new File([blob], file.name, { type: file.type }));
                        else reject(new Error("Canvas to Blob failed"));
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
            await scannerRef.current.scanFileV2(file, false).then((decodedText) => {
                qrCodeSuccessCallback(decodedText, null);
            });
        } catch (err: any) {
            console.warn("First scan failed, retrying resized...", err);
            try {
                const resized = await resizeImage(file, 800);
                await scannerRef.current.scanFileV2(resized, false).then((decodedText) => {
                    qrCodeSuccessCallback(decodedText, null);
                });
            } catch (retryErr: any) {
                alert(`Gagal memindai QR: ${retryErr?.message || "Tidak ditemukan"}`);
            }
        }
    };

    return (
        <div className="w-full">
            <div id={uniqueIdRef.current} className="w-full overflow-hidden rounded-lg bg-black border-2 border-gray-200 relative min-h-[300px]">
                {startError && (
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center bg-slate-900 text-white overflow-y-auto">
                        <div className="max-h-full py-4">
                            <p className="text-red-400 font-bold mb-2">Kamera Error</p>
                            <p className="text-sm text-white/70 mb-4">
                                {startError}
                            </p>
                            <div className="text-xs text-left bg-black/30 p-3 rounded border border-white/10 mb-4 space-y-2">
                                <p className="font-bold text-yellow-400">Solusi (Chrome/Edge):</p>
                                <ol className="list-decimal pl-4 space-y-1 opacity-90">
                                    <li>Buka tab baru, ketik: <code className="bg-white/20 px-1 rounded">chrome://flags</code></li>
                                    <li>Cari: <code className="bg-white/20 px-1 rounded">insecure origins</code></li>
                                    <li>Enable <b>"Insecure origins treated as secure"</b></li>
                                    <li>Masukkan URL ini di kotak teks yang muncul: <br /><code className="bg-white/20 px-1 rounded block mt-1 select-all">{typeof window !== 'undefined' ? window.location.origin : 'http://...'}</code></li>
                                    <li>Klik <b>Relaunch</b> di bawah layar.</li>
                                </ol>
                            </div>
                            <button onClick={() => fileInputRef.current?.click()} className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors">Buka Kamera / Upload</button>
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-4 text-center">
                <button onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 hover:underline font-medium">Masalah dengan kamera? Upload Foto</button>
                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            </div>
        </div>
    );
};
