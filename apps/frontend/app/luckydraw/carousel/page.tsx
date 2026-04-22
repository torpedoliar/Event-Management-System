"use client";
import React, { useEffect, useState, useRef } from 'react';
import { apiFetch, toApiUrl } from '../../../lib/api';
import { Trophy, Volume2, VolumeX } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSSE } from '../../../lib/sse-context';
import LuckyDraw3DWheel, { Guest } from '../../../components/LuckyDraw3DWheel';

interface Prize {
    id: string;
    name: string;
    description?: string;
    category?: string;
    quantity: number;
    winners: any[];
    allowMultipleWins?: boolean;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function CarouselDrawPage() {
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [selectedPrizeId, setSelectedPrizeId] = useState<string>('');
    const [candidates, setCandidates] = useState<Guest[]>([]);
    const [loading, setLoading] = useState(true);
    const [eventCfg, setEventCfg] = useState<any>(null);
    const [spinning, setSpinning] = useState(false);
    const spinningRef = useRef(false);
    
    const [drawCount, setDrawCount] = useState(1);
    const [winners, setWinners] = useState<Guest[]>([]);
    
    const [screenFlash, setScreenFlash] = useState(false);
    const [darkReveal, setDarkReveal] = useState(false);
    const [screenShake, setScreenShake] = useState(false);

    const [soundEnabled, setSoundEnabled] = useState(false);
    const audioRollRef = useRef<HTMLAudioElement | null>(null);
    const audioTensionRef = useRef<HTMLAudioElement | null>(null);
    const audioWinRef = useRef<HTMLAudioElement | null>(null);
    const audioGrandWinRef = useRef<HTMLAudioElement | null>(null);
    
    const stoppedWheelsRef = useRef(0);

    const { addEventListener, removeEventListener } = useSSE();

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

    const handleSpin = async () => {
        if (spinning || !selectedPrizeId) return;
        
        const prize = prizes.find(p => p.id === selectedPrizeId);
        if (!prize) return;
        
        const isUtama = prize.category === 'UTAMA';
        const actualDrawCount = isUtama ? 1 : drawCount;
        
        setSpinning(true);
        spinningRef.current = true;
        setWinners([]);
        stoppedWheelsRef.current = 0;
        
        playSound(audioRollRef, true);
        
        try {
            const results = await apiFetch<Guest[]>(`/prizes/${selectedPrizeId}/draw`, { 
                method: 'POST',
                body: JSON.stringify({ count: actualDrawCount })
            });
            
            if (!results || results.length === 0) {
                throw new Error("Tidak ada peserta yang terpilih");
            }
            
            // Initialize winners (starts spinning visually)
            setWinners(results);
            
            if (isUtama) {
                setScreenShake(true);
                // The slowdown will be handled inside LuckyDraw3DWheel via spinning=false 
                // but we need to wait a bit before setting it to false
                await sleep(3000); // 3s full spin
                setSpinning(false);
                spinningRef.current = false;
                
                playSound(audioTensionRef, true);
                
                // Wheel will take over fake-stop and snapping.
            } else {
                await sleep(3000);
                setSpinning(false);
                spinningRef.current = false;
            }
            
            if (!prize.allowMultipleWins) {
                const winnerIds = new Set(results.map(r => r.id));
                setCandidates(prev => prev.filter(c => !winnerIds.has(c.id)));
            }
            
        } catch (e: any) {
            stopSound(audioRollRef);
            stopSound(audioTensionRef);
            setSpinning(false);
            spinningRef.current = false;
            alert(e.message || 'Gagal mengundi pemenang');
        }
    };
    
    const handleWheelStop = (index: number, totalWheels: number, isGrandPrize: boolean) => {
        stoppedWheelsRef.current += 1;
        
        if (isGrandPrize) {
            setScreenShake(false);
            stopSound(audioRollRef);
            stopSound(audioTensionRef);
            playSound(audioGrandWinRef);
            
            setScreenFlash(true);
            setTimeout(() => setScreenFlash(false), 400);
            setDarkReveal(true);
            
            confetti({
                particleCount: 800,
                spread: 160,
                startVelocity: 70,
                origin: { y: 0.5, x: 0.5 },
                colors: ['#FFD700', '#FFA500', '#FFFFFF', '#FF4500', '#1E3A8A'],
                ticks: 400
            });

            const end = Date.now() + (3 * 1000);
            const colors = ['#FFD700', '#FFFFFF'];
            (function frame() {
                confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: colors });
                confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: colors });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());

            setTimeout(() => {
                confetti({
                    particleCount: 300,
                    spread: 360,
                    startVelocity: 30,
                    origin: { y: 0.2, x: 0.5 },
                    colors: ['#FFD700', '#FFFFFF', '#F0E68C']
                });
                setDarkReveal(false);
            }, 5000);
            
            loadData();
        } else {
            playSound(audioWinRef);
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.6 },
                colors: ['#FFD700', '#FFA500', '#FF69B4']
            });
            
            if (stoppedWheelsRef.current === totalWheels) {
                stopSound(audioRollRef);
                confetti({
                    particleCount: 200,
                    spread: 120,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#FFA500', '#FF69B4', '#00FF00', '#00BFFF']
                });
                loadData();
            }
        }
    };

    const getGridClass = () => {
        const count = winners.length || (isUtama ? 1 : drawCount);
        if (count === 1) return 'grid-cols-1';
        if (count <= 4) return 'grid-cols-1 md:grid-cols-2';
        if (count <= 9) return 'grid-cols-1 md:grid-cols-3';
        return 'grid-cols-2 md:grid-cols-4';
    };

    const selectedPrize = prizes.find(p => p.id === selectedPrizeId);
    const isSoldOut = selectedPrize ? selectedPrize.winners.length >= selectedPrize.quantity : false;
    const isUtama = selectedPrize?.category === 'UTAMA';

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;

    const displayWheels = winners.length > 0 ? winners : Array(isUtama ? 1 : drawCount).fill(null);

    return (
        <div className={`min-h-screen flex flex-col p-8 relative overflow-hidden ${screenShake ? 'animate-screen-shake' : ''}`}>
            {/* Mode Selector Dropdown */}
            <div className="fixed top-24 left-6 z-[70]">
                <select
                    onChange={(e) => {
                        if (e.target.value === 'classic') window.location.href = '/luckydraw';
                        else if (e.target.value === 'slot') window.location.href = '/luckydraw/display';
                    }}
                    value="carousel"
                    className="bg-brand-secondary/80 border border-brand-primary/50 text-brand-primarySoft text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary backdrop-blur-xl transition-all shadow-lg font-mono tracking-wider cursor-pointer"
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
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <button 
                        onClick={toggleSound}
                        className="group relative bg-brand-secondary border border-brand-primary/50 p-12 rounded-[2rem] flex flex-col items-center gap-6 hover:border-brand-primary transition-all hover:scale-105"
                    >
                        <Volume2 size={48} className="text-brand-primary" />
                        <h3 className="text-2xl font-bold text-white uppercase tracking-widest font-mono">Enable Audio</h3>
                    </button>
                </div>
            )}

            {screenFlash && <div className="fixed inset-0 z-[60] bg-white pointer-events-none animate-[screen-flash_0.3s_ease-out]" />}
            {darkReveal && <div className="dark-reveal pointer-events-none z-[50]" />}

            <div className="relative z-10 flex justify-between items-start mb-8 mt-12 md:mt-0">
                <div className="flex items-center gap-4">
                    {eventCfg?.logoUrl && <img src={toApiUrl(eventCfg.logoUrl)} className="h-16 drop-shadow-xl" alt="logo" />}
                </div>
                
                <button onClick={toggleSound} className="p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all">
                    {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                </button>
            </div>

            <div className="relative z-[55] flex-1 flex flex-col items-center justify-center w-full max-w-[95vw] mx-auto gap-8">
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-4xl mx-auto bg-black/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10">
                    <div className="flex-1 w-full">
                        <select
                            value={selectedPrizeId}
                            onChange={(e) => {
                                setSelectedPrizeId(e.target.value);
                                setWinners([]);
                                setDrawCount(1);
                            }}
                            className="w-full bg-brand-secondary/80 border border-brand-primary/30 text-brand-primarySoft text-xl rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 font-mono tracking-widest uppercase text-center"
                        >
                            {prizes.map(p => (
                                <option key={p.id} value={p.id} className="bg-brand-secondary text-brand-surface font-sans">
                                    {p.category === 'UTAMA' ? '🏆' : '🎁'} {p.name} ({p.winners.length}/{p.quantity})
                                </option>
                            ))}
                        </select>
                    </div>

                    {!isUtama && (
                        <div className="flex items-center gap-4 bg-black/50 px-6 py-3 rounded-full border border-white/10">
                            <span className="text-white/60 font-mono text-sm tracking-widest">DRAW COUNT:</span>
                            <div className="flex gap-2">
                                {[1, 5, 10].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setDrawCount(n)}
                                        className={`w-10 h-10 rounded-full font-bold transition-all ${drawCount === n ? 'bg-brand-primary text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full max-w-4xl mx-auto bg-brand-secondary/80 backdrop-blur-md border border-brand-primary/20 p-4 md:p-5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    <div className="flex justify-between text-brand-surface/80 mb-3 font-mono text-xs md:text-sm tracking-widest font-bold">
                        <span>HADIR: {candidates.length}</span>
                        <span className="text-brand-primarySoft">MENANG: {prizes.reduce((acc, p) => acc + p.winners.length, 0)}</span>
                    </div>
                    <div className="w-full h-2 md:h-2.5 bg-black/60 rounded-full overflow-hidden shadow-inner border border-white/5">
                        <div 
                            className="h-full bg-gradient-to-r from-brand-primary to-brand-accent shadow-[0_0_15px_rgba(212,168,83,0.8)] transition-all duration-1000" 
                            style={{ width: `${Math.max(0, 100 - (prizes.reduce((acc, p) => acc + p.winners.length, 0) / (candidates.length || 1) * 100))}%` }} 
                        />
                    </div>
                </div>

                <div className={`w-full max-w-[1400px] transition-all duration-1000 ${isUtama ? 'border-red-500/50 shadow-[0_0_100px_rgba(255,0,0,0.1)] rounded-3xl p-8' : ''}`}>
                    <div className={`grid ${getGridClass()} gap-x-8 gap-y-12 justify-items-center py-6 px-4`}>
                        {displayWheels.map((winner, idx) => (
                            <div key={idx} className="w-full flex flex-col items-center">
                                <LuckyDraw3DWheel
                                    candidates={candidates}
                                    winner={winner}
                                    spinning={spinning || spinningRef.current}
                                    isGrandPrize={isUtama}
                                    stopDelay={isUtama ? 0 : idx * 1000} // staggered stop
                                    onStop={() => handleWheelStop(idx, displayWheels.length, isUtama)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 flex justify-center w-full relative z-[60]">
                    <button
                        onClick={handleSpin}
                        disabled={spinning || spinningRef.current || isSoldOut || !selectedPrizeId}
                        className={`
                            relative px-16 py-6 rounded-full font-black text-2xl md:text-3xl font-mono tracking-[0.3em] uppercase transition-all duration-300 transform hover:scale-105 active:scale-95
                            ${(spinning || spinningRef.current)
                                ? 'bg-brand-border/50 text-white/50 cursor-not-allowed border border-white/20'
                                : isSoldOut
                                    ? 'bg-red-500/20 text-red-500 cursor-not-allowed border border-red-500/30'
                                    : isUtama 
                                        ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-[0_0_50px_rgba(255,0,0,0.5)] hover:shadow-[0_0_80px_rgba(255,0,0,0.8)] border border-red-400/50 animate-grand-pulse'
                                        : 'bg-gradient-to-r from-brand-primary to-brand-accent text-brand-secondary shadow-[0_0_50px_rgba(212,168,83,0.4)] hover:shadow-[0_0_80px_rgba(212,168,83,0.6)] border border-brand-primarySoft/50'
                            }
                        `}
                    >
                        {(spinning || spinningRef.current) ? 'SPINNING...' : isSoldOut ? 'HABIS' : isUtama ? '◆ GRAND PRIZE ◆' : '◆ PUTAR UNDIAN ◆'}
                    </button>
                </div>
            </div>
        </div>
    );
}
