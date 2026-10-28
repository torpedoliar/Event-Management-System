"use client";
import { useEffect, useState, useRef, useMemo } from 'react';
import { apiFetch, apiBase, toApiUrl } from '@/lib/api';
import { X, Volume2, VolumeX, Monitor } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { popWinner, finale, grandFinale } from '@/lib/celebrate';
import WinnerHistoryModal from '@/components/WinnerHistoryModal';

import type { Prize, Guest, EligibleGuest, EligibleGuestsResponse, DramaConfig } from '@/lib/luckydraw/types';
import { DRAMA_CONFIGS, sleep } from '@/lib/luckydraw/drama';
import MultiWinnerModal from '@/components/luckydraw/MultiWinnerModal';
import EligibleGuestsModal from '@/components/luckydraw/EligibleGuestsModal';
import CandidatesPanel from '@/components/luckydraw/CandidatesPanel';
import PrizeSelector from '@/components/luckydraw/PrizeSelector';
import DrawStage from '@/components/luckydraw/DrawStage';

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
            <div className={`fixed ${isFullscreen ? 'top-6' : 'top-24'} right-6 z-[60] flex flex-col gap-2`}>
                <Button size="sm" variant={isFullscreen ? 'primary' : 'outline'} onClick={() => setIsFullscreen(!isFullscreen)} aria-label={isFullscreen ? 'Tampilkan navigasi' : 'Sembunyikan navigasi'}>
                    <Monitor size={20} />
                </Button>
                <Button size="sm" variant={soundEnabled ? 'primary' : 'outline'} onClick={toggleSound} aria-label={soundEnabled ? 'Matikan suara' : 'Aktifkan suara'}>
                    {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </Button>
            </div>

            {/* Mode Selector Dropdown */}
            <div className={`fixed ${isFullscreen ? 'top-6' : 'top-24'} left-6 z-[60]`}>
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
                <PrizeSelector
                    logoUrl={eventCfg?.logoUrl}
                    prizes={prizes}
                    selectedPrizeId={selectedPrizeId}
                    onSelectPrize={(id) => {
                        setSelectedPrizeId(id);
                        setWinner(null);
                        setDisplayCandidate(null);
                        setHighlightedId(null);
                        setDrawCount(1);
                    }}
                />

                <div className="flex flex-col lg:flex-row gap-6 md:gap-10 w-full items-start">
                <DrawStage
                    screenShake={screenShake}
                    selectedPrize={selectedPrize}
                    selectedPrizeId={selectedPrizeId}
                    winner={winner}
                    displayCandidate={displayCandidate}
                    isGlitching={isGlitching}
                    drawError={drawError}
                    spinning={spinning}
                    isSoldOut={isSoldOut}
                    drawCount={drawCount}
                    onDrawCountChange={setDrawCount}
                    onDraw={handleDraw}
                    onShowHistory={() => setShowHistory(true)}
                />

            {/* Multi Winner Modal */}
            <MultiWinnerModal
                open={showMultiWinnerModal}
                isRevealing={isRevealing}
                winners={multiWinners}
                totalExpected={totalExpectedWinners}
                prizeName={selectedPrize?.name}
                onClose={() => { setShowMultiWinnerModal(false); setMultiWinners([]); setTotalExpectedWinners(0); }}
            />


                {/* Right panel: ticker + winners */}
                <CandidatesPanel
                    tickerMood={tickerMood}
                    candidates={candidates}
                    tickerNames={tickerNames}
                    highlightedId={highlightedId}
                    hasWinner={!!winner}
                    prizes={prizes}
                    selectedPrize={selectedPrize}
                    onShowEligible={() => setShowEligiblePanel(true)}
                />
            </div>
        </div>

            <WinnerHistoryModal 
                isOpen={showHistory} 
                onClose={() => setShowHistory(false)} 
                prizes={prizes}
                logoUrl={eventCfg?.logoUrl}
            />

            {/* Eligible Guests Modal */}
            <EligibleGuestsModal
                open={showEligiblePanel}
                onClose={() => setShowEligiblePanel(false)}
                meta={eligibleMeta}
                data={eligibleData}
                loading={eligibleLoading}
                loadingMore={loadingMore}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                searchGuestId={searchGuestId}
                onSearchGuestIdChange={setSearchGuestId}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                listEndRef={listEndRef}
                onLoadMore={() => fetchEligibleGuests(eligibleMeta.page + 1, true)}
                pageSize={PAGE_SIZE}
            />
        </div>
    );
}
