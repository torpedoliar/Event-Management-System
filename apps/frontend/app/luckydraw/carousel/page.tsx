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
        if (c === 1) return 'grid-cols-1 max-w-4xl';
        if (c <= 2) return 'grid-cols-1 md:grid-cols-2 max-w-5xl';
        if (c <= 4) return 'grid-cols-2 max-w-5xl';
        if (c <= 6) return 'grid-cols-2 md:grid-cols-3 max-w-6xl';
        if (c <= 10) return 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5 max-w-7xl';
        return 'grid-cols-3 md:grid-cols-5 max-w-7xl';
    };

    const selectedPrize = prizes.find(p => p.id === selectedPrizeId);
    const isSoldOut = selectedPrize ? selectedPrize.winners.length >= selectedPrize.quantity : false;
    const isUtama = selectedPrize?.category === 'UTAMA';
    const totalWon = prizes.reduce((a, p) => a + p.winners.length, 0);

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white"><div className="animate-spin w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full" /></div>;

    const wheelCount = winners.length > 0 ? winners.length : (isUtama ? 1 : drawCount);
    const displayWheels = Array.from({ length: wheelCount }, (_, idx) => winners[idx] || null);

    return (
        <div className={`min-h-screen flex flex-col relative overflow-hidden ${screenShake ? 'animate-screen-shake' : ''}`}>

            {/* Mode Selector */}
            <div className="fixed top-24 left-6 z-[70]">
                <select onChange={(e) => { if (e.target.value === 'classic') window.location.href = '/luckydraw'; else if (e.target.value === 'slot') window.location.href = '/luckydraw/display'; }} value="carousel"
                    className="bg-brand-secondary/80 border border-brand-primary/50 text-brand-primarySoft text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary backdrop-blur-xl shadow-lg font-mono tracking-wider cursor-pointer">
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
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-700">
                    <button onClick={toggleSound}
                        className="group relative bg-brand-secondary/80 border-2 border-brand-primary/50 p-12 rounded-[3rem] flex flex-col items-center gap-6 hover:border-brand-primary transition-all hover:scale-105 shadow-[0_0_100px_rgba(212,168,83,0.2)]">
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

            {screenFlash && <div className="fixed inset-0 z-[60] bg-white pointer-events-none animate-[screen-flash_0.3s_ease-out]" />}
            {darkReveal && <div className="dark-reveal pointer-events-none z-[50]" />}

            {/* ═══ MAIN CONTENT ═══ */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 w-full px-4 md:px-8 py-6">

                {/* ─── Top: Title + Prize Info ─── */}
                <div className="w-full flex flex-col items-center gap-4">
                    {/* Title */}
                    <h1 className="text-3xl md:text-5xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-b from-brand-primarySoft via-brand-primary to-brand-accent drop-shadow-[0_10px_30px_rgba(212,168,83,0.3)] tracking-[0.1em] uppercase text-center">
                        LUCKY DRAW
                    </h1>

                    {/* Prize Info Bar */}
                    <div className="flex flex-wrap items-center justify-center gap-4 px-6 py-3 rounded-2xl border border-brand-primary/30 bg-brand-secondary/60 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                        <Trophy size={20} className="text-brand-primary" />
                        <select value={selectedPrizeId} onChange={(e) => { setSelectedPrizeId(e.target.value); setWinners([]); setDrawCount(1); }} disabled={spinning}
                            className="bg-transparent text-lg font-bold uppercase tracking-widest font-mono focus:outline-none disabled:opacity-50 cursor-pointer text-brand-primarySoft pr-4">
                            {prizes.map(p => (
                                <option key={p.id} value={p.id} className="bg-brand-secondary text-brand-surface font-sans">
                                    {p.category === 'UTAMA' ? '🏆' : '🎁'} {p.name} ({p.winners.length}/{p.quantity})
                                </option>
                            ))}
                        </select>
                        <div className="flex gap-4 text-xs font-mono tracking-widest">
                            <span className="text-white/50">HADIR: <span className="text-brand-primary font-bold">{candidates.length}</span></span>
                            <span className="text-white/50">MENANG: <span className="text-brand-primary font-bold">{totalWon}</span></span>
                        </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center gap-3">
                        {!isUtama && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-primary/20 bg-brand-secondary/50 backdrop-blur-sm">
                                <span className="text-xs font-mono tracking-widest text-white/40 mr-1">×</span>
                                {[1, 5, 10].map(n => (
                                    <button key={n} onClick={() => setDrawCount(n)} disabled={spinning}
                                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${
                                            drawCount === n 
                                                ? 'bg-brand-primary text-brand-secondary' 
                                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                        }`}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        )}
                        <button onClick={toggleSound} className={`p-3 rounded-xl backdrop-blur-sm border transition-all ${soundEnabled ? 'bg-brand-primary/20 border-brand-primary text-brand-primarySoft' : 'bg-brand-secondary/50 border-white/10 text-white/40'}`}>
                            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                        </button>
                        <button onClick={() => setShowHistory(true)} className="p-3 rounded-xl backdrop-blur-sm border border-white/10 bg-brand-secondary/50 text-brand-primarySoft hover:border-brand-primary/50 transition-all flex items-center gap-2 group">
                            <History size={20} />
                            <span className="max-w-0 overflow-hidden group-hover:max-w-[100px] transition-all duration-500 text-xs font-mono font-bold uppercase tracking-widest whitespace-nowrap hidden md:block">Riwayat</span>
                        </button>
                    </div>
                </div>

                {/* ─── Center: Wheels Area ─── */}
                <div className={`w-full flex items-center justify-center py-2 ${isUtama ? 'scale-[1.02]' : ''} transition-transform duration-500`}>
                    <div className={`grid ${getGridClass()} gap-4 justify-items-center w-full mx-auto`}>
                        {displayWheels.map((winner, idx) => (
                            <div key={idx} className="w-full">
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

                {/* ─── Bottom: Spin Button ─── */}
                <div className="pb-4 flex justify-center w-full">
                    <button onClick={handleSpin} disabled={spinning || isSoldOut || !selectedPrizeId}
                        className={`
                            relative px-12 py-5 rounded-full font-bold text-xl md:text-2xl font-mono tracking-[0.2em] uppercase transition-all duration-300 transform hover:scale-105 active:scale-95
                            ${spinning
                                ? 'bg-brand-border/50 text-brand-textMuted cursor-not-allowed border border-brand-border'
                                : isSoldOut
                                    ? 'bg-brand-danger/20 text-brand-danger cursor-not-allowed border border-brand-danger/30'
                                    : 'bg-gradient-to-r from-brand-primary to-brand-accent text-brand-secondary shadow-[0_0_50px_rgba(212,168,83,0.4)] hover:shadow-[0_0_80px_rgba(212,168,83,0.6)] border border-brand-primarySoft/50'
                            }
                        `}>
                        {spinning ? 'SPINNING...' : isSoldOut ? 'HABIS' : isUtama ? 'GRAND PRIZE' : 'PUTAR UNDIAN'}
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
