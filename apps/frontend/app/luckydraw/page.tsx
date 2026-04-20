"use client";
import { useEffect, useState, useRef, useMemo } from 'react';
import { apiFetch, apiBase, toApiUrl } from '../../lib/api';
import { Trophy, Sparkles, PartyPopper, History, X, Users, Search, Award, Hash, Volume2, VolumeX } from 'lucide-react';
import confetti from 'canvas-confetti';

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
    confettiCount: number;
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
        confettiCount: 100,
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
        confettiCount: 300,
        enableScreenFlash: true,
        enableDarkReveal: true,
        enableScreenShake: true,
        enableScanlines: true,
        buttonLabel: '◆ GRAND PRIZE ◆',
        buttonExtraClass: 'animate-grand-pulse ring-2 ring-red-500/50',
    },
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

import { useSSE } from '../../lib/sse-context';

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

    const PAGE_SIZE = 50;

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
        const drama = DRAMA_CONFIGS.UTAMA;

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
        setScreenShake(false);
        await sleep(2000);

        // REVEAL with Screen Flash
        setTickerSpeed(999999);
        setIsGlitching(false);
        clearInterval(drawInterval);
        stopSound(audioTensionRef);
        playSound(audioGrandWinRef);
        setScreenFlash(true);
        await sleep(300);
        setScreenFlash(false);

        setDarkReveal(true);
        await sleep(500);

        injectWinnerToCenter(winnerGuest);
        setDisplayCandidate(winnerGuest);
        setWinner(winnerGuest);
        setHighlightedId(winnerGuest.id);

        // --- EPIC CELEBRATION SEQUENCES ---
        
        // 1. Center Blast
        confetti({
            particleCount: 800,
            spread: 160,
            startVelocity: 70,
            origin: { y: 0.5, x: 0.5 },
            colors: ['#FFD700', '#FFA500', '#FFFFFF', '#FF4500', '#1E3A8A'],
            ticks: 400
        });

        // 2. Left & Right Side Cannons
        const end = Date.now() + (3 * 1000);
        const colors = ['#FFD700', '#FFFFFF'];

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.6 },
                colors: colors
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.6 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());

        // 3. Gold Dust Rain
        setTimeout(() => {
            confetti({
                particleCount: 300,
                spread: 360,
                startVelocity: 30,
                origin: { y: 0.2, x: 0.5 },
                colors: ['#FFD700', '#FFFFFF', '#F0E68C']
            });
        }, 1000);

        await sleep(5000);
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
                    setMultiWinners(results);
                    setShowMultiWinnerModal(true);
                    setDisplayCandidate(result); // Show first one in main box
                } else {
                    setDisplayCandidate(result);
                    setWinner(result);
                    setTickerSpeed(300);
                    await sleep(500);
                    setTickerSpeed(999999); // Pause for highlight
                    injectWinnerToCenter(result);
                    setHighlightedId(result.id);
                }

                confetti({
                    particleCount: drama.confettiCount * (results.length > 1 ? 2 : 1),
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#FFA500', '#FF69B4', '#00FF00', '#00BFFF']
                });

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
            alert(e.message || 'Gagal mengundi pemenang');
        }
    };

    const selectedPrize = prizes.find(p => p.id === selectedPrizeId);
    const isSoldOut = selectedPrize ? selectedPrize.winners.length >= selectedPrize.quantity : false;

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Audio Elements */}
            <audio ref={audioRollRef} src={toApiUrl(eventCfg?.rollSoundUrl || "/sounds/roll.mp3")} preload="auto" />
            <audio ref={audioTensionRef} src={toApiUrl(eventCfg?.tensionSoundUrl || "/sounds/tension.mp3")} preload="auto" />
            <audio ref={audioWinRef} src={toApiUrl(eventCfg?.winSoundUrl || "/sounds/win.mp3")} preload="auto" />
            <audio ref={audioGrandWinRef} src={toApiUrl(eventCfg?.grandWinSoundUrl || "/sounds/grand-win.mp3")} preload="auto" />

            {/* Sound Toggle Floating Button */}
            <div className="fixed top-6 right-6 z-[70] flex flex-col gap-2">
                <button
                    onClick={toggleSound}
                    className={`p-4 rounded-full backdrop-blur-xl border transition-all shadow-2xl ${
                        soundEnabled 
                        ? 'bg-brand-primary/20 border-brand-primary text-brand-primarySoft' 
                        : 'bg-black/40 border-white/10 text-white/40'
                    }`}
                    title={soundEnabled ? 'Matikan Suara' : 'Aktifkan Suara'}
                >
                    {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                </button>
            </div>

            {/* Sound Initiation Overlay (for browser compliance) */}
            {!soundEnabled && !loading && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-700">
                    <button 
                        onClick={toggleSound}
                        className="group relative bg-brand-secondary/80 border-2 border-brand-primary/50 p-12 rounded-[3rem] flex flex-col items-center gap-6 hover:border-brand-primary transition-all hover:scale-105 shadow-[0_0_100px_rgba(212,168,83,0.2)]"
                    >
                        <div className="w-24 h-24 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-brand-secondary transition-all">
                            <Volume2 size={48} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-widest font-mono">Enable Audio Experience</h3>
                            <p className="text-white/40 font-mono text-sm uppercase tracking-wider">Click anywhere to start with sound</p>
                        </div>
                    </button>
                </div>
            )}

            {/* Dynamic Background */}
            {eventCfg?.backgroundType === 'IMAGE' && eventCfg?.backgroundImageUrl && (
                <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${toApiUrl(eventCfg.backgroundImageUrl)})` }} />
            )}
            {eventCfg?.backgroundType === 'VIDEO' && eventCfg?.backgroundVideoUrl && (
                <video className="absolute inset-0 w-full h-full object-cover" src={toApiUrl(eventCfg.backgroundVideoUrl)} muted loop autoPlay playsInline />
            )}
            {/* Overlay */}
            <div className="absolute inset-0 bg-black" style={{ opacity: eventCfg?.overlayOpacity ?? 0.5 }} />

            {/* Default Gradient Fallback if no background */}
            {(!eventCfg?.backgroundType || eventCfg?.backgroundType === 'NONE') && (
                <div className="absolute inset-0 bg-gradient-to-br from-brand-secondary via-[#1e1a30] to-brand-secondary" />
            )}

            {/* Background Effects (only if no custom background) */}
            {(!eventCfg?.backgroundType || eventCfg?.backgroundType === 'NONE') && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-brand-primary/15 rounded-full blur-[120px]" />
                    <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-brand-accent/15 rounded-full blur-[100px]" />
                </div>
            )}

            {/* Screen Flash Overlay */}
            {screenFlash && (
                <div className="fixed inset-0 z-[60] bg-white pointer-events-none animate-[screen-flash_0.3s_ease-out]" />
            )}

            {/* Dark Reveal Overlay */}
            {darkReveal && (
                <div className="dark-reveal pointer-events-none" />
            )}

            <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
                
                {/* Panel Kiri: Mesin Undian (60%) */}
                <div className={`flex-[6] text-center space-y-8 ${screenShake ? 'animate-screen-shake' : ''}`}>
                    {/* Header / Prize Selector */}
                    <div className="space-y-4">
                        {eventCfg?.logoUrl && (
                            <img src={toApiUrl(eventCfg.logoUrl)} className="h-20 mx-auto mb-4 drop-shadow-2xl" alt="logo" />
                        )}
                        <h1 className="text-4xl md:text-6xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-b from-brand-primarySoft via-brand-primary to-brand-accent drop-shadow-[0_10px_30px_rgba(212,168,83,0.3)] tracking-[0.1em] uppercase">
                            LUCKY DRAW
                        </h1>

                        <div className="flex justify-center gap-6 mt-8 mb-8">
                            <select
                                value={selectedPrizeId}
                                onChange={(e) => {
                                    setSelectedPrizeId(e.target.value);
                                    setWinner(null);
                                    setDisplayCandidate(null);
                                    setHighlightedId(null);
                                }}
                                className="bg-brand-secondary/40 border border-brand-primary/20 text-brand-primarySoft text-lg md:text-xl rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 backdrop-blur-xl transition-all hover:bg-brand-secondary/60 cursor-pointer font-mono tracking-widest uppercase shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                            >
                                {prizes.map(p => (
                                    <option key={p.id} value={p.id} className="bg-brand-secondary text-brand-surface font-sans">
                                        {p.name} ({p.winners.length}/{p.quantity})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Main Slot Machine Area */}
                    <div className="relative group mx-auto">
                        <div className="absolute -inset-2 bg-gradient-to-r from-brand-primary/40 to-brand-accent/40 rounded-[2rem] blur-2xl opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                        <div className="relative bg-brand-secondary/80 backdrop-blur-2xl border border-brand-primary/20 rounded-[2rem] p-8 md:p-12 flex flex-col items-center justify-center min-h-[400px] shadow-2xl">

                            {selectedPrize && (
                                <div className="mb-8 text-center">
                                    <h2 className="text-2xl md:text-3xl font-heading font-bold text-brand-primarySoft mb-2 tracking-widest uppercase">{selectedPrize.name}</h2>
                                    {selectedPrize.description && <p className="text-brand-surface/50 font-mono tracking-wider">{selectedPrize.description}</p>}
                                </div>
                            )}

                            {/* Display Area */}
                            <div className="w-full min-h-[300px] bg-black/60 rounded-3xl border border-brand-primary/30 flex flex-col items-center justify-center p-6 relative overflow-hidden mb-8 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
                                {displayCandidate ? (
                                    <div className={`text-center space-y-6 transition-all duration-300 ${winner ? 'scale-110' : ''}`}>
                                        {/* Foto or Queue Number Placeholder */}
                                        <div className="w-32 h-32 md:w-40 md:h-40 bg-brand-primary/20 rounded-full mx-auto flex items-center justify-center border-4 border-brand-primary/40 shadow-[0_0_50px_rgba(212,168,83,0.2)]">
                                            <span className="text-4xl md:text-6xl font-black text-brand-primary">{displayCandidate.queueNumber}</span>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className={`text-3xl md:text-5xl font-black text-white uppercase tracking-tighter transition-all duration-500 ${isGlitching ? 'animate-pulse' : ''}`}>
                                                {displayCandidate.name}
                                            </div>
                                            <div className="text-xl md:text-2xl text-brand-primarySoft font-mono tracking-widest uppercase">
                                                {displayCandidate.company || '-'}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-brand-surface/20 flex flex-col items-center gap-4">
                                        <Trophy size={80} className="animate-pulse" />
                                        <p className="font-mono tracking-[0.3em] uppercase text-center text-sm">Pilih hadiah & tekan tombol untuk mengundi</p>
                                    </div>
                                )}
                            </div>

                            {/* Action Area */}
                            <div className="flex flex-col items-center gap-6 w-full">
                                {selectedPrize?.category === 'HIBURAN' && !spinning && !isSoldOut && (
                                    <div className="flex items-center gap-4 bg-black/40 p-2 pl-6 rounded-full border border-white/10 backdrop-blur-xl">
                                        <label className="text-sm font-mono text-white/60 uppercase tracking-widest">Draw Count:</label>
                                        <div className="flex items-center gap-2">
                                            {[1, 5, 10, 20].map(n => (
                                                <button
                                                    key={n}
                                                    onClick={() => setDrawCount(n)}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${drawCount === n ? 'bg-brand-primary text-brand-secondary' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
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
                                                className="w-16 h-10 bg-white/5 border border-white/10 rounded-full text-center text-white focus:outline-none focus:border-brand-primary"
                                            />
                                        </div>
                                    </div>
                                )}

                                {(() => {
                                    const drama = DRAMA_CONFIGS[selectedPrize?.category || 'HIBURAN'] || DRAMA_CONFIGS.HIBURAN;
                                    return (
                                        <button
                                            onClick={handleDraw}
                                            disabled={spinning || isSoldOut || !selectedPrizeId}
                                            className={`
                                                relative px-12 py-5 rounded-full font-bold text-xl md:text-2xl font-mono tracking-[0.2em] uppercase transition-all duration-300 transform hover:scale-105 active:scale-95
                                                ${spinning
                                                    ? 'bg-brand-border/50 text-brand-textMuted cursor-not-allowed border border-brand-border'
                                                    : isSoldOut
                                                        ? 'bg-brand-danger/20 text-brand-danger cursor-not-allowed border border-brand-danger/30'
                                                        : `bg-gradient-to-r from-brand-primary to-brand-accent text-brand-secondary shadow-[0_0_50px_rgba(212,168,83,0.4)] hover:shadow-[0_0_80px_rgba(212,168,83,0.6)] border border-brand-primarySoft/50 ${drama.buttonExtraClass}`
                                                }
                                            `}
                                        >
                                            {spinning ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="animate-spin">🎲</span>
                                                    {drama === DRAMA_CONFIGS.UTAMA ? 'MENGUNDI GRAND PRIZE...' : `MENGUNDI ${drawCount} PEMENANG...`}
                                                </span>
                                            ) : isSoldOut ? (
                                                'Habis Terbagi'
                                            ) : (
                                                drawCount > 1 && selectedPrize?.category === 'HIBURAN' ? `UNDI ${drawCount} PEMENANG` : drama.buttonLabel
                                            )}
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>
                        </div>

                        {/* Multi Winner Modal */}            {showMultiWinnerModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-brand-primary/20 rounded-full blur-[120px] animate-pulse" />
                        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-brand-accent/20 rounded-full blur-[120px] animate-pulse" />
                    </div>

                    <div className="relative bg-brand-secondary/40 border border-brand-primary/30 rounded-[3rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(212,168,83,0.2)] animate-in zoom-in duration-500">
                        <div className="p-8 md:p-12 text-center border-b border-white/10">
                            <h2 className="text-4xl md:text-6xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-b from-brand-primarySoft via-brand-primary to-brand-accent drop-shadow-2xl tracking-tighter uppercase mb-2">
                                CONGRATULATIONS!
                            </h2>
                            <p className="text-xl md:text-2xl text-white/60 font-mono tracking-[0.3em] uppercase">
                                {multiWinners.length} PEMENANG {selectedPrize?.name}
                            </p>
                        </div>

                        <div className="p-8 md:p-12 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {multiWinners.map((w, idx) => (
                                    <div 
                                        key={w.id} 
                                        className="group bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-5 transition-all duration-500 hover:bg-white/10 hover:border-brand-primary/50 hover:scale-[1.02] animate-in slide-in-from-bottom duration-500"
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-brand-primary/20 flex items-center justify-center font-bold text-2xl text-brand-primary shadow-inner group-hover:bg-brand-primary group-hover:text-brand-secondary transition-colors duration-500">
                                            {w.queueNumber}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-xl text-white truncate group-hover:text-brand-primarySoft transition-colors">{w.name}</div>
                                            <div className="text-sm text-white/40 truncate group-hover:text-white/60 transition-colors uppercase tracking-wider font-mono">
                                                {w.company || '-'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 md:p-12 text-center border-t border-white/10 bg-black/20">
                            <button
                                onClick={() => {
                                    setShowMultiWinnerModal(false);
                                    setMultiWinners([]);
                                }}
                                className="px-16 py-4 bg-brand-primary text-brand-secondary rounded-full font-bold text-xl font-mono tracking-widest uppercase hover:bg-brand-primarySoft transition-all hover:scale-105 shadow-[0_0_40px_rgba(212,168,83,0.3)]"
                            >
                                CLOSE & CONTINUE
                            </button>
                        </div>
                    </div>
                </div>
            )}

                    {/* Winners List for this Prize */}
                    {selectedPrize && selectedPrize.winners.length > 0 && (
                        <div className="mt-8 pb-8">
                            <h3 className="text-lg font-bold text-brand-surface mb-4 flex items-center justify-center gap-2">
                                <PartyPopper className="text-brand-primary" /> Pemenang {selectedPrize.name}
                            </h3>
                            <div className="flex flex-wrap justify-center gap-3">
                                {selectedPrize.winners.map((w: any) => (
                                    <div key={w.id} className="bg-brand-surface/10 backdrop-blur-sm border border-brand-primary/20 rounded-xl p-3 flex items-center gap-3 min-w-[200px]">
                                        <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center font-bold text-brand-primary text-sm">
                                            {w.queueNumber}
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-brand-surface text-sm">{w.name}</div>
                                            <div className="text-xs text-brand-surface/60">
                                                {w.company || '-'}
                                                {w.division && <span className="ml-1">({w.division})</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Panel Kanan: Ticker & Actions (40%) */}
                <div className="flex-[4] flex flex-col gap-6">
                    {/* Ticker Box */}
                    <div className={`relative rounded-3xl overflow-hidden border border-brand-primary/30 shadow-2xl flex flex-col bg-brand-secondary/90 backdrop-blur-2xl transition-colors duration-1000 ${tickerMood === 'tension' ? 'ticker-mood-tension border-red-500/50' : ''}`}>
                        {/* Scanline overlay if tension */}
                        {tickerMood === 'tension' && <div className="scanline-overlay z-20" />}

                        {/* Ticker Header */}
                        <div className="px-6 py-4 border-b border-brand-primary/20 flex justify-between items-center bg-black/40 relative z-10">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                <span className="font-bold font-mono tracking-widest text-brand-surface text-sm">LIVE ELIGIBLE</span>
                            </div>
                            <div className="font-mono text-brand-primarySoft text-sm font-bold">
                                {candidates.length.toLocaleString()} NAMES
                            </div>
                        </div>

                        {/* Ticker List */}
                        <div className="flex-1 min-h-[350px] relative z-10 p-4 space-y-2 overflow-hidden flex flex-col justify-center">
                            {/* Blur gradients */}
                            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-brand-secondary/90 to-transparent z-20 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-brand-secondary/90 to-transparent z-20 pointer-events-none" />

                            {tickerNames.map((g, idx) => {
                                const isHighlighted = highlightedId === g.id;
                                // Use a composite key to handle same ID appearing in different positions/times if duplication filter somehow allows it
                                // But id+index is better for stable animations in high-speed rolling
                                return (
                                    <div 
                                        key={`${g.id}-${idx}`}
                                        className={`px-4 py-3 rounded-xl border flex items-center gap-3 transition-all duration-300 animate-ticker-swap
                                            ${isHighlighted 
                                                ? 'bg-brand-primary/20 border-brand-primary scale-105 shadow-[0_0_20px_rgba(212,168,83,0.3)] z-30' 
                                                : 'bg-black/40 border-brand-border opacity-70 scale-95'}
                                        `}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${isHighlighted ? 'bg-brand-primary text-brand-secondary' : 'bg-brand-primary/10 text-brand-primary'}`}>
                                            {g.queueNumber}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-bold truncate ${isHighlighted ? 'text-brand-primarySoft text-lg' : 'text-brand-surface'}`}>{g.name}</div>
                                            <div className="text-xs text-brand-surface/50 truncate">
                                                {g.company || '-'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Stats Footer */}
                        <div className="px-6 py-4 bg-black/40 border-t border-brand-primary/20 relative z-10">
                            <div className="flex justify-between text-xs text-brand-surface/60 mb-2 font-mono">
                                <span>Hadir: {candidates.length}</span>
                                <span>Menang: {prizes.reduce((acc, p) => acc + p.winners.length, 0)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-brand-surface/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-brand-primary" 
                                    style={{ width: `${Math.max(0, 100 - (prizes.reduce((acc, p) => acc + p.winners.length, 0) / (candidates.length || 1) * 100))}%` }} 
                                />
                            </div>
                        </div>

                        {/* View All Action */}
                        <button
                            onClick={() => setShowEligiblePanel(true)}
                            className="w-full py-4 bg-brand-primary/10 hover:bg-brand-primary/20 border-t border-brand-primary/10 text-brand-primary text-sm font-mono tracking-widest uppercase transition-all flex items-center justify-center gap-2 relative z-10 font-bold"
                        >
                            <Users size={18} />
                            LIHAT SEMUA {candidates.length.toLocaleString()} TAMU
                        </button>
                    </div>

                    {/* History Button Panel */}
                    <button
                        onClick={() => setShowHistory(true)}
                        className="bg-brand-secondary/60 hover:bg-brand-secondary/80 border border-brand-primary/30 text-brand-primarySoft text-lg rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 backdrop-blur-xl transition-all flex items-center justify-center gap-3 font-mono tracking-widest uppercase shadow-xl"
                    >
                        <History size={24} />
                        RIWAYAT PEMENANG
                    </button>
                </div>
            </div>

            {/* History Modal */}
            {showHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-brand-secondary border border-brand-primary/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-surface/5">
                            <h2 className="text-2xl font-bold text-brand-surface flex items-center gap-2">
                                <Trophy className="text-brand-primary" />
                                Riwayat Pemenang Undian
                            </h2>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="p-2 hover:bg-brand-surface/10 rounded-full text-brand-surface/70 hover:text-brand-surface transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-8">
                            {['UTAMA', 'HIBURAN'].map(category => {
                                const categoryPrizes = prizes.filter(p => (p.category || 'HIBURAN') === category);
                                if (categoryPrizes.length === 0 || !categoryPrizes.some(p => p.winners.length > 0)) return null;

                                return (
                                    <div key={category}>
                                        <h3 className="text-xl font-bold text-brand-primary mb-4 border-b border-brand-border pb-2">
                                            Kategori {category}
                                        </h3>
                                        <div className="space-y-6">
                                            {categoryPrizes.filter(p => p.winners.length > 0).map(prize => (
                                                <div key={prize.id} className="bg-brand-surface/5 rounded-xl p-4 border border-brand-border">
                                                    <h4 className="font-bold text-brand-surface mb-4 flex items-center gap-2">
                                                        <PartyPopper size={18} className="text-brand-accent" />
                                                        {prize.name}
                                                    </h4>
                                                    <div className="flex flex-wrap gap-3">
                                                        {prize.winners.map((w: any) => (
                                                            <div key={w.id} className="bg-brand-secondary/80 rounded-lg p-3 flex items-center gap-3 min-w-[200px] border border-brand-border">
                                                                <div className="w-8 h-8 rounded-full bg-brand-primary/15 flex items-center justify-center font-bold text-sm text-brand-primary">
                                                                    {w.queueNumber}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-sm text-brand-surface">{w.name}</div>
                                                                    <div className="text-xs text-brand-surface/50">{w.company || '-'}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {!prizes.some(p => p.winners.length > 0) && (
                                <div className="text-center py-12 text-brand-surface/40">
                                    <Sparkles className="mx-auto mb-3 opacity-50" size={32} />
                                    Belum ada pemenang yang diundi
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Eligible Guests Modal */}
            {showEligiblePanel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-brand-secondary border border-brand-primary/20 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
                        
                        {/* Header */}
                        <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-surface/5">
                            <h2 className="text-2xl font-bold text-brand-surface flex items-center gap-2">
                                <Users className="text-brand-primary" />
                                Daftar Peserta Undian
                                <span className="text-sm font-mono text-brand-primary/70 ml-2">
                                    ({eligibleMeta.eligible} eligible)
                                </span>
                            </h2>
                            <button onClick={() => setShowEligiblePanel(false)} className="p-2 hover:bg-brand-surface/10 rounded-full text-brand-surface/70 hover:text-brand-surface transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Search Area */}
                        <div className="p-4 border-b border-brand-border bg-brand-surface/5 space-y-3">
                            {/* Pencarian Umum (nama, perusahaan, divisi) */}
                            <div className="relative">
                                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-surface/40" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari nama, perusahaan, atau nomor antrian..."
                                    className="w-full bg-brand-secondary/60 border border-brand-border rounded-xl pl-12 pr-4 py-3 text-brand-surface placeholder:text-brand-surface/30 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                />
                            </div>
                            {/* Pencarian by Guest ID */}
                            <div className="relative">
                                <Hash size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-surface/40" />
                                <input
                                    type="text"
                                    value={searchGuestId}
                                    onChange={(e) => setSearchGuestId(e.target.value)}
                                    placeholder="Cari Guest ID (contoh: G001, INV-0042)..."
                                    className="w-full bg-brand-secondary/60 border border-brand-border rounded-xl pl-12 pr-4 py-3 text-brand-surface placeholder:text-brand-surface/30 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 font-mono"
                                />
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="px-6 pt-4 flex gap-2">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors ${activeTab === 'all' ? 'bg-brand-primary/20 text-brand-primary border-b-2 border-brand-primary' : 'text-brand-surface/60 hover:text-brand-surface hover:bg-brand-surface/10'}`}
                            >
                                Semua ({eligibleMeta.totalCheckedIn})
                            </button>
                            <button
                                onClick={() => setActiveTab('eligible')}
                                className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors ${activeTab === 'eligible' ? 'bg-brand-primary/20 text-brand-primary border-b-2 border-brand-primary' : 'text-brand-surface/60 hover:text-brand-surface hover:bg-brand-surface/10'}`}
                            >
                                Eligible ({eligibleMeta.eligible})
                            </button>
                            <button
                                onClick={() => setActiveTab('won')}
                                className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors ${activeTab === 'won' ? 'bg-brand-primary/20 text-brand-primary border-b-2 border-brand-primary' : 'text-brand-surface/60 hover:text-brand-surface hover:bg-brand-surface/10'}`}
                            >
                                Menang ({eligibleMeta.won})
                            </button>
                        </div>

                        {/* Guest List */}
                        <div className="p-6 overflow-y-auto flex-1 bg-brand-secondary/30 relative">
                            {eligibleLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-brand-secondary/50 backdrop-blur-sm z-10">
                                    <div className="w-8 h-8 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                                </div>
                            ) : null}
                            <div className="space-y-3">
                                {eligibleData.map(guest => (
                                    <div key={guest.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                                        guest.wonPrizes.length > 0
                                            ? 'bg-brand-primary/5 border-brand-primary/20'
                                            : 'bg-brand-surface/5 border-brand-border hover:bg-brand-surface/10'
                                    }`}>
                                        {/* Queue Number */}
                                        <div className="w-10 h-10 rounded-full bg-brand-primary/15 flex items-center justify-center font-bold text-sm text-brand-primary flex-shrink-0">
                                            {guest.queueNumber}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-brand-surface truncate">{guest.name}</span>
                                                {guest.guestId && (
                                                    <span className="text-xs font-mono text-brand-surface/30 bg-brand-surface/5 px-2 py-0.5 rounded flex-shrink-0">
                                                        {guest.guestId}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-brand-surface/50 truncate">
                                                {guest.company || '-'}
                                                {guest.division && <span className="ml-1">({guest.division})</span>}
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        {guest.wonPrizes.length > 0 ? (
                                            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-brand-primary/20 text-brand-primary text-xs font-mono whitespace-nowrap">
                                                <Award size={14} />
                                                <span className="truncate max-w-[150px]">{guest.wonPrizes.join(', ')}</span>
                                            </div>
                                        ) : (
                                            <div className="px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-mono">
                                                ✓ Eligible
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {!eligibleLoading && eligibleData.length === 0 && (
                                    <div className="text-center py-12 text-brand-surface/40">
                                        <Users className="mx-auto mb-3 opacity-50" size={32} />
                                        Tidak ada peserta yang cocok dengan filter pencarian.
                                    </div>
                                )}
                                
                                {/* Pagination indicator + Load More trigger */}
                                {eligibleMeta.page < eligibleMeta.totalPages && (
                                    <div ref={listEndRef} className="flex justify-center py-4">
                                        {loadingMore ? (
                                            <div className="flex items-center gap-2 text-brand-surface/40 text-sm">
                                                <div className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                                                Memuat lagi...
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => fetchEligibleGuests(eligibleMeta.page + 1, true)}
                                                className="px-6 py-2 bg-brand-surface/10 hover:bg-brand-surface/20 rounded-full text-sm text-brand-surface/60 transition-colors"
                                            >
                                                Muat {Math.min(PAGE_SIZE, eligibleMeta.total - eligibleData.length)} tamu lagi
                                                ({eligibleData.length}/{eligibleMeta.total})
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Info jumlah yang ditampilkan */}
                                {eligibleData.length > 0 && (
                                    <div className="text-center text-xs text-brand-surface/30 pt-2">
                                        Menampilkan {eligibleData.length} dari {eligibleMeta.total} tamu
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Stats */}
                        <div className="p-4 border-t border-brand-border bg-brand-surface/5 flex justify-between text-sm text-brand-surface/60">
                            <span>Total Hadir: {eligibleMeta.totalCheckedIn}</span>
                            <span>Eligible: {eligibleMeta.eligible}</span>
                            <span>Sudah Menang: {eligibleMeta.won}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
