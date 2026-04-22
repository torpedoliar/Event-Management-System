"use client";
import React, { useEffect, useState, useRef } from 'react';
import { apiFetch, toApiUrl } from '../../../lib/api';
import { Trophy, Volume2, VolumeX, History } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSSE } from '../../../lib/sse-context';
import LuckyDraw3DWheel, { Guest } from '../../../components/LuckyDraw3DWheel';
import WinnerHistoryModal from '../../../components/WinnerHistoryModal';

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
    const [showHistory, setShowHistory] = useState(false);
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
    const totalWheelsRef = useRef(0);
    const { addEventListener, removeEventListener } = useSSE();

    const playSound = (audioRef: React.RefObject<HTMLAudioElement | null>, loop = false) => {
        if (!soundEnabled || !audioRef.current) return;
        audioRef.current.currentTime = 0;
        audioRef.current.loop = loop;
        audioRef.current.volume = 1.0;
        audioRef.current.play().catch(() => {});
    };
    const stopSound = (audioRef: React.RefObject<HTMLAudioElement | null>) => {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    };
    const toggleSound = () => {
        const ns = !soundEnabled;
        setSoundEnabled(ns);
        if (ns) {
            [audioRollRef, audioTensionRef, audioWinRef, audioGrandWinRef].forEach(ref => {
                if (ref.current) { ref.current.load(); ref.current.volume = 0; ref.current.play().then(() => { ref.current?.pause(); if (ref.current) { ref.current.currentTime = 0; ref.current.volume = 1.0; } }).catch(() => {}); }
            });
        }
    };
    const getExcludedWinnerIds = (pd: Prize[]): Set<string> => {
        const ex = new Set<string>();
        for (const p of pd) { if (!p.allowMultipleWins) { for (const w of p.winners) ex.add(w.id); } }
        return ex;
    };
    const loadData = async () => {
        try {
            const [pd, gd, cd] = await Promise.all([apiFetch<Prize[]>('/prizes'), apiFetch<{ data: Guest[] }>('/guests?checkedIn=true&pageSize=10000'), apiFetch<any>('/config/event')]);
            setPrizes(pd);
            const ex = getExcludedWinnerIds(pd);
            setCandidates((gd.data || []).filter(g => !ex.has(g.id)));
            setEventCfg(cd);
            if (pd.length > 0 && !selectedPrizeId) setSelectedPrizeId(pd[0].id);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => {
        loadData();
        const onPD = (e: MessageEvent) => { const d = JSON.parse(e.data); if (d.prizeId === selectedPrizeId && !spinning) loadData(); };
        const onCfg = (e: MessageEvent) => { try { setEventCfg((p: any) => ({ ...p, ...JSON.parse(e.data) })); } catch {} };
        const onEC = () => { setLoading(true); setSelectedPrizeId(''); loadData(); };
        addEventListener('prize_draw', onPD); addEventListener('config', onCfg); addEventListener('event_change', onEC);
        return () => { removeEventListener('prize_draw', onPD); removeEventListener('config', onCfg); removeEventListener('event_change', onEC); };
    }, [selectedPrizeId, addEventListener, removeEventListener]);

    const handleSpin = async () => {
        if (spinning || !selectedPrizeId) return;
        const prize = prizes.find(p => p.id === selectedPrizeId);
        if (!prize) return;
        const isU = prize.category === 'UTAMA';
        const ac = isU ? 1 : drawCount;
        setWinners([]); stoppedWheelsRef.current = 0; totalWheelsRef.current = ac;
        setScreenShake(false); setScreenFlash(false); setDarkReveal(false);
        setSpinning(true);
        playSound(audioRollRef, true);
        if (isU) setScreenShake(true);
        try {
            const results = await apiFetch<Guest[]>(`/prizes/${selectedPrizeId}/draw`, { method: 'POST', body: JSON.stringify({ count: ac }) });
            if (!results || results.length === 0) throw new Error("Tidak ada peserta yang terpilih");
            await sleep(isU ? 3000 : 2000);
            setWinners(results);
            if (isU) playSound(audioTensionRef, true);
            if (!prize.allowMultipleWins) { const wids = new Set(results.map(r => r.id)); setCandidates(prev => prev.filter(c => !wids.has(c.id))); }
        } catch (e: any) {
            stopSound(audioRollRef); stopSound(audioTensionRef); setSpinning(false); setScreenShake(false);
            alert(e.message || 'Gagal mengundi pemenang');
        }
    };

    const handleWheelStop = (index: number, totalWheels: number, isGP: boolean) => {
        stoppedWheelsRef.current += 1;
        const allStopped = stoppedWheelsRef.current >= totalWheelsRef.current;
        if (isGP) {
            setScreenShake(false); stopSound(audioRollRef); stopSound(audioTensionRef); playSound(audioGrandWinRef);
            setScreenFlash(true); setTimeout(() => setScreenFlash(false), 400); setDarkReveal(true);
            confetti({ particleCount: 800, spread: 160, startVelocity: 70, origin: { y: 0.5, x: 0.5 }, colors: ['#FFD700', '#FFA500', '#FFFFFF', '#FF4500', '#1E3A8A'], ticks: 400 });
            const end = Date.now() + 3000; const cols = ['#FFD700', '#FFFFFF'];
            (function frame() { confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: cols }); confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: cols }); if (Date.now() < end) requestAnimationFrame(frame); }());
            setTimeout(() => { confetti({ particleCount: 300, spread: 360, startVelocity: 30, origin: { y: 0.2, x: 0.5 }, colors: ['#FFD700', '#FFFFFF', '#F0E68C'] }); setDarkReveal(false); }, 5000);
            setSpinning(false); loadData();
        } else {
            playSound(audioWinRef);
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 }, colors: ['#FFD700', '#FFA500', '#FF69B4'] });
            if (allStopped) { stopSound(audioRollRef); confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 }, colors: ['#FFD700', '#FFA500', '#FF69B4', '#00FF00', '#00BFFF'] }); setSpinning(false); loadData(); }
        }
    };

    const getGridClass = () => {
        const c = winners.length || (isUtama ? 1 : drawCount);
        if (c === 1) return 'grid-cols-1';
        if (c <= 2) return 'grid-cols-1 md:grid-cols-2';
        if (c <= 4) return 'grid-cols-2 md:grid-cols-2';
        if (c <= 6) return 'grid-cols-2 md:grid-cols-3';
        if (c <= 10) return 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5';
        return 'grid-cols-3 md:grid-cols-5 lg:grid-cols-6';
    };

    const selectedPrize = prizes.find(p => p.id === selectedPrizeId);
    const isSoldOut = selectedPrize ? selectedPrize.winners.length >= selectedPrize.quantity : false;
    const isUtama = selectedPrize?.category === 'UTAMA';
    const totalWon = prizes.reduce((a, p) => a + p.winners.length, 0);

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white"><div className="animate-spin w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full" /></div>;

    const wheelCount = winners.length > 0 ? winners.length : (isUtama ? 1 : drawCount);
    const displayWheels = Array.from({ length: wheelCount }, (_, idx) => winners[idx] || null);

    return (
        <div className={`min-h-[100dvh] flex flex-col relative overflow-hidden bg-[#0A0A12] ${screenShake ? 'animate-screen-shake' : ''}`}>
            {/* ═══ CYBER-GOLD BACKGROUND ═══ */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 opacity-20"
                     style={{
                       backgroundImage: 'linear-gradient(rgba(212,168,83,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,0.1) 1px, transparent 1px)',
                       backgroundSize: '40px 40px',
                       transform: 'perspective(1000px) rotateX(60deg) translateY(-100px) scale(3)'
                     }}
                />
                <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-[#15120a] to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-[50vh] bg-gradient-to-t from-[#15120a] to-transparent" />
            </div>

            {/* Spotlights (From Image 3) */}
            <div className="fixed -bottom-20 -left-20 w-[40vw] h-[100vh] bg-gradient-to-tr from-[rgba(212,168,83,0.15)] via-transparent to-transparent rotate-45 transform origin-bottom-left blur-2xl pointer-events-none z-0" />
            <div className="fixed -bottom-20 -right-20 w-[40vw] h-[100vh] bg-gradient-to-tl from-[rgba(212,168,83,0.15)] via-transparent to-transparent -rotate-45 transform origin-bottom-right blur-2xl pointer-events-none z-0" />

            {/* Mode Selector */}
            <div className="fixed top-24 left-6 z-[70]">
                <select onChange={(e) => { if (e.target.value === 'classic') window.location.href = '/luckydraw'; else if (e.target.value === 'slot') window.location.href = '/luckydraw/display'; }} value="carousel"
                    className="bg-black/60 border border-brand-primary/40 text-brand-primarySoft text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary backdrop-blur-xl shadow-lg font-mono tracking-wider cursor-pointer">
                    <option value="classic">🎲 Classic Mode</option>
                    <option value="slot">🎰 Slot Machine</option>
                    <option value="carousel">🎡 3D Carousel</option>
                </select>
            </div>

            <audio ref={audioRollRef} src={toApiUrl(eventCfg?.rollSoundUrl || "/sounds/roll.mp3")} preload="auto" />
            <audio ref={audioTensionRef} src={toApiUrl(eventCfg?.tensionSoundUrl || "/sounds/tension.mp3")} preload="auto" />
            <audio ref={audioWinRef} src={toApiUrl(eventCfg?.winSoundUrl || "/sounds/win.mp3")} preload="auto" />
            <audio ref={audioGrandWinRef} src={toApiUrl(eventCfg?.grandWinSoundUrl || "/sounds/grand-win.mp3")} preload="auto" />

            {!soundEnabled && !loading && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-md">
                    <button onClick={toggleSound} className="group relative p-14 rounded-[2rem] flex flex-col items-center gap-6 transition-all hover:scale-105"
                      style={{ background: 'linear-gradient(180deg, rgba(30,30,50,0.95) 0%, rgba(15,15,30,0.98) 100%)', border: '2px solid rgba(212,168,83,0.4)', boxShadow: '0 0 40px rgba(212,168,83,0.15)' }}>
                        <Volume2 size={56} style={{ color: '#D4A853' }} />
                        <h3 className="text-2xl font-bold uppercase tracking-[0.3em] font-mono" style={{ color: '#D4A853' }}>Enable Audio</h3>
                    </button>
                </div>
            )}

            {screenFlash && <div className="fixed inset-0 z-[60] bg-white pointer-events-none animate-[screen-flash_0.3s_ease-out]" />}
            {darkReveal && <div className="dark-reveal pointer-events-none z-[50]" />}

            {/* ═══ MAIN CONTENT ═══ */}
            <div className="relative z-10 flex-1 flex flex-col items-center w-full px-4 md:px-8 py-8 gap-4 overflow-y-auto custom-scrollbar">

                {/* ─── Top Header Title ─── */}
                <div className="text-center mt-2 mb-2 relative">
                    <div className="absolute inset-0 bg-brand-primary/20 blur-2xl rounded-full" />
                    <div className="relative inline-block border-[3px] border-brand-primary rounded-xl px-12 py-3 bg-[#11111a]/80 shadow-[0_0_30px_rgba(212,168,83,0.3)] backdrop-blur-sm">
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-widest font-mono drop-shadow-[0_0_10px_rgba(212,168,83,0.8)]"
                            style={{ textShadow: '0 0 10px rgba(212,168,83,0.8), 0 0 20px rgba(212,168,83,0.4)' }}>
                            GOLDEN CELEBRATION LUCKY DRAW
                        </h1>
                    </div>
                </div>

                {/* ─── Stats Panel & Controls ─── */}
                <div className="w-full max-w-4xl flex flex-col items-center gap-4">
                    <div className="flex flex-wrap items-center justify-center gap-4 px-6 py-4 rounded-2xl w-full max-w-2xl border-2 border-brand-primary/50 bg-[#1A1A2E]/80 backdrop-blur-md shadow-[0_0_20px_rgba(212,168,83,0.2)]">
                        <div className="flex-1 flex flex-col items-center min-w-[140px] px-4 border-r border-brand-primary/30">
                            <span className="text-xs font-mono tracking-widest text-brand-primarySoft/80 mb-1">ATTENDEES</span>
                            <span className="text-3xl font-black text-brand-primary drop-shadow-[0_0_8px_rgba(212,168,83,0.8)]">{candidates.length}</span>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center min-w-[200px] px-4 border-r border-brand-primary/30">
                            <span className="text-xs font-mono tracking-widest text-brand-primarySoft/80 mb-1">PRIZE</span>
                            <select value={selectedPrizeId} onChange={(e) => { setSelectedPrizeId(e.target.value); setWinners([]); setDrawCount(1); }} disabled={spinning}
                                className="bg-transparent text-xl font-bold uppercase tracking-widest font-mono focus:outline-none disabled:opacity-50 cursor-pointer text-white text-center w-full appearance-none">
                                {prizes.map(p => (
                                    <option key={p.id} value={p.id} className="bg-brand-secondary text-brand-surface font-sans">
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 flex flex-col items-center min-w-[140px] px-4">
                            <span className="text-xs font-mono tracking-widest text-brand-primarySoft/80 mb-1">WINNERS</span>
                            <span className="text-3xl font-black text-brand-primary drop-shadow-[0_0_8px_rgba(212,168,83,0.8)]">{totalWon}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                        {!isUtama && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-primary/30 bg-[#1A1A2E]/60 backdrop-blur-sm shadow-[0_0_15px_rgba(212,168,83,0.1)]">
                                <span className="text-xs font-mono tracking-widest text-brand-primarySoft/60 mr-2">DRAW COUNT</span>
                                {[1, 5, 10].map(n => (
                                    <button key={n} onClick={() => setDrawCount(n)} disabled={spinning}
                                        className="w-10 h-10 rounded-lg text-base font-bold transition-all disabled:opacity-50"
                                        style={{ 
                                            background: drawCount === n ? 'linear-gradient(180deg, #D4A853, #8B6914)' : 'rgba(255,255,255,0.05)', 
                                            color: drawCount === n ? '#0F0F1A' : 'rgba(245,236,215,0.6)', 
                                            border: drawCount === n ? 'none' : '1px solid rgba(212,168,83,0.2)',
                                            boxShadow: drawCount === n ? '0 0 10px rgba(212,168,83,0.5)' : 'none'
                                        }}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        )}
                        <button onClick={toggleSound} className="p-3 rounded-xl transition-all hover:scale-105 border border-brand-primary/30 bg-[#1A1A2E]/60 backdrop-blur-sm hover:border-brand-primary/60">
                            {soundEnabled ? <Volume2 size={24} style={{ color: '#D4A853' }} /> : <VolumeX size={24} style={{ color: 'rgba(245,236,215,0.4)' }} />}
                        </button>
                        <button onClick={() => setShowHistory(true)} className="p-3 rounded-xl transition-all hover:scale-105 flex items-center gap-2 group border border-brand-primary/30 bg-[#1A1A2E]/60 backdrop-blur-sm hover:border-brand-primary/60">
                            <History size={24} style={{ color: '#D4A853' }} />
                            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 text-sm font-mono font-bold uppercase tracking-widest whitespace-nowrap hidden md:block" style={{ color: '#D4A853' }}>Riwayat</span>
                        </button>
                    </div>
                </div>

                {/* ─── Wheels Area ─── */}
                <div className={`w-full max-w-[1600px] flex-1 flex items-center justify-center transition-all duration-1000 my-6 ${isUtama ? 'scale-[1.05]' : ''}`}>
                    <div className={`grid ${getGridClass()} gap-x-6 gap-y-12 justify-items-center w-full px-4`}>
                        {displayWheels.map((winner, idx) => (
                            <div key={idx} className="w-full flex flex-col items-center">
                                <LuckyDraw3DWheel
                                    candidates={candidates}
                                    winner={winner}
                                    spinning={spinning}
                                    isGrandPrize={!!isUtama}
                                    stopDelay={isUtama ? 0 : idx * 600}
                                    onStop={() => handleWheelStop(idx, displayWheels.length, !!isUtama)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── LUXURY SPIN BUTTON ─── */}
                <div className="mt-auto mb-10 flex justify-center w-full relative z-[60]">
                    <button onClick={handleSpin} disabled={spinning || isSoldOut || !selectedPrizeId}
                        className="relative group transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:hover:scale-100 rounded-full flex items-center justify-center"
                        style={{ width: '160px', height: '160px' }}>
                        
                        {/* Outer Glow Ring */}
                        <div className="absolute inset-0 rounded-full opacity-60 border-[2px] border-brand-primary"
                             style={{ 
                                boxShadow: '0 0 30px rgba(212,168,83,0.5)',
                                animation: spinning ? 'pulse 1s infinite' : 'spin 8s linear infinite'
                             }} />
                        
                        {/* Inner Ring dashed */}
                        <div className="absolute inset-2 rounded-full border-[2px] border-brand-primary border-dashed opacity-40"
                             style={{ animation: spinning ? 'spin 1s linear infinite' : 'spin 12s linear infinite reverse' }} />

                        {/* Button Core */}
                        <div className="absolute inset-4 rounded-full overflow-hidden flex items-center justify-center"
                          style={{
                            background: spinning
                              ? 'linear-gradient(180deg, #111 0%, #000 50%, #111 100%)'
                              : isSoldOut
                                ? 'linear-gradient(180deg, #7f1d1d 0%, #450a0a 50%, #7f1d1d 100%)'
                                : 'linear-gradient(180deg, #D4A853 0%, #8B6914 50%, #B8860B 100%)',
                            boxShadow: spinning ? 'inset 0 0 20px rgba(0,0,0,0.8)' : 'inset 0 0 20px rgba(255,255,255,0.2), 0 0 20px rgba(212,168,83,0.6)',
                          }}>
                          {/* Top shine for glass effect */}
                          <div className="absolute top-0 left-0 right-0 h-[40%] bg-white/20 rounded-t-full" />
                          
                          <span className="relative z-10 font-black text-3xl tracking-widest text-white drop-shadow-md">
                            {spinning ? '...' : isSoldOut ? 'HABIS' : 'SPIN'}
                          </span>
                        </div>
                    </button>
                </div>
            </div>

            <WinnerHistoryModal 
                isOpen={showHistory} 
                onClose={() => setShowHistory(false)} 
                prizes={prizes} 
            />
        </div>
    );
}
