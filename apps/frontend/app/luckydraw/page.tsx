"use client";
import { useEffect, useState, useRef } from 'react';
import { apiFetch, apiBase, toApiUrl } from '../../lib/api';
import { Trophy, Sparkles, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Prize {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    winners: any[];
}

interface Guest {
    id: string;
    name: string;
    company?: string;
    division?: string;
    photoUrl?: string;
    queueNumber: number;
}

import { useSSE } from '../../lib/sse-context';

export default function LuckyDrawPage() {
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [selectedPrizeId, setSelectedPrizeId] = useState<string>('');
    const [spinning, setSpinning] = useState(false);
    const spinningRef = useRef(false);
    const [winner, setWinner] = useState<Guest | null>(null);
    const [candidates, setCandidates] = useState<Guest[]>([]);
    const [displayCandidate, setDisplayCandidate] = useState<Guest | null>(null);
    const [loading, setLoading] = useState(true);
    const [eventCfg, setEventCfg] = useState<any>(null);
    const { addEventListener, removeEventListener } = useSSE();

    // Load prizes, candidates, and config
    const loadData = async () => {
        try {
            const [prizesData, guestsData, configData] = await Promise.all([
                apiFetch<Prize[]>('/prizes'),
                apiFetch<{ data: Guest[] }>('/guests?checkedIn=true&pageSize=1000'),
                apiFetch<any>('/config/event')
            ]);
            setPrizes(prizesData);
            setCandidates(guestsData.data || []);
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

        setSpinning(true);
        spinningRef.current = true;
        setWinner(null);

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
                    name: `Guest #${randomNum}`,
                    queueNumber: randomNum,
                    company: '...',
                    division: '...'
                });
            }
            counter++;
        }, 50);

        try {
            // Call API to get winner
            const result = await apiFetch<Guest>(`/prizes/${selectedPrizeId}/draw`, { method: 'POST' });

            // Continue animation for a bit longer to build suspense
            setTimeout(() => {
                clearInterval(interval);
                setWinner(result);
                setDisplayCandidate(result);
                setSpinning(false);
                spinningRef.current = false;
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#FFA500', '#FF69B4', '#00FF00', '#00BFFF']
                });
                loadData(); // Refresh prize list to update counts
            }, 3000); // 3 seconds spin

        } catch (e: any) {
            clearInterval(interval);
            setSpinning(false);
            spinningRef.current = false;
            alert(e.message || 'Gagal mengundi pemenang');
        }
    };

    const selectedPrize = prizes.find(p => p.id === selectedPrizeId);
    const isSoldOut = selectedPrize ? selectedPrize.winners.length >= selectedPrize.quantity : false;

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
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
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
            )}

            {/* Background Effects (only if no custom background) */}
            {(!eventCfg?.backgroundType || eventCfg?.backgroundType === 'NONE') && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[120px]" />
                    <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[100px]" />
                </div>
            )}

            <div className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-8">

                {/* Header / Prize Selector */}
                <div className="space-y-4">
                    {eventCfg?.logoUrl && (
                        <img src={toApiUrl(eventCfg.logoUrl)} className="h-16 mx-auto mb-4" alt="logo" />
                    )}
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 drop-shadow-lg tracking-tight">
                        LUCKY DRAW
                    </h1>

                    <div className="flex justify-center">
                        <select
                            value={selectedPrizeId}
                            onChange={(e) => {
                                setSelectedPrizeId(e.target.value);
                                setWinner(null);
                                setDisplayCandidate(null);
                            }}
                            className="bg-white/10 border border-white/20 text-white text-lg rounded-full px-6 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent backdrop-blur-md"
                        >
                            {prizes.map(p => (
                                <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                                    {p.name} ({p.winners.length}/{p.quantity})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Main Slot Machine Area */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                    <div className="relative bg-slate-900 ring-1 ring-white/10 rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center min-h-[400px]">

                        {selectedPrize && (
                            <div className="mb-8 text-center">
                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{selectedPrize.name}</h2>
                                {selectedPrize.description && <p className="text-white/60">{selectedPrize.description}</p>}
                            </div>
                        )}

                        {/* Display Area */}
                        <div className="w-full max-w-md aspect-video bg-black/50 rounded-xl border-2 border-white/10 flex flex-col items-center justify-center p-6 relative overflow-hidden mb-8">
                            {displayCandidate ? (
                                <div className="text-center animate-in zoom-in duration-300">
                                    {displayCandidate.photoUrl ? (
                                        <img
                                            src={toApiUrl(displayCandidate.photoUrl)}
                                            alt="Winner"
                                            className="w-32 h-32 rounded-full object-cover border-4 border-brand-accent mx-auto mb-4 shadow-xl"
                                        />
                                    ) : (
                                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-primary to-purple-600 flex items-center justify-center text-4xl font-bold text-white mx-auto mb-4 shadow-xl border-4 border-white/20">
                                            {displayCandidate.queueNumber}
                                        </div>
                                    )}
                                    <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">{displayCandidate.name}</h3>
                                    <p className="text-xl text-brand-accent">
                                        {displayCandidate.company || 'Tamu Undangan'}
                                        {displayCandidate.division && <span className="opacity-70 ml-2">({displayCandidate.division})</span>}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center text-white/30">
                                    <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg">Siap untuk mengundi?</p>
                                </div>
                            )}
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleDraw}
                            disabled={spinning || isSoldOut || !selectedPrizeId}
                            className={`
                relative px-12 py-4 rounded-full font-bold text-xl tracking-wider uppercase transition-all transform hover:scale-105 active:scale-95
                ${spinning
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : isSoldOut
                                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-brand-primary to-purple-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                                }
              `}
                        >
                            {spinning ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin">🎲</span> Mengundi...
                                </span>
                            ) : isSoldOut ? (
                                'Habis Terbagi'
                            ) : (
                                'Putar Undian'
                            )}
                        </button>

                    </div>
                </div>

                {/* Winners List for this Prize */}
                {selectedPrize && selectedPrize.winners.length > 0 && (
                    <div className="mt-12">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center justify-center gap-2">
                            <PartyPopper className="text-yellow-400" /> Pemenang {selectedPrize.name}
                        </h3>
                        <div className="flex flex-wrap justify-center gap-4">
                            {selectedPrize.winners.map((w: any) => (
                                <div key={w.id} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center gap-4 min-w-[250px]">
                                    <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center font-bold text-brand-primary">
                                        {w.queueNumber}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-white">{w.name}</div>
                                        <div className="text-xs text-white/60">
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
        </div>
    );
}
