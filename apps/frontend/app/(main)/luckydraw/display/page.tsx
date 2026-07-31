"use client";
import React, { useEffect, useState, useRef } from 'react';
import { apiFetch, toApiUrl } from '@/lib/api';
import { Volume2, VolumeX, Monitor, History } from 'lucide-react';
import { popWinner, finale, grandFinale } from '@/lib/celebrate';
import { useSSE } from '@/lib/sse-context';
import WinnerHistoryModal from '@/components/WinnerHistoryModal';

const SLOT_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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
    guestId?: string;
    name: string;
    company?: string;
    division?: string;
    photoUrl?: string;
    queueNumber: number;
}

interface SlotRow {
    winnerId: string;
    winnerChars: string[];
    winner: Guest;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const guestIdToSlotChars = (guestId: string): string[] => {
    if (!guestId) guestId = '';
    const upper = guestId.toUpperCase();
    const cleaned = upper.replace(/[^A-Z0-9]/g, '');
    const padded = cleaned.padStart(10, '0');
    const final = padded.slice(-10);
    return final.split('');
};

const SlotReel: React.FC<{
    spinning: boolean;
    targetChar: string;
    locked: boolean;
    reelIndex: number;
    charSize: number;
}> = ({ spinning, targetChar, locked, reelIndex, charSize }) => {
    const stripRef = useRef<HTMLDivElement>(null);
    const positionRef = useRef(0);
    const speedRef = useRef(0);
    const animFrameRef = useRef<number>(0);
    const isLockedRef = useRef(false);
    // Gold flash the instant this reel snaps — the payoff beat per column.
    const [flash, setFlash] = useState(false);
    
    const chars = SLOT_CHARSET.split('');
    const totalChars = chars.length;
    const stripHeight = totalChars * charSize;
    
    useEffect(() => {
        if (spinning && !locked) {
            isLockedRef.current = false;
            setFlash(false);
            speedRef.current = 15 + (reelIndex * 2);
            
            const animate = () => {
                positionRef.current = (positionRef.current + speedRef.current) % stripHeight;
                if (stripRef.current) {
                    stripRef.current.style.transform = `translateY(-${positionRef.current}px)`;
                }
                if (!isLockedRef.current) {
                    animFrameRef.current = requestAnimationFrame(animate);
                }
            };
            animFrameRef.current = requestAnimationFrame(animate);
        }
        
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [spinning, locked, stripHeight, reelIndex]);
    
    useEffect(() => {
        if (locked && !isLockedRef.current) {
            isLockedRef.current = true;
            
            let charIndex = SLOT_CHARSET.indexOf(targetChar);
            if (charIndex === -1) charIndex = 0;
            const targetY = charIndex * charSize;
            
            const startPos = positionRef.current;
            const startTime = performance.now();
            const duration = 800; 
            
            // Calculate shortest forward distance to targetY
            let dist = (targetY - startPos + stripHeight) % stripHeight;
            // Ensure minimum travel distance for a natural deceleration curve
            if (dist < charSize * 15) {
                dist += stripHeight;
            }

            const easeOutElastic = (t: number): number => {
                if (t === 0 || t === 1) return t;
                const p = 0.4;
                return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
            };
            
            const animateLock = (now: number) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = easeOutElastic(progress);
                
                const currentPos = startPos + dist * eased;
                // currentPos could be negative if bounce overshoots past 0, ensure positive modulo
                positionRef.current = ((currentPos % stripHeight) + stripHeight) % stripHeight;
                
                if (stripRef.current) {
                    stripRef.current.style.transform = `translateY(-${positionRef.current}px)`;
                }
                
                if (progress < 1) {
                    animFrameRef.current = requestAnimationFrame(animateLock);
                } else {
                    // Force exact target position at the end
                    positionRef.current = targetY;
                    if (stripRef.current) {
                         stripRef.current.style.transform = `translateY(-${positionRef.current}px)`;
                    }
                    setFlash(true);
                }
            };
            
            animFrameRef.current = requestAnimationFrame(animateLock);
        }
    }, [locked, targetChar, charSize, stripHeight]);
    
    return (
        <div className={`slot-reel-container relative overflow-hidden ${locked ? 'slot-locked' : ''} ${flash ? 'slot-lock-flash' : ''}`}
             style={{ height: `${charSize * 3}px`, width: charSize * 0.75 + 'px' }}>
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black/90 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/90 to-transparent z-10 pointer-events-none" />
            
            <div className="absolute top-1/3 left-0 right-0 h-1/3 border-y-2 border-brand-primary/50 z-10 pointer-events-none" 
                 style={{ boxShadow: locked ? '0 0 20px rgba(212,168,83,0.6)' : 'none' }} />
            
            <div ref={stripRef} className="absolute left-0 right-0"
                 style={{ top: charSize + 'px' }}>
                {[0, 1, 2].map(loop => (
                    chars.map((char, i) => (
                        <div key={`${loop}-${i}`}
                             className={`flex items-center justify-center font-mono font-black select-none
                                 ${locked && char === targetChar ? 'text-brand-primary drop-shadow-[0_0_10px_rgba(212,168,83,0.8)]' : 'text-white/90'}`}
                             style={{ height: charSize + 'px', fontSize: `${charSize * 0.75}px` }}>
                            {char}
                        </div>
                    ))
                ))}
            </div>
        </div>
    );
};

export default function LiveDisplayPage() {
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [selectedPrizeId, setSelectedPrizeId] = useState<string>('');
    const [candidates, setCandidates] = useState<Guest[]>([]);
    const [loading, setLoading] = useState(true);
    const [eventCfg, setEventCfg] = useState<any>(null);
    const [spinning, setSpinning] = useState(false);
    const spinningRef = useRef(false);
    
    const [drawCount, setDrawCount] = useState(1);
    const [showHistory, setShowHistory] = useState(false);
    const [slotRows, setSlotRows] = useState<SlotRow[]>([]);
    const [globalLockedCount, setGlobalLockedCount] = useState(0);
    const [revealedWinners, setRevealedWinners] = useState<Guest[]>([]);
    
    const [screenFlash, setScreenFlash] = useState(false);
    const [darkReveal, setDarkReveal] = useState(false);
    const [screenShake, setScreenShake] = useState(false);
    const [grandWinner, setGrandWinner] = useState<Guest | null>(null);
    const [drawError, setDrawError] = useState('');

    const [soundEnabled, setSoundEnabled] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const audioRollRef = useRef<HTMLAudioElement | null>(null);
    const audioTensionRef = useRef<HTMLAudioElement | null>(null);
    const audioWinRef = useRef<HTMLAudioElement | null>(null);
    const audioGrandWinRef = useRef<HTMLAudioElement | null>(null);

    const { addEventListener, removeEventListener } = useSSE();

    useEffect(() => {
        if (isFullscreen) document.body.classList.add('hide-top-nav');
        else document.body.classList.remove('hide-top-nav');
        return () => document.body.classList.remove('hide-top-nav');
    }, [isFullscreen]);

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

    const getExcludedWinnerIds = (prizesData: Prize[]): Set<string> => {
        const excluded = new Set<string>();
        for (const prize of prizesData) {
            if (!prize.allowMultipleWins) {
                for (const w of prize.winners) {
                    excluded.add(w.id);
                }
            }
        }
        return excluded;
    };

    const loadData = async () => {
        try {
            const [prizesData, guestsData, configData] = await Promise.all([
                apiFetch<Prize[]>('/prizes'),
                apiFetch<{ data: Guest[] }>('/guests?checkedIn=true&pageSize=10000'),
                apiFetch<any>('/config/event')
            ]);
            setPrizes(prizesData);

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

        const onPrizeDraw = (e: MessageEvent) => {
            const data = JSON.parse(e.data);
            if (data.prizeId === selectedPrizeId) {
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
            setLoading(true);
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

    const animateParallelReveal = async (winners: Guest[]) => {
        const rows: SlotRow[] = winners.map(w => {
            const displayId = w.guestId || String(w.queueNumber);
            return {
                winnerId: displayId,
                winnerChars: guestIdToSlotChars(displayId),
                winner: w
            };
        });
        
        setSlotRows(rows);
        setGlobalLockedCount(0);
        setRevealedWinners([]);
        
        await sleep(2000);
        
        const lockDelay = 400;
        for (let col = 9; col >= 0; col--) {
            setGlobalLockedCount(10 - col);

            // Burst tracks the column being locked, left to right.
            popWinner({ x: 0.20 + (col * 0.08), y: 0.5 }, 10 * rows.length);

            await sleep(lockDelay);
        }

        stopSound(audioRollRef);
        playSound(audioWinRef);

        setRevealedWinners(winners);

        finale(rows.length);
    };

    const GRAND_PRIZE_LOCK_DELAYS = [
        600, 500, 500, 600, 700, 800, 900, 1000, 1200, 1500
    ];

    const animateGrandPrize = async (winnerGuest: Guest) => {
        const displayId = winnerGuest.guestId || String(winnerGuest.queueNumber);
        const chars = guestIdToSlotChars(displayId);
        
        setSlotRows([{ winnerId: displayId, winnerChars: chars, winner: winnerGuest }]);
        setGlobalLockedCount(0);
        setRevealedWinners([]);
        setGrandWinner(null);
        
        await sleep(2000);
        
        stopSound(audioRollRef);
        playSound(audioTensionRef, true);
        
        await sleep(2000);
        
        setScreenShake(true);
        
        for (let i = 0; i < 10; i++) {
            const delay = GRAND_PRIZE_LOCK_DELAYS[i];
            
            await sleep(delay);
            setGlobalLockedCount(i + 1);
            
            if (i >= 5) {
                if (audioTensionRef.current) {
                    audioTensionRef.current.volume = Math.min(1.0, 0.5 + (i * 0.1));
                }
            }
            if (i === 8) {
                setScreenFlash(true);
                setTimeout(() => setScreenFlash(false), 200);
            }
        }
        
        setScreenFlash(true);
        setTimeout(() => setScreenFlash(false), 400);
        
        setDarkReveal(true);
        stopSound(audioTensionRef);
        playSound(audioGrandWinRef);
        
        setScreenShake(false);
        setGrandWinner(winnerGuest);
        setRevealedWinners([winnerGuest]);

        const cancelFinale = grandFinale();

        await sleep(5000);
        cancelFinale();
        setDarkReveal(false);
    };

    const handleSpin = async () => {
        if (spinning || !selectedPrizeId) return;
        
        const prize = prizes.find(p => p.id === selectedPrizeId);
        if (!prize) return;
        
        const isUtama = prize.category === 'UTAMA';
        const actualDrawCount = isUtama ? 1 : drawCount;
        
        setSpinning(true);
        spinningRef.current = true;
        setRevealedWinners([]);
        setGrandWinner(null);
        setDrawError('');
        
        const fallbackRows = Array(actualDrawCount).fill(0).map(() => ({
            winnerId: '----------',
            winnerChars: Array(10).fill('0'),
            winner: { id: '', name: '', queueNumber: 0 } as Guest
        }));
        setSlotRows(fallbackRows);
        setGlobalLockedCount(0);
        
        playSound(audioRollRef, true);
        
        try {
            const results = await apiFetch<Guest[]>(`/prizes/${selectedPrizeId}/draw`, { 
                method: 'POST',
                body: JSON.stringify({ count: actualDrawCount })
            });
            
            if (!results || results.length === 0) {
                throw new Error("Tidak ada peserta yang terpilih");
            }
            
            if (isUtama) {
                await animateGrandPrize(results[0]);
            } else {
                await animateParallelReveal(results);
            }
            
            if (!prize.allowMultipleWins) {
                const winnerIds = new Set(results.map(r => r.id));
                setCandidates(prev => prev.filter(c => !winnerIds.has(c.id)));
            }
            
        } catch (e: any) {
            stopSound(audioRollRef);
            stopSound(audioTensionRef);
            setDrawError(e.message || 'Gagal mengundi pemenang');
        } finally {
            setSpinning(false);
            spinningRef.current = false;
            loadData(); 
        }
    };

    const getCharSize = () => {
        const count = slotRows.length || (isUtama ? 1 : drawCount);
        if (count === 1) return 80;
        if (count <= 3) return 60;
        if (count <= 5) return 50;
        if (count <= 10) return 40;
        if (count <= 20) return 30;
        return 24;
    };

    const getGridClass = () => {
        const count = slotRows.length || (isUtama ? 1 : drawCount);
        if (count <= 5) return 'grid-cols-1';
        if (count <= 20) return 'grid-cols-2';
        return 'grid-cols-3';
    };

    const selectedPrize = prizes.find(p => p.id === selectedPrizeId);
    const isSoldOut = selectedPrize ? selectedPrize.winners.length >= selectedPrize.quantity : false;
    const isUtama = selectedPrize?.category === 'UTAMA';

    if (loading) return <div className="min-h-[100dvh] flex items-center justify-center text-brand-text">Loading...</div>;

    return (
        <div className={`min-h-[100dvh] flex flex-col p-8 relative overflow-hidden ${screenShake ? 'animate-screen-shake' : ''}`}>
            {/* Mode Selector Dropdown */}
            <div className={`fixed ${isFullscreen ? 'top-6' : 'top-24'} left-6 z-[70]`}>
                <select
                    onChange={(e) => {
                        if (e.target.value === 'classic') {
                            window.location.href = '/luckydraw';
                        } else if (e.target.value === 'carousel') {
                            window.location.href = '/luckydraw/carousel';
                        }
                    }}
                    value="slot"
                    className="bg-brand-bgElevated/80 border border-brand-primary/50 text-brand-primarySoft text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary backdrop-blur-xl transition-all shadow-lg font-mono tracking-wider cursor-pointer"
                >
                    <option value="classic">🎲 Classic Mode</option>
                    <option value="slot">🎰 Slot Machine Mode</option>
                    <option value="carousel">🎡 3D Carousel Mode</option>
                </select>
            </div>

            <audio ref={audioRollRef} src={toApiUrl(eventCfg?.rollSoundUrl || "/sounds/roll.mp3")} preload="auto" />
            <audio ref={audioTensionRef} src={toApiUrl(eventCfg?.tensionSoundUrl || "/sounds/tension.mp3")} preload="auto" />
            <audio ref={audioWinRef} src={toApiUrl(eventCfg?.winSoundUrl || "/sounds/win.mp3")} preload="auto" />
            <audio ref={audioGrandWinRef} src={toApiUrl(eventCfg?.grandWinSoundUrl || "/sounds/grand-win.mp3")} preload="auto" />

            {!soundEnabled && !loading && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-brand-warning/20 backdrop-blur-sm border-b border-brand-warning/30 px-4 py-2 flex items-center justify-between">
                    <span className="text-brand-warning text-sm">Enable sound for the full experience</span>
                    <div className="flex gap-2">
                        <button onClick={toggleSound} className="px-3 py-1 text-xs rounded-lg bg-brand-primary text-brand-bg font-semibold">Enable</button>
                        <button onClick={() => setSoundEnabled(true)} className="px-3 py-1 text-xs rounded-lg border border-brand-border text-brand-textMuted hover:text-brand-text">Dismiss</button>
                    </div>
                </div>
            )}

            {screenFlash && <div className="fixed inset-0 z-[60] bg-white pointer-events-none animate-[screen-flash_0.3s_ease-out]" />}
            {darkReveal && <div className="dark-reveal pointer-events-none" />}

            <div className="relative z-10 flex justify-between items-start mb-8 mt-12 md:mt-0">
                <div className="flex items-center gap-4">
                    {eventCfg?.logoUrl && <img src={toApiUrl(eventCfg.logoUrl)} className="h-16 drop-shadow-xl" alt="logo" />}

                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-4 rounded-full bg-brand-surface/50 hover:bg-brand-surface backdrop-blur-md text-brand-text transition-all flex items-center gap-2 group" title={isFullscreen ? "Show Navigation" : "Hide Navigation (Fullscreen)"}>
                        <Monitor size={24} className={isFullscreen ? 'text-brand-primary' : ''} />
                    </button>
                    <button onClick={() => setShowHistory(true)} className="p-4 rounded-full bg-brand-surface/50 hover:bg-brand-surface backdrop-blur-md text-brand-primarySoft transition-all flex items-center gap-2 group">
                        <History size={24} />
                        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-mono text-sm uppercase tracking-widest whitespace-nowrap">Riwayat</span>
                    </button>
                    <button onClick={toggleSound} className="p-4 rounded-full bg-brand-surface/50 hover:bg-brand-surface backdrop-blur-md text-brand-text transition-all">
                        {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                    </button>
                </div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-[95vw] mx-auto gap-8">
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-4xl mx-auto bg-gradient-to-b from-brand-bgElevated to-brand-bgSubtle border border-brand-border rounded-2xl p-6">
                    <div className="flex-1 w-full">
                        <select
                            value={selectedPrizeId}
                            onChange={(e) => {
                                setSelectedPrizeId(e.target.value);
                                setRevealedWinners([]);
                                setSlotRows([]);
                                setGrandWinner(null);
                                setDrawCount(1);
                            }}
                            className="w-full bg-brand-bgElevated/80 border border-brand-primary/30 text-brand-primarySoft text-xl rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 font-mono tracking-widest uppercase text-center"
                        >
                            {prizes.map(p => (
                                <option key={p.id} value={p.id} className="bg-brand-bgElevated text-brand-text font-sans">
                                    {p.category === 'UTAMA' ? '🏆' : '🎁'} {p.name} ({p.winners.length}/{p.quantity})
                                </option>
                            ))}
                        </select>
                    </div>

                    {!isUtama && (
                        <div className="flex items-center gap-4 bg-brand-bg/50 px-6 py-3 rounded-full border border-brand-border">
                            <span className="text-brand-textMuted font-mono text-sm tracking-widest">DRAW COUNT:</span>
                            <div className="flex gap-2">
                                {[1, 5, 10, 20].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setDrawCount(n)}
                                        className={`w-10 h-10 rounded-full font-bold transition-all ${drawCount === n ? 'bg-brand-primary text-brand-bg' : 'bg-brand-text/10 text-brand-text hover:bg-brand-text/20'}`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Tracker Bar Moved Below Prize Selection */}
                <div className="w-full max-w-4xl mx-auto bg-brand-bgElevated/80 backdrop-blur-md border border-brand-primary/20 p-4 md:p-5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    <div className="flex justify-between text-brand-text/80 mb-3 font-mono text-xs md:text-sm tracking-widest font-bold">
                        <span>HADIR: {candidates.length}</span>
                        <span className="text-brand-primarySoft">MENANG: {prizes.reduce((acc, p) => acc + p.winners.length, 0)}</span>
                    </div>
                    <div className="w-full h-2 md:h-2.5 bg-black/60 rounded-full overflow-hidden shadow-inner border border-white/5">
                        <div 
                            className="h-full bg-gradient-to-r from-brand-primary to-brand-primarySoft shadow-[0_0_15px_rgba(212,168,83,0.8)] transition-all duration-1000" 
                            style={{ width: `${Math.max(0, 100 - (prizes.reduce((acc, p) => acc + p.winners.length, 0) / (candidates.length || 1) * 100))}%` }} 
                        />
                    </div>
                </div>

                <div className={`w-full max-w-[1400px] slot-frame relative transition-all duration-1000 bg-gradient-to-b from-brand-bgElevated to-brand-bgSubtle border border-brand-border rounded-xl border-t-brand-primary ${isUtama ? 'border-brand-primary/50 shadow-[0_0_100px_rgba(212,168,83,0.12)]' : ''}`}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black px-8 py-2 rounded-full border border-brand-primary/40 font-mono text-brand-primary tracking-[0.3em] text-sm shadow-[0_0_20px_rgba(212,168,83,0.3)]">
                        {isUtama ? 'SINGLE WINNER MODE' : `MULTI WINNER MODE (${drawCount}x)`}
                    </div>

                    <div className={`grid ${getGridClass()} gap-x-12 gap-y-8 justify-items-center py-6 px-4`}>
                        {(slotRows.length > 0 ? slotRows : Array(isUtama ? 1 : drawCount).fill({ winnerChars: Array(10).fill('0') })).map((row, rowIdx) => (
                            <div key={rowIdx} className="flex flex-col items-center gap-4">
                                <div className="flex items-center bg-black/60 rounded-xl p-2 border border-white/5 shadow-inner">
                                    {row.winnerChars.map((char: string, colIdx: number) => (
                                        <React.Fragment key={colIdx}>
                                            <SlotReel
                                                spinning={spinning}
                                                targetChar={char}
                                                locked={colIdx >= (10 - globalLockedCount)}
                                                reelIndex={colIdx}
                                                charSize={getCharSize()}
                                            />
                                            {colIdx < 9 && <div className="w-[1px] h-full bg-brand-primary/20 mx-1" />}
                                        </React.Fragment>
                                    ))}
                                </div>
                                
                                {revealedWinners.find(w => (w.guestId || String(w.queueNumber)) === row.winnerId) && !isUtama && (
                                    <div className="h-8 animate-winner-reveal text-center">
                                        <div className="font-bold text-brand-text text-lg tracking-wider bg-brand-bg/50 px-4 py-1 rounded-full border border-brand-border shadow-gold">
                                            {row.winner.name} <span className="text-brand-primarySoft text-sm ml-2">{row.winner.company}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {grandWinner && isUtama && (
                    <div className="w-full max-w-4xl mx-auto mt-4 relative z-[70]">
                        <div className="winner-card bg-brand-bg/80 backdrop-blur-md border-2 border-brand-primary rounded-[3rem] p-8 text-center shadow-gold">
                            <h3 className="text-2xl font-mono text-brand-primary mb-2 tracking-[0.5em] uppercase">GRAND PRIZE WINNER</h3>
                            {grandWinner.photoUrl && (
                                <img src={toApiUrl(grandWinner.photoUrl)} alt="" className="mx-auto mb-4 h-28 w-28 rounded-full object-cover border-2 border-brand-primary" />
                            )}
                            <div className="text-5xl md:text-7xl font-black text-brand-text mb-4 uppercase tracking-tighter drop-shadow-2xl">
                                {grandWinner.name}
                            </div>
                            <div className="text-2xl text-brand-primarySoft font-mono tracking-widest">
                                {grandWinner.company || '-'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Screen readers get the result without watching the animation */}
                <p aria-live="polite" className="sr-only">
                    {grandWinner
                        ? `Pemenang ${selectedPrize?.name}: ${grandWinner.name}`
                        : revealedWinners.length > 0
                            ? `Pemenang ${selectedPrize?.name}: ${revealedWinners.map(w => w.name).join(', ')}`
                            : ''}
                </p>

                <div className="mt-8 flex flex-col items-center gap-4 w-full">
                    {drawError && (
                        <div role="alert" className="px-6 py-3 rounded-xl border border-brand-danger/40 bg-brand-danger/10 text-brand-danger text-sm text-center max-w-xl">
                            {drawError}
                        </div>
                    )}
                    <button
                        onClick={handleSpin}
                        disabled={spinning || isSoldOut || !selectedPrizeId}
                        className={`
                            relative px-16 py-6 rounded-full font-black text-2xl md:text-3xl font-mono tracking-[0.3em] uppercase transition-all duration-300 transform hover:scale-105 active:scale-95
                            ${spinning
                                ? 'bg-brand-border/50 text-brand-textMuted cursor-not-allowed border border-brand-border'
                                : isSoldOut
                                    ? 'bg-brand-danger/20 text-brand-danger cursor-not-allowed border border-brand-danger/30'
                                    : isUtama
                                        ? 'bg-gradient-to-r from-brand-primary to-brand-primaryMuted text-brand-bg border border-brand-primary/50 animate-grand-pulse'
                                        : 'bg-gradient-to-r from-brand-primary to-brand-primarySoft text-brand-bg shadow-[0_0_50px_rgba(212,168,83,0.4)] hover:shadow-[0_0_80px_rgba(212,168,83,0.6)] border border-brand-primarySoft/50'
                            }
                        `}
                    >
                        {spinning ? 'SPINNING...' : isSoldOut ? 'HABIS' : isUtama ? '◆ GRAND PRIZE ◆' : '◆ PUTAR UNDIAN ◆'}
                    </button>
                </div>

                {!isUtama && revealedWinners.length > 0 && revealedWinners.length <= 10 && (
                    <div className="w-full max-w-6xl mt-12 bg-brand-surface/50 backdrop-blur-md rounded-3xl border border-brand-border p-6">
                        <div className="text-center text-brand-primary font-mono tracking-[0.3em] mb-6 text-sm">DAFTAR PEMENANG BARU</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {revealedWinners.map((w, i) => (
                                <div
                                    key={w.id}
                                    className="flex items-center gap-4 bg-brand-text/5 rounded-xl p-4 border border-brand-border animate-slideUp"
                                    style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'backwards' }}
                                >
                                    <div className="font-bold text-brand-primary text-sm font-mono shrink-0">
                                        {w.guestId || w.queueNumber}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-brand-text truncate">{w.name}</div>
                                        <div className="text-xs text-brand-textMuted truncate font-mono">{w.company || '-'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <WinnerHistoryModal 
                isOpen={showHistory} 
                onClose={() => setShowHistory(false)} 
                prizes={prizes} 
            />
        </div>
    );
}
