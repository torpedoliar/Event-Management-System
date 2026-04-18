"use client";
import { useEffect, useState, useRef } from 'react';
import { apiFetch, apiBase, toApiUrl } from '../../lib/api';
import { Trophy, Sparkles, PartyPopper, History, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Prize {
    id: string;
    name: string;
    description?: string;
    category?: string;
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
    const [showHistory, setShowHistory] = useState(false);
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
                <div className="absolute inset-0 bg-gradient-to-br from-brand-secondary via-[#1e1a30] to-brand-secondary" />
            )}

            {/* Background Effects (only if no custom background) */}
            {(!eventCfg?.backgroundType || eventCfg?.backgroundType === 'NONE') && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-brand-primary/15 rounded-full blur-[120px]" />
                    <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-brand-accent/15 rounded-full blur-[100px]" />
                </div>
            )}

            <div className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-8">

                {/* Header / Prize Selector */}
                <div className="space-y-4">
                    {eventCfg?.logoUrl && (
                        <img src={toApiUrl(eventCfg.logoUrl)} className="h-16 mx-auto mb-4" alt="logo" />
                    )}
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-primarySoft via-brand-primary to-brand-primarySoft drop-shadow-lg tracking-tight">
                        LUCKY DRAW
                    </h1>

                    <div className="flex justify-center gap-4">
                        <select
                            value={selectedPrizeId}
                            onChange={(e) => {
                                setSelectedPrizeId(e.target.value);
                                setWinner(null);
                                setDisplayCandidate(null);
                            }}
                            className="bg-brand-surface/10 border border-brand-primary/30 text-brand-surface text-lg rounded-full px-6 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 backdrop-blur-md"
                        >
                            {prizes.map(p => (
                                <option key={p.id} value={p.id} className="bg-brand-secondary text-brand-surface">
                                    {p.name} ({p.winners.length}/{p.quantity})
                                </option>
                            ))}
                        </select>
                        
                        <button
                            onClick={() => setShowHistory(true)}
                            className="bg-brand-surface/10 hover:bg-brand-surface/20 border border-brand-primary/30 text-brand-surface text-lg rounded-full px-6 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 backdrop-blur-md transition-colors flex items-center gap-2"
                        >
                            <History size={20} />
                            Riwayat
                        </button>
                    </div>
                </div>

                {/* Main Slot Machine Area */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-accent rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                    <div className="relative bg-brand-secondary ring-1 ring-brand-primary/20 rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center min-h-[400px]">

                        {selectedPrize && (
                            <div className="mb-8 text-center">
                                <h2 className="text-2xl md:text-3xl font-bold text-brand-surface mb-2">{selectedPrize.name}</h2>
                                {selectedPrize.description && <p className="text-brand-surface/60">{selectedPrize.description}</p>}
                            </div>
                        )}

                        {/* Display Area */}
                        <div className="w-full max-w-md aspect-video bg-black/40 rounded-xl border-2 border-brand-primary/20 flex flex-col items-center justify-center p-6 relative overflow-hidden mb-8">
                            {displayCandidate ? (
                                <div className="text-center animate-in zoom-in duration-300">
                                    {displayCandidate.photoUrl ? (
                                        <img
                                            src={toApiUrl(displayCandidate.photoUrl)}
                                            alt="Winner"
                                            className="w-32 h-32 rounded-full object-cover border-4 border-brand-accent mx-auto mb-4 shadow-xl"
                                        />
                                    ) : (
                                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-4xl font-bold text-brand-secondary mx-auto mb-4 shadow-xl border-4 border-brand-primary/40">
                                            {displayCandidate.queueNumber}
                                        </div>
                                    )}
                                    <h3 className="text-3xl md:text-4xl font-bold text-brand-surface mb-2">{displayCandidate.name}</h3>
                                    <p className="text-xl text-brand-accent">
                                        {displayCandidate.company || 'Tamu Undangan'}
                                        {displayCandidate.division && <span className="opacity-70 ml-2">({displayCandidate.division})</span>}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center text-brand-surface/30">
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
                                    ? 'bg-brand-border text-brand-textMuted cursor-not-allowed'
                                    : isSoldOut
                                        ? 'bg-brand-border text-brand-textMuted cursor-not-allowed'
                                        : 'bg-gradient-to-r from-brand-primary to-brand-accent text-brand-secondary shadow-lg shadow-brand-primary/30 hover:shadow-brand-primary/50'
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
                        <h3 className="text-xl font-bold text-brand-surface mb-6 flex items-center justify-center gap-2">
                            <PartyPopper className="text-brand-primary" /> Pemenang {selectedPrize.name}
                        </h3>
                        <div className="flex flex-wrap justify-center gap-4">
                            {selectedPrize.winners.map((w: any) => (
                                <div key={w.id} className="bg-brand-surface/10 backdrop-blur-sm border border-brand-primary/20 rounded-xl p-4 flex items-center gap-4 min-w-[250px]">
                                    <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center font-bold text-brand-primary">
                                        {w.queueNumber}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-brand-surface">{w.name}</div>
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
        </div>
    );
}
