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
        if (c <= 4) return 'grid-cols-1 md:grid-cols-2';
        if (c <= 9) return 'grid-cols-1 md:grid-cols-3';
        return 'grid-cols-2 md:grid-cols-4';
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
            {/* ═══ GOLD CURTAIN SIDE EFFECTS ═══ */}
            <div className="fixed inset-y-0 left-0 w-24 md:w-40 pointer-events-none z-[5]"
              style={{ background: 'linear-gradient(90deg, rgba(139,105,20,0.15) 0%, rgba(212,168,83,0.05) 40%, transparent 100%)' }} />
            <div className="fixed inset-y-0 right-0 w-24 md:w-40 pointer-events-none z-[5]"
              style={{ background: 'linear-gradient(270deg, rgba(139,105,20,0.15) 0%, rgba(212,168,83,0.05) 40%, transparent 100%)' }} />

            {/* ═══ ORNATE PAGE BORDER ═══ */}
            <div className="fixed inset-3 md:inset-5 pointer-events-none z-[4] rounded-2xl"
              style={{
                border: '2px solid rgba(212,168,83,0.2)',
                boxShadow: 'inset 0 0 80px rgba(0,0,0,0.3)',
              }}
            >
              <div className="absolute inset-2 rounded-xl" style={{ border: '1px solid rgba(212,168,83,0.1)' }} />
              {/* Corner flares */}
              {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-8 h-8`}>
                  <div className="w-full h-full" style={{
                    background: 'radial-gradient(circle, rgba(212,168,83,0.4) 0%, transparent 70%)',
                  }} />
                </div>
              ))}
            </div>

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
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full px-4 md:px-8 py-6 gap-6">

                {/* ─── Top Bar: Logo + Prize Info + Sound ─── */}
                <div className="w-full max-w-5xl flex items-center justify-between gap-4">
                    {/* Prize Info Panel */}
                    <div className="flex items-center gap-4 px-5 py-3 rounded-xl"
                      style={{ background: 'linear-gradient(135deg, rgba(15,15,30,0.9) 0%, rgba(25,25,45,0.9) 100%)', border: '1px solid rgba(212,168,83,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                        <Trophy size={22} style={{ color: '#D4A853' }} />
                        <div>
                            <select value={selectedPrizeId} onChange={(e) => { setSelectedPrizeId(e.target.value); setWinners([]); setDrawCount(1); }} disabled={spinning}
                                className="bg-transparent text-lg font-bold uppercase tracking-widest font-mono focus:outline-none disabled:opacity-50 cursor-pointer pr-6"
                                style={{ color: '#D4A853', maxWidth: '300px' }}>
                                {prizes.map(p => (
                                    <option key={p.id} value={p.id} className="bg-brand-secondary text-brand-surface font-sans">
                                        {p.category === 'UTAMA' ? '🏆' : '🎁'} {p.name} ({p.winners.length}/{p.quantity})
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-6 mt-1 text-xs font-mono tracking-widest">
                                <span style={{ color: 'rgba(245,236,215,0.6)' }}>HADIR: {candidates.length}</span>
                                <span style={{ color: '#D4A853' }}>MENANG: {totalWon}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isUtama && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(15,15,30,0.8)', border: '1px solid rgba(212,168,83,0.2)' }}>
                                <span className="text-xs font-mono tracking-widest" style={{ color: 'rgba(245,236,215,0.5)' }}>×</span>
                                {[1, 5, 10].map(n => (
                                    <button key={n} onClick={() => setDrawCount(n)} disabled={spinning}
                                        className="w-8 h-8 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                                        style={{ background: drawCount === n ? 'linear-gradient(180deg, #D4A853, #8B6914)' : 'rgba(255,255,255,0.05)', color: drawCount === n ? '#0F0F1A' : 'rgba(245,236,215,0.6)', border: drawCount === n ? 'none' : '1px solid rgba(212,168,83,0.15)' }}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        )}
                        <button onClick={toggleSound} className="p-3 rounded-xl transition-all hover:scale-105"
                          style={{ background: 'rgba(15,15,30,0.8)', border: '1px solid rgba(212,168,83,0.2)' }}>
                            {soundEnabled ? <Volume2 size={20} style={{ color: '#D4A853' }} /> : <VolumeX size={20} style={{ color: 'rgba(245,236,215,0.4)' }} />}
                        </button>
                    </div>
                </div>

                {/* ─── Wheels Area ─── */}
                <div className={`w-full max-w-[1400px] flex-1 flex items-center justify-center transition-all duration-1000 ${isUtama ? 'scale-[1.02]' : ''}`}>
                    <div className={`grid ${getGridClass()} gap-x-10 gap-y-14 justify-items-center w-full py-4 px-4`}>
                        {displayWheels.map((winner, idx) => (
                            <div key={idx} className="w-full flex flex-col items-center">
                                <LuckyDraw3DWheel
                                    candidates={candidates}
                                    winner={winner}
                                    spinning={spinning}
                                    isGrandPrize={!!isUtama}
                                    stopDelay={isUtama ? 0 : idx * 1000}
                                    onStop={() => handleWheelStop(idx, displayWheels.length, !!isUtama)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── LUXURY BUTTON ─── */}
                <div className="mt-4 mb-6 flex justify-center w-full relative z-[60]">
                    <button onClick={handleSpin} disabled={spinning || isSoldOut || !selectedPrizeId}
                        className="relative group transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
                        style={{ minWidth: '280px' }}>
                        {/* Button glow */}
                        {!spinning && !isSoldOut && (
                          <div className="absolute -inset-2 rounded-full opacity-50 blur-xl transition-opacity group-hover:opacity-80"
                            style={{ background: isUtama ? 'radial-gradient(ellipse, rgba(220,38,38,0.4), transparent 70%)' : 'radial-gradient(ellipse, rgba(212,168,83,0.3), transparent 70%)' }} />
                        )}
                        {/* Button body */}
                        <div className="relative px-14 md:px-20 py-5 md:py-6 rounded-full overflow-hidden"
                          style={{
                            background: spinning
                              ? 'linear-gradient(180deg, #333 0%, #222 50%, #333 100%)'
                              : isSoldOut
                                ? 'linear-gradient(180deg, #7f1d1d 0%, #450a0a 50%, #7f1d1d 100%)'
                                : isUtama
                                  ? 'linear-gradient(180deg, #B91C1C 0%, #7F1D1D 30%, #991B1B 50%, #7F1D1D 70%, #B91C1C 100%)'
                                  : 'linear-gradient(180deg, #D4A853 0%, #8B6914 30%, #C9A84C 50%, #8B6914 70%, #D4A853 100%)',
                            border: spinning ? '2px solid rgba(255,255,255,0.1)' : isSoldOut ? '2px solid rgba(220,38,38,0.3)' : '2px solid rgba(255,255,255,0.2)',
                            boxShadow: spinning ? 'none' : isUtama ? '0 8px 30px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.3)' : '0 8px 30px rgba(212,168,83,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
                          }}>
                          {/* Glass shine */}
                          <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full"
                            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 100%)' }} />
                          <span className="relative z-10 font-black text-xl md:text-3xl tracking-[0.25em] uppercase font-mono"
                            style={{
                              color: spinning ? 'rgba(255,255,255,0.3)' : isSoldOut ? 'rgba(255,100,100,0.6)' : '#FFFFFF',
                              textShadow: spinning ? 'none' : '0 2px 4px rgba(0,0,0,0.5)',
                            }}>
                            {spinning ? 'SPINNING...' : isSoldOut ? 'HABIS' : isUtama ? 'GRAND PRIZE' : 'PUTAR UNDIAN'}
                          </span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
