"use client";
import { useEffect, useState, useRef, useMemo } from 'react';
import { apiFetch, apiBase, toApiUrl } from '@/lib/api';
import { Trophy, PartyPopper, History, X, Users, Search, Award, Hash, Volume2, VolumeX, Monitor, HelpCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { popWinner, finale, grandFinale } from '@/lib/celebrate';
import WinnerHistoryModal from '@/components/WinnerHistoryModal';

interface Prize {
    id: string;
    name: string;
    description?: string;
    category?: string;
    quantity: number;
    winners: any[];
    allowMultipleWins?: boolean;
}

interface Guest {
    id: string;
    guestId?: string;      // ← TAMBAHAN: Guest ID untuk pencarian
    name: string;
    company?: string;
    division?: string;
    photoUrl?: string;
    queueNumber: number;
}

// Interface baru untuk panel eligible
interface EligibleGuest {
    id: string;
    guestId: string;
    name: string;
    queueNumber: number;
    company?: string;
    division?: string;
    photoUrl?: string;
    wonPrizes: string[];   // Nama hadiah yang sudah dimenangkan
}

interface EligibleGuestsResponse {
    data: EligibleGuest[];
    total: number;
    eligible: number;
    won: number;
    totalCheckedIn: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// Drama level configuration per category
interface DramaConfig {
    spinDuration: number;
    tickerSpeedStart: number;
    tickerSpeedMin: number;
    slowdownStages: number[];
    enableScreenFlash: boolean;
    enableDarkReveal: boolean;
    enableScreenShake: boolean;
    enableScanlines: boolean;
    buttonLabel: string;
    buttonExtraClass: string;
}

const DRAMA_CONFIGS: Record<string, DramaConfig> = {
    HIBURAN: {
        spinDuration: 3000,
        tickerSpeedStart: 120,
        tickerSpeedMin: 80,
        slowdownStages: [300, 800],
        enableScreenFlash: false,
        enableDarkReveal: false,
        enableScreenShake: false,
        enableScanlines: false,
        buttonLabel: 'PUTAR UNDIAN',
        buttonExtraClass: '',
    },
    UTAMA: {
        spinDuration: 8000,
        tickerSpeedStart: 60,
        tickerSpeedMin: 40,
        slowdownStages: [100, 200, 400, 800, 2000],
        enableScreenFlash: true,
        enableDarkReveal: true,
        enableScreenShake: true,
        enableScanlines: true,
        buttonLabel: '◆ GRAND PRIZE ◆',
        buttonExtraClass: 'animate-grand-pulse ring-2 ring-brand-primary/50',
    },
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

import { useSSE } from '@/lib/sse-context';

export default function LuckyDrawPage() {
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [selectedPrizeId, setSelectedPrizeId] = useState<string>('');
    const [spinning, setSpinning] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const spinningRef = useRef(false);
    const [winner, setWinner] = useState<Guest | null>(null);
    const [candidates, setCandidates] = useState<Guest[]>([]);
    const [displayCandidate, setDisplayCandidate] = useState<Guest | null>(null);
    const [loading, setLoading] = useState(true);
    const [drawError, setDrawError] = useState<string | null>(null);
    const [eventCfg, setEventCfg] = useState<any>(null);
    const [showEligiblePanel, setShowEligiblePanel] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'eligible' | 'won'>('all');
    const { addEventListener, removeEventListener } = useSSE();

    // Audio States & Refs
    const [soundEnabled, setSoundEnabled] = useState(false);
    const audioRollRef = useRef<HTMLAudioElement | null>(null);
    const audioTensionRef = useRef<HTMLAudioElement | null>(null);
    const audioWinRef = useRef<HTMLAudioElement | null>(null);
    const audioGrandWinRef = useRef<HTMLAudioElement | null>(null);

    const playSound = (audioRef: React.RefObject<HTMLAudioElement | null>, loop = false) => {
        if (!soundEnabled || !audioRef.current) return;
        audioRef.current.currentTime = 0;
        audioRef.current.loop = loop;
        audioRef.current.volume = 1.0;
        audioRef.current.play().catch(e => console.warn('Audio play failed', e));
    };

    const stopSound = (audioRef: React.RefObject<HTMLAudioElement | null>) => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const toggleSound = () => {
        const newState = !soundEnabled;
        setSoundEnabled(newState);
        // Pre-load sounds on interaction
        if (newState) {
            [audioRollRef, audioTensionRef, audioWinRef, audioGrandWinRef].forEach(ref => {
                if (ref.current) {
                    ref.current.load();
                    ref.current.volume = 0;
                    ref.current.play().then(() => {
                        ref.current?.pause();
                        if (ref.current) ref.current.currentTime = 0;
                        if (ref.current) ref.current.volume = 1.0;
                    }).catch(() => {});
                }
            });
        }
    };

    // NEW: Dedicated state untuk panel peserta (server-driven)
    const [searchGuestId, setSearchGuestId] = useState('');
    const [eligibleData, setEligibleData] = useState<EligibleGuest[]>([]);
    const [eligibleMeta, setEligibleMeta] = useState({ total: 0, eligible: 0, won: 0, totalCheckedIn: 0, page: 1, totalPages: 1 });
    const [eligibleLoading, setEligibleLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const listEndRef = useRef<HTMLDivElement>(null);

    // Drama System & Ticker States
    const [tickerSpeed, setTickerSpeed] = useState<number>(800);
    const [tickerMood, setTickerMood] = useState<'normal' | 'tension'>('normal');
    const [screenFlash, setScreenFlash] = useState(false);
    const [darkReveal, setDarkReveal] = useState(false);
    const [screenShake, setScreenShake] = useState(false);
    const [isGlitching, setIsGlitching] = useState(false);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [tickerNames, setTickerNames] = useState<Guest[]>([]);
    const [drawCount, setDrawCount] = useState<number>(1);
    const [multiWinners, setMultiWinners] = useState<Guest[]>([]);
    const [showMultiWinnerModal, setShowMultiWinnerModal] = useState(false);
    const [isRevealing, setIsRevealing] = useState(false);
    const [totalExpectedWinners, setTotalExpectedWinners] = useState(0);

    const PAGE_SIZE = 50;

    // Hitung interval reveal berdasarkan jumlah pemenang
    const calculateRevealInterval = (count: number): number => {
        if (count <= 5) return 800;    // 5 winners × 800ms = 4s
        if (count <= 10) return 500;   // 10 winners × 500ms = 5s
        if (count <= 20) return 350;   // 20 winners × 350ms = 7s
        return 250;                    // 50+ winners × 250ms = ~12.5s
    };

    // Helper for Grand Prize injection
    const injectWinnerToCenter = (winnerGuest: Guest) => {
        setTickerNames(prev => {
            // Remove existing entries of this winner to prevent duplicates
            const arr = prev.filter(g => g.id !== winnerGuest.id);
            // Insert winner at center position (index 3)
            const centerIdx = Math.min(3, arr.length);
            arr.splice(centerIdx, 0, winnerGuest);
            // Keep max 7 entries
            return arr.slice(0, 7);
        });
    };

    // Ticker logic - High performance random sampler
    useEffect(() => {
        if (candidates.length === 0 || tickerSpeed > 10000) return;

        const interval = setInterval(() => {
            setTickerNames(prev => {
                const newArr = [...prev];
                
                // Initialization: Fill with unique candidates
                const maxSlots = Math.min(7, candidates.length);
                if (newArr.length < maxSlots) {
                    const currentIds = new Set(newArr.map(n => n.id));
                    while (newArr.length < maxSlots) {
                         const available = candidates.filter(c => !currentIds.has(c.id));
                         const pool = available.length > 0 ? available : candidates;
                         const rand = pool[Math.floor(Math.random() * pool.length)];
                         if (rand) {
                             newArr.push(rand);
                             currentIds.add(rand.id);
                         } else break;
                    }
                    return newArr;
                }
                
                // Rolling: Shift one and add a new one that isn't already in the current view
                newArr.shift();
                const currentIds = new Set(newArr.map(n => n.id));
                const available = candidates.filter(c => !currentIds.has(c.id));
                const pool = available.length > 0 ? available : candidates;
                const rand = pool[Math.floor(Math.random() * pool.length)];
                if (rand) newArr.push(rand);
                
                return newArr;
            });
        }, tickerSpeed);

        return () => clearInterval(interval);
    }, [candidates, tickerSpeed]);

    const executeGrandPrizeSlowdown = async (winnerGuest: Guest, drawInterval: NodeJS.Timeout) => {
        // Stage 1: Intense start
        setTickerSpeed(80);
        await sleep(2000);

        // Stage 2: Begin Tension
        setTickerSpeed(150);
        setTickerMood('tension');
        setIsGlitching(true);
        stopSound(audioRollRef);
        playSound(audioTensionRef, true);
        await sleep(2000);

        // Stage 3: Noticeable slowdown
        setTickerSpeed(400);
        setScreenShake(true); 
        await sleep(1500);

        // Stage 4: High Suspense
        setTickerSpeed(800);
        await sleep(1500);

        // Stage 5: Final crawl
        setTickerSpeed(1500);
        await sleep(2000);

        // REVEAL with Screen Flash
        setTickerSpeed(999999);
        setIsGlitching(false);
        clearInterval(drawInterval);
        
        // Immediately inject winner so there's no delayed jump
        injectWinnerToCenter(winnerGuest);
        setDisplayCandidate(winnerGuest);
        setWinner(winnerGuest);
        setHighlightedId(winnerGuest.id);

        stopSound(audioTensionRef);
        playSound(audioGrandWinRef);
        
        setScreenShake(false);
        setScreenFlash(true);
        await sleep(300);
        setScreenFlash(false);

        setDarkReveal(true);
        await sleep(500);

        const cancelFinale = grandFinale();

        await sleep(5000);
        cancelFinale();
        setDarkReveal(false);
        setTickerMood('normal');
        setTickerSpeed(800);
    };

    const fetchEligibleGuests = async (page = 1, append = false) => {
        if (page === 1) setEligibleLoading(true);
        else setLoadingMore(true);

        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('pageSize', String(PAGE_SIZE));
            params.set('tab', activeTab);
            if (searchQuery.trim()) params.set('q', searchQuery.trim());
            if (searchGuestId.trim()) params.set('guestId', searchGuestId.trim());

            const res = await apiFetch<EligibleGuestsResponse>(`/prizes/eligible-guests?${params.toString()}`);

            if (append) {
                setEligibleData(prev => {
                    const existingIds = new Set(prev.map(item => item.id));
                    const newItems = res.data.filter((item: any) => !existingIds.has(item.id));
                    return [...prev, ...newItems];
                });
            } else {
                setEligibleData(res.data);
            }
            setEligibleMeta({
                total: res.total,
                eligible: res.eligible,
                won: res.won,
                totalCheckedIn: res.totalCheckedIn,
                page: res.page,
                totalPages: res.totalPages,
            });
        } catch (e) {
            console.error('Failed to load eligible guests:', e);
        } finally {
            setEligibleLoading(false);
            setLoadingMore(false);
        }
    };

    // Debounce pencarian — fetch ulang 300ms setelah user berhenti mengetik
    const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        if (!showEligiblePanel) return;

        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            fetchEligibleGuests(1, false); // Reset ke page 1
        }, 300);

        return () => clearTimeout(searchTimeoutRef.current);
    }, [searchQuery, searchGuestId, activeTab, showEligiblePanel]);

    // Auto load more saat scroll ke bawah (Intersection Observer)
    useEffect(() => {
        if (!showEligiblePanel || !listEndRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loadingMore && eligibleMeta.page < eligibleMeta.totalPages) {
                    fetchEligibleGuests(eligibleMeta.page + 1, true);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(listEndRef.current);
        return () => observer.disconnect();
    }, [showEligiblePanel, loadingMore, eligibleMeta.page, eligibleMeta.totalPages]);

    // Auto-refresh saat panel dibuka
    useEffect(() => {
        if (showEligiblePanel) {
            fetchEligibleGuests(1, false);
        } else {
            // Reset state saat panel ditutup
            setSearchQuery('');
            setSearchGuestId('');
            setActiveTab('all');
            setEligibleData([]);
        }
    }, [showEligiblePanel]);

    // Compute set of winner IDs that should be excluded from ticker
    const getExcludedWinnerIds = (prizesData: Prize[]): Set<string> => {
        const excluded = new Set<string>();
        for (const prize of prizesData) {
            if (!prize.allowMultipleWins) {
                // Pemenang hadiah non-multiwin → exclude dari semua undian
                for (const w of prize.winners) {
                    excluded.add(w.id);
                }
            }
        }
        return excluded;
    };

    // Load prizes, candidates, and config
    const loadData = async () => {
        try {
            const [prizesData, guestsData, configData] = await Promise.all([
                apiFetch<Prize[]>('/prizes'),
                apiFetch<{ data: Guest[] }>('/guests?checkedIn=true&pageSize=10000'),
                apiFetch<any>('/config/event')
            ]);
            setPrizes(prizesData);

            // Filter out winners dari hadiah yang tidak allowMultipleWins
            const excluded = getExcludedWinnerIds(prizesData);
            const eligibleCandidates = (guestsData.data || []).filter(
                g => !excluded.has(g.id)
            );
            setCandidates(eligibleCandidates);
            setEventCfg(configData);

            if (prizesData.length > 0 && !selectedPrizeId) {
                setSelectedPrizeId(prizesData[0].id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Listen for remote draw events and config updates
        const onPrizeDraw = (e: MessageEvent) => {
            const data = JSON.parse(e.data);
            if (data.prizeId === selectedPrizeId) {
                // Abaikan update live bila halaman ini sedang menjalankan animasi undian
                if (!spinningRef.current) {
                    loadData();
                }
            }
        };
        const onConfig = (e: MessageEvent) => {
            try {
                const data = JSON.parse(e.data);
                setEventCfg((prev: any) => ({ ...prev, ...data }));
            } catch (err) {
                console.error('SSE Parse Error', err);
            }
        };

        const onEventChange = () => {
            // Reload all data when event changes
            setLoading(true);
            setWinner(null);
            setSelectedPrizeId('');
            loadData();
        };

        addEventListener('prize_draw', onPrizeDraw);
        addEventListener('config', onConfig);
        addEventListener('event_change', onEventChange);

        return () => {
            removeEventListener('prize_draw', onPrizeDraw);
            removeEventListener('config', onConfig);
            removeEventListener('event_change', onEventChange);
        };
    }, [selectedPrizeId, addEventListener, removeEventListener]);

    const handleDraw = async () => {
        if (!selectedPrizeId || spinning) return;

        const drama = DRAMA_CONFIGS[selectedPrize?.category || 'HIBURAN'] || DRAMA_CONFIGS.HIBURAN;

        setSpinning(true);
        spinningRef.current = true;
        setWinner(null);
        setHighlightedId(null);
        if (drama === DRAMA_CONFIGS.UTAMA) {
            setTickerMood('tension');
        }

        playSound(audioRollRef, true);

        // Start animation loop
        let counter = 0;
        const interval = setInterval(() => {
            if (candidates.length > 0) {
                const randomIdx = Math.floor(Math.random() * candidates.length);
                setDisplayCandidate(candidates[randomIdx]);
            } else {
                // Fallback if no candidates
                const randomNum = Math.floor(Math.random() * 1000);
                setDisplayCandidate({
                    id: 'temp',
                    guestId: `G${randomNum}`,
                    name: `Guest #${randomNum}`,
                    queueNumber: randomNum,
                    company: '...',
                    division: '...'
                });
            }
            counter++;
        }, 50);

        // Notify ticker to speed up
        setTickerSpeed(drama.tickerSpeedMin);
        if (drama !== DRAMA_CONFIGS.UTAMA) {
            setScreenShake(true); // Start shaking for normal prizes
        }

        try {
            // Call API to get winner(s)
            const results = await apiFetch<Guest[]>(`/prizes/${selectedPrizeId}/draw`, { 
                method: 'POST',
                body: JSON.stringify({ count: drama === DRAMA_CONFIGS.UTAMA ? 1 : drawCount })
            });
            const result = results[0]; // For single-winner animations

            // Suspense Wait
            await sleep(drama.spinDuration);

            if (drama === DRAMA_CONFIGS.UTAMA) {
                await executeGrandPrizeSlowdown(result, interval);
            } else {
                setScreenShake(false); // Stop shaking
                clearInterval(interval);
                stopSound(audioRollRef);
                playSound(audioWinRef);
                
                if (results.length > 1) {
                    // Sequential reveal: buka modal kosong, lalu reveal satu-per-satu
                    const revealInterval = calculateRevealInterval(results.length);
                    setTotalExpectedWinners(results.length);
                    setMultiWinners([]);               // Start empty
                    setShowMultiWinnerModal(true);
                    setIsRevealing(true);
                    
                    // Reveal satu per satu
                    for (let i = 0; i < results.length; i++) {
                        await sleep(revealInterval);
                        setMultiWinners(prev => [...prev, results[i]]);
                        setDisplayCandidate(results[i]);
                        popWinner({ x: 0.5, y: 0.6 }, 40);
                    }

                    setIsRevealing(false);
                } else {
                    setDisplayCandidate(result);
                    setWinner(result);
                    setTickerSpeed(300);
                    await sleep(500);
                    setTickerSpeed(999999); // Pause for highlight
                    injectWinnerToCenter(result);
                    setHighlightedId(result.id);
                }

                finale(results.length);

                // Resume ticker after 5 seconds
                setTimeout(() => {
                    setTickerSpeed(800);
                    setTickerMood('normal');
                }, 5000);
            }

            // Immediately remove winner(s) from local candidates if not allowMultipleWins
            if (!selectedPrize?.allowMultipleWins) {
                const winnerIds = new Set(results.map(r => r.id));
                setCandidates(prev => prev.filter(c => !winnerIds.has(c.id)));
            }

            setSpinning(false);
            spinningRef.current = false;
            loadData(); // Refresh prize list to update counts
        } catch (e: any) {
            clearInterval(interval);
            stopSound(audioRollRef);
            stopSound(audioTensionRef);
            setSpinning(false);
            spinningRef.current = false;
            setTickerSpeed(800);
            setTickerMood('normal');
            setIsGlitching(false);
            setDrawError(e.message || 'Gagal mengundi pemenang');
            setTimeout(() => setDrawError(null), 5000);
        }
    };

    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (isFullscreen) document.body.classList.add('hide-top-nav');
        else document.body.classList.remove('hide-top-nav');
        return () => document.body.classList.remove('hide-top-nav');
    }, [isFullscreen]);

    const selectedPrize = prizes.find(p => p.id === selectedPrizeId);
    const isSoldOut = selectedPrize ? selectedPrize.winners.length >= selectedPrize.quantity : false;

    if (loading) return <div className="min-h-[100dvh] flex items-center justify-center text-brand-text">Memuat...</div>;

    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <audio ref={audioRollRef} src={toApiUrl(eventCfg?.rollSoundUrl || "/sounds/roll.mp3")} preload="auto" />
            <audio ref={audioTensionRef} src={toApiUrl(eventCfg?.tensionSoundUrl || "/sounds/tension.mp3")} preload="auto" />
            <audio ref={audioWinRef} src={toApiUrl(eventCfg?.winSoundUrl || "/sounds/win.mp3")} preload="auto" />
            <audio ref={audioGrandWinRef} src={toApiUrl(eventCfg?.grandWinSoundUrl || "/sounds/grand-win.mp3")} preload="auto" />

            {/* Controls */}
            <div className="fixed top-6 right-6 z-[60] flex flex-col gap-2">
                <Button size="sm" variant={isFullscreen ? 'primary' : 'outline'} onClick={() => setIsFullscreen(!isFullscreen)} aria-label={isFullscreen ? 'Tampilkan navigasi' : 'Sembunyikan navigasi'}>
                    <Monitor size={20} />
                </Button>
                <Button size="sm" variant={soundEnabled ? 'primary' : 'outline'} onClick={toggleSound} aria-label={soundEnabled ? 'Matikan suara' : 'Aktifkan suara'}>
                    {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </Button>
            </div>

            {/* Mode Selector Dropdown */}
            <div className="fixed top-6 left-6 z-[60]">
                <select
                    onChange={(e) => {
                        if (e.target.value === 'slot') {
                            window.location.href = '/luckydraw/display';
                        } else if (e.target.value === 'carousel') {
                            window.location.href = '/luckydraw/carousel';
                        }
                    }}
                    value="classic"
                    className="bg-brand-bgElevated/80 border border-brand-primary/50 text-brand-primarySoft text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary backdrop-blur-xl transition-all shadow-lg font-mono tracking-wider cursor-pointer"
                >
                    <option value="classic">🎲 Classic Mode</option>
                    <option value="slot">🎰 Slot Machine Mode</option>
                    <option value="carousel">🎡 3D Carousel Mode</option>
                </select>
            </div>

            {/* Sound initiation banner */}
            {!soundEnabled && !loading && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-brand-warning/20 backdrop-blur-sm border-b border-brand-warning/30 px-4 py-2 flex items-center justify-between">
                    <span className="text-brand-warning text-sm">Enable sound for the full experience</span>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={toggleSound} className="px-3 py-1 text-xs">Enable</Button>
                        <Button size="sm" variant="outline" onClick={() => setSoundEnabled(true)} className="px-3 py-1 text-xs">Dismiss</Button>
                    </div>
                </div>
            )}

            {/* Grand prize effects are preserved but scoped */}
            {screenFlash && <div className="fixed inset-0 z-50 bg-white pointer-events-none animate-[screen-flash_0.3s_ease-out]" />}
            {darkReveal && <div className="dark-reveal pointer-events-none" />}

            <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8">
                {/* Header */}
                <div className="w-full text-center space-y-4 pt-2">
                    {eventCfg?.logoUrl && (
                        <img src={toApiUrl(eventCfg.logoUrl)} className="h-16 md:h-24 mx-auto mb-4" alt="logo" />
                    )}
                    <h1 className="text-3xl md:text-5xl font-heading font-semibold text-brand-text tracking-tight">
                        Lucky Draw
                    </h1>
                    <div className="flex flex-col items-center gap-2">
                        <select
                            value={selectedPrizeId}
                            onChange={(e) => {
                                setSelectedPrizeId(e.target.value);
                                setWinner(null);
                                setDisplayCandidate(null);
                                setHighlightedId(null);
                                setDrawCount(1);
                            }}
                            className="bg-brand-bgElevated border border-brand-border text-brand-text text-base md:text-lg rounded-xl px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer"
                        >
                            {prizes.map(p => (
                                <option key={p.id} value={p.id} className="bg-brand-bgElevated text-brand-text">
                                    {p.name} ({p.winners.length}/{p.quantity})
                                </option>
                            ))}
                        </select>
                        <span className="text-xs text-brand-textDim">Pilih hadiah — angka di kurung = sudah dibagikan / total tersedia</span>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 md:gap-10 w-full items-start">
                    <div className={`w-full lg:w-[55%] text-center flex flex-col ${screenShake ? 'animate-screen-shake' : ''}`}>
                        <div className="surface p-6 md:p-10 flex flex-col items-center justify-center min-h-[520px]">
                            {selectedPrize && (
                                <div className="mb-6 text-center">
                                    <h2 className="text-xl md:text-2xl font-semibold text-brand-text mb-1">{selectedPrize.name}</h2>
                                    {selectedPrize.description && <p className="text-sm text-brand-textMuted">{selectedPrize.description}</p>}
                                </div>
                            )}

                            <div className={`w-full min-h-[260px] bg-black rounded-2xl border flex flex-col items-center justify-center p-6 mb-6 transition-colors ${winner ? 'border-brand-primary winner-card' : 'border-brand-border'}`}>
                                {displayCandidate ? (
                                    <div className="text-center space-y-4">
                                        {winner && (
                                            <div className="text-label uppercase tracking-[0.35em] text-brand-primary">
                                                Pemenang
                                            </div>
                                        )}
                                        {winner && displayCandidate.photoUrl && (
                                            <img
                                                src={toApiUrl(displayCandidate.photoUrl)}
                                                alt=""
                                                className="mx-auto h-24 w-24 rounded-full object-cover border-2 border-brand-primary"
                                            />
                                        )}
                                        <div className="text-4xl md:text-6xl font-bold text-brand-primary tracking-wider">
                                            {displayCandidate.guestId || displayCandidate.queueNumber}
                                        </div>
                                        <div className="space-y-1">
                                            <div className={`text-2xl md:text-4xl font-semibold text-brand-text uppercase tracking-tight ${isGlitching ? 'animate-pulse' : ''}`}>
                                                {displayCandidate.name}
                                            </div>
                                            <div className="text-lg text-brand-textMuted font-mono uppercase tracking-wider">
                                                {displayCandidate.company || '-'}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-brand-textMuted flex flex-col items-center gap-3">
                                        <Trophy size={56} />
                                        <p className="text-sm">Pilih hadiah dan tekan tombol untuk mengundi</p>
                                    </div>
                                )}
                            </div>

                            {/* Screen readers get the result without watching the animation */}
                            <p aria-live="polite" className="sr-only">
                                {winner ? `Pemenang ${selectedPrize?.name}: ${winner.name}` : ''}
                            </p>

                            <div className="flex flex-col items-center gap-4 w-full">
                                {drawError && (
                                    <div className="w-full p-3 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm text-center">
                                        {drawError}
                                    </div>
                                )}
                                {selectedPrize?.category === 'HIBURAN' && !spinning && !isSoldOut && (
                                    <div className="flex items-center gap-3 p-2 rounded-xl border border-brand-border bg-black/30">
                                        <label className="text-sm text-brand-textMuted pl-3">Jumlah pemenang:</label>
                                        <div className="group relative">
                                            <HelpCircle size={14} className="text-brand-textDim cursor-help" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-brand-bgElevated border border-brand-border rounded-lg text-xs text-brand-text shadow-panel w-56 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
                                                Berapa pemenang yang diundi sekaligus. Pilih cepat (1, 5, 10, 20) atau ketik angka custom. Grand Prize (UTAMA) selalu 1 pemenang.
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {[1, 5, 10, 20].map(n => (
                                                <button
                                                    key={n}
                                                    onClick={() => setDrawCount(n)}
                                                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm transition-colors ${drawCount === n ? 'bg-brand-primary text-brand-bg' : 'bg-brand-text/5 text-brand-textMuted hover:bg-brand-text/10'}`}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                            <input
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={drawCount}
                                                onChange={(e) => setDrawCount(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-16 h-9 bg-brand-text/5 border border-brand-border rounded-lg text-center text-brand-text text-sm focus:outline-none focus:border-brand-primary"
                                            />
                                        </div>
                                    </div>
                                )}

                                {(() => {
                                    const drama = DRAMA_CONFIGS[selectedPrize?.category || 'HIBURAN'] || DRAMA_CONFIGS.HIBURAN;
                                    return (
                                        <Button
                                            size="lg"
                                            onClick={handleDraw}
                                            disabled={spinning || isSoldOut || !selectedPrizeId}
                                            loading={spinning}
                                            className={drama.buttonExtraClass}
                                        >
                                            {isSoldOut ? 'Habis Terbagi' : (drawCount > 1 && selectedPrize?.category === 'HIBURAN' ? `Undi ${drawCount} Pemenang` : drama.buttonLabel)}
                                        </Button>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-center">
                            <Button variant="outline" onClick={() => setShowHistory(true)} className="text-brand-text">
                                <History size={18} />
                                Riwayat Pemenang
                            </Button>
                        </div>
                    </div>

            {/* Multi Winner Modal */}
            <Modal
                open={showMultiWinnerModal}
                onClose={() => { if (!isRevealing) { setShowMultiWinnerModal(false); setMultiWinners([]); setTotalExpectedWinners(0); } }}
                className="max-w-6xl max-h-[90vh]"
                title={
                    <span className="text-center w-full block">
                        <span className="block text-2xl md:text-4xl font-heading font-semibold text-brand-text">Selamat!</span>
                        <span className="block text-sm text-brand-textMuted mt-1">
                            {isRevealing ? `${multiWinners.length} / ${totalExpectedWinners} pemenang ${selectedPrize?.name}` : `${multiWinners.length} pemenang ${selectedPrize?.name}`}
                        </span>
                    </span>
                }
                footer={
                    <Button
                        onClick={() => { setShowMultiWinnerModal(false); setMultiWinners([]); setTotalExpectedWinners(0); }}
                        disabled={isRevealing}
                        className="w-full"
                    >
                        {isRevealing ? `Mengungkap pemenang... (${multiWinners.length}/${totalExpectedWinners})` : 'Tutup'}
                    </Button>
                }
            >
                <div className={`relative ${multiWinners.length > 15 && !isRevealing ? 'overflow-hidden' : 'overflow-y-auto max-h-[50vh]'}`}>
                    {multiWinners.length > 15 && !isRevealing && (
                        <style dangerouslySetInnerHTML={{ __html: `
                            @keyframes modalAutoScroll { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
                            .modal-scroll { animation: modalAutoScroll 40s linear infinite; }
                        `}} />
                    )}
                    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 ${multiWinners.length > 15 && !isRevealing ? 'modal-scroll' : ''}`}>
                        {multiWinners.map((w) => (
                            <div key={w.id} className="surface p-4 text-center">
                                <div className="text-brand-primary font-mono font-bold text-lg mb-1">{w.guestId || w.queueNumber}</div>
                                <div className="font-semibold text-brand-text text-lg leading-tight line-clamp-2">{w.name}</div>
                                <div className="text-xs text-brand-textMuted uppercase tracking-wider mt-1">{w.company || '-'}</div>
                            </div>
                        ))}
                        {multiWinners.length > 15 && !isRevealing && multiWinners.map((w) => (
                            <div key={`dup-${w.id}`} className="surface p-4 text-center">
                                <div className="text-brand-primary font-mono font-bold text-lg mb-1">{w.guestId || w.queueNumber}</div>
                                <div className="font-semibold text-brand-text text-lg leading-tight line-clamp-2">{w.name}</div>
                                <div className="text-xs text-brand-textMuted uppercase tracking-wider mt-1">{w.company || '-'}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>


                {/* Right panel: ticker + winners */}
                <div className="w-full lg:w-[45%] flex flex-col gap-6">
                    <div className={`bg-brand-surface/80 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col h-[520px] ${tickerMood === 'tension' ? 'border-brand-primary/40 ticker-mood-tension' : ''}`}>
                        <div className="px-4 py-3 border-b border-brand-border flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-brand-danger animate-pulse" />
                                <span className="text-sm font-medium text-brand-text">Peserta Berhak</span>
                            </div>
                            <div className="text-sm font-mono text-brand-textMuted">
                                {candidates.length.toLocaleString()} tamu
                            </div>
                        </div>

                        <div className="flex-1 min-h-[280px] relative p-3 space-y-2 overflow-hidden flex flex-col justify-center">
                            {tickerNames.map((g, idx) => {
                                const isHighlighted = highlightedId === g.id;
                                // On reveal, everything except the winner row recedes.
                                const recede = !!winner && !isHighlighted;
                                return (
                                    <div
                                        key={`${g.id}-${idx}`}
                                        className={`px-3 py-2.5 rounded-lg border flex items-center gap-3 transition-all duration-smooth animate-ticker-swap
                                            ${isHighlighted
                                                ? 'bg-brand-primary/10 border-brand-primary z-10 animate-winner-glow'
                                                : 'bg-brand-text/5 border-brand-border opacity-80'}
                                            ${recede ? 'blur-[2px] opacity-30' : ''}
                                        `}
                                    >
                                        <div className={`font-bold text-xs font-mono flex-shrink-0 ${isHighlighted ? 'text-brand-primary' : 'text-brand-primary/70'}`}>
                                            {g.guestId || g.queueNumber}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-semibold truncate ${isHighlighted ? 'text-brand-text text-base' : 'text-brand-text'}`}>{g.name}</div>
                                            <div className="text-xs text-brand-textMuted truncate">{g.company || '-'}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="px-4 py-3 border-t border-brand-border">
                            <div className="flex justify-between text-xs text-brand-textMuted mb-2 font-mono">
                                <span>Hadir: {candidates.length}</span>
                                <span>Menang: {prizes.reduce((acc, p) => acc + p.winners.length, 0)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-brand-text/10 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-primary" style={{ width: `${Math.max(0, 100 - (prizes.reduce((acc, p) => acc + p.winners.length, 0) / (candidates.length || 1) * 100))}%` }} />
                            </div>
                        </div>

                        <button
                            onClick={() => setShowEligiblePanel(true)}
                            className="w-full py-4 border-t border-brand-border text-brand-primary text-sm font-medium transition-colors hover:bg-brand-text/5 flex items-center justify-center gap-2"
                        >
                            <Users size={18} />
                            Lihat Semua {candidates.length.toLocaleString()} Tamu
                        </button>
                    </div>

                    {selectedPrize && selectedPrize.winners.length > 0 && (
                        <div className="w-full">
                            <h3 className="text-base font-semibold text-brand-text mb-3 flex items-center gap-2">
                                <PartyPopper className="text-brand-primary" size={20} /> Pemenang {selectedPrize.name}
                            </h3>
                            <div className="flex flex-col gap-2">
                                {selectedPrize.winners.map((w: any) => (
                                    <div key={w.id} className="surface p-3 flex items-center gap-3">
                                        <div className="font-bold text-brand-primary text-xs font-mono shrink-0">{w.guestId || w.queueNumber}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-brand-text text-sm truncate">{w.name}</div>
                                            <div className="text-xs text-brand-textMuted truncate">{w.company || '-'}{w.division && <span> ({w.division})</span>}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

            <WinnerHistoryModal 
                isOpen={showHistory} 
                onClose={() => setShowHistory(false)} 
                prizes={prizes}
                logoUrl={eventCfg?.logoUrl}
            />

            {/* Eligible Guests Modal */}
            <Modal
                open={showEligiblePanel}
                onClose={() => setShowEligiblePanel(false)}
                className="max-w-4xl"
                title={
                    <span className="flex items-center gap-2">
                        <Users className="text-brand-primary" size={20} />
                        Daftar Tamu
                        <span className="text-sm font-mono text-brand-textMuted ml-2">({eligibleMeta.eligible} berhak)</span>
                    </span>
                }
            >
                <div className="space-y-3">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama, perusahaan, atau nomor antrian..."
                            className="pl-10"
                        />
                    </div>
                    <div className="relative">
                        <Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted" />
                        <Input
                            value={searchGuestId}
                            onChange={(e) => setSearchGuestId(e.target.value)}
                            placeholder="Cari ID Tamu (contoh: G001, INV-0042)..."
                            className="pl-10 font-mono"
                        />
                    </div>

                    <div className="flex gap-2 pt-1">
                        <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>Semua ({eligibleMeta.totalCheckedIn})</TabButton>
                        <TabButton active={activeTab === 'eligible'} onClick={() => setActiveTab('eligible')}>Berhak ({eligibleMeta.eligible})</TabButton>
                        <TabButton active={activeTab === 'won'} onClick={() => setActiveTab('won')}>Menang ({eligibleMeta.won})</TabButton>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-brand-textDim px-1">
                        <HelpCircle size={13} className="shrink-0 mt-0.5" />
                        <span>Semua = tamu yang sudah check-in. Berhak = bisa ikut undian (belum menang hadiah apapun). Menang = sudah pernah menang. Jika "allowMultipleWins" aktif, tamu yang sudah menang tetap berhak.</span>
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto space-y-2 pt-1">
                        {eligibleLoading && (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-6 h-6 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                            </div>
                        )}
                        {!eligibleLoading && eligibleData.map(guest => (
                            <div key={guest.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${guest.wonPrizes.length > 0 ? 'bg-brand-primary/5 border-brand-primary/20' : 'bg-brand-text/5 border-brand-border'}`}>
                                <div className="font-bold text-xs font-mono text-brand-primary shrink-0">{guest.guestId || guest.queueNumber}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-brand-text text-sm truncate">{guest.name}</div>
                                    <div className="text-xs text-brand-textMuted truncate">{guest.company || '-'}{guest.division && <span> ({guest.division})</span>}</div>
                                </div>
                                {guest.wonPrizes.length > 0 ? (
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-brand-primary/15 text-brand-primary text-xs font-mono whitespace-nowrap">
                                        <Award size={12} />
                                        <span className="truncate max-w-[120px]">{guest.wonPrizes.join(', ')}</span>
                                    </div>
                                ) : (
                                    <div className="px-2 py-1 rounded-full bg-brand-success/15 text-brand-success text-xs font-mono">Berhak</div>
                                )}
                            </div>
                        ))}
                        {!eligibleLoading && eligibleData.length === 0 && (
                            <div className="text-center py-10 text-brand-textMuted">
                                <Users className="mx-auto mb-2 opacity-50" size={28} />
                                Tidak ada tamu yang cocok.
                            </div>
                        )}
                        {eligibleMeta.page < eligibleMeta.totalPages && (
                            <div ref={listEndRef} className="flex justify-center py-3">
                                {loadingMore ? (
                                    <div className="flex items-center gap-2 text-brand-textMuted text-sm">
                                        <div className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                                        Memuat lagi...
                                    </div>
                                ) : (
                                    <Button variant="outline" size="sm" onClick={() => fetchEligibleGuests(eligibleMeta.page + 1, true)}>
                                        Muat {Math.min(PAGE_SIZE, eligibleMeta.total - eligibleData.length)} tamu lagi
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between text-xs text-brand-textMuted pt-2 border-t border-brand-border">
                        <span>Hadir: {eligibleMeta.totalCheckedIn}</span>
                        <span>Berhak: {eligibleMeta.eligible}</span>
                        <span>Menang: {eligibleMeta.won}</span>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-brand-primary/15 text-brand-primary' : 'text-brand-textMuted hover:text-brand-text hover:bg-brand-text/5'}`}
        >
            {children}
        </button>
    );
}
