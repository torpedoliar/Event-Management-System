"use client";
import { useEffect, useState, useRef, useMemo } from 'react';
import { apiFetch, apiBase, toApiUrl } from '../../lib/api';
import { Trophy, Sparkles, PartyPopper, History, X, Users, Search, Award, Hash } from 'lucide-react';
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

    // NEW: Dedicated state untuk panel peserta (server-driven)
    const [searchGuestId, setSearchGuestId] = useState('');
    const [eligibleData, setEligibleData] = useState<EligibleGuest[]>([]);
    const [eligibleMeta, setEligibleMeta] = useState({ total: 0, eligible: 0, won: 0, totalCheckedIn: 0, page: 1, totalPages: 1 });
    const [eligibleLoading, setEligibleLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const listEndRef = useRef<HTMLDivElement>(null);

    const PAGE_SIZE = 50;

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

    // Load prizes, candidates, and config
    const loadData = async () => {
        try {
            const [prizesData, guestsData, configData] = await Promise.all([
                apiFetch<Prize[]>('/prizes'),
                apiFetch<{ data: Guest[] }>('/guests?checkedIn=true&pageSize=10000'),
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
                        <img src={toApiUrl(eventCfg.logoUrl)} className="h-20 mx-auto mb-8 drop-shadow-2xl" alt="logo" />
                    )}
                    <h1 className="text-5xl md:text-8xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-b from-brand-primarySoft via-brand-primary to-brand-accent drop-shadow-[0_10px_30px_rgba(212,168,83,0.3)] tracking-[0.1em] uppercase">
                        LUCKY DRAW
                    </h1>

                    <div className="flex justify-center gap-6 mt-12 mb-16">
                        <select
                            value={selectedPrizeId}
                            onChange={(e) => {
                                setSelectedPrizeId(e.target.value);
                                setWinner(null);
                                setDisplayCandidate(null);
                            }}
                            className="bg-brand-secondary/40 border border-brand-primary/20 text-brand-primarySoft text-xl rounded-full px-8 py-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 backdrop-blur-xl transition-all hover:bg-brand-secondary/60 cursor-pointer font-mono tracking-widest uppercase shadow-[0_0_30px_rgba(0,0,0,0.5)]"
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
                <div className="relative group max-w-5xl mx-auto">
                    <div className="absolute -inset-2 bg-gradient-to-r from-brand-primary/40 to-brand-accent/40 rounded-[2rem] blur-2xl opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                    <div className="relative bg-brand-secondary/80 backdrop-blur-2xl border border-brand-primary/20 rounded-[2rem] p-12 md:p-20 flex flex-col items-center justify-center min-h-[500px] shadow-2xl">

                        {selectedPrize && (
                            <div className="mb-12 text-center">
                                <h2 className="text-3xl md:text-4xl font-heading font-bold text-brand-primarySoft mb-3 tracking-widest uppercase">{selectedPrize.name}</h2>
                                {selectedPrize.description && <p className="text-brand-surface/50 font-mono tracking-wider">{selectedPrize.description}</p>}
                            </div>
                        )}

                        {/* Display Area */}
                        <div className="w-full max-w-3xl min-h-[400px] bg-black/60 rounded-3xl border border-brand-primary/30 flex flex-col items-center justify-center p-8 relative overflow-hidden mb-12 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
                            {displayCandidate ? (
                                <div className="text-center animate-in zoom-in duration-300 w-full flex flex-col justify-center items-center h-full">
                                    {displayCandidate.photoUrl ? (
                                        <img
                                            src={toApiUrl(displayCandidate.photoUrl)}
                                            alt="Winner"
                                            className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-[6px] border-brand-primary mx-auto mb-6 shadow-[0_0_40px_rgba(212,168,83,0.4)]"
                                        />
                                    ) : (
                                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-brand-secondary to-black flex items-center justify-center text-4xl md:text-5xl font-mono font-bold text-brand-primarySoft mx-auto mb-6 shadow-[0_0_40px_rgba(212,168,83,0.4)] border-[6px] border-brand-primary">
                                            {displayCandidate.queueNumber}
                                        </div>
                                    )}
                                    <h3 className="text-4xl md:text-6xl font-heading font-bold text-brand-surface mb-3 tracking-wide text-glow line-clamp-2 leading-tight">{displayCandidate.name}</h3>
                                    <div className="bg-brand-primary/10 border border-brand-primary/20 px-6 py-2 rounded-full mt-2">
                                        <p className="text-xl md:text-2xl font-mono text-brand-primary/90 tracking-widest uppercase">
                                            {displayCandidate.company || 'Tamu Undangan'}
                                            {displayCandidate.division && <span className="opacity-50 ml-3">({displayCandidate.division})</span>}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-brand-primary/20">
                                    <Sparkles size={80} className="mx-auto mb-6 opacity-30 animate-pulse" />
                                    <p className="text-2xl font-mono tracking-widest uppercase">Siap Mengundi</p>
                                </div>
                            )}
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleDraw}
                            disabled={spinning || isSoldOut || !selectedPrizeId}
                            className={`
                relative px-16 py-6 rounded-full font-bold text-2xl font-mono tracking-[0.2em] uppercase transition-all duration-300 transform hover:scale-105 active:scale-95
                ${spinning
                                    ? 'bg-brand-border/50 text-brand-textMuted cursor-not-allowed border border-brand-border'
                                    : isSoldOut
                                        ? 'bg-brand-danger/20 text-brand-danger cursor-not-allowed border border-brand-danger/30'
                                        : 'bg-gradient-to-r from-brand-primary to-brand-accent text-brand-secondary shadow-[0_0_50px_rgba(212,168,83,0.4)] hover:shadow-[0_0_80px_rgba(212,168,83,0.6)] border border-brand-primarySoft/50'
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
                {/* Riwayat Button Component */}
                <div className="mt-8 flex justify-center gap-4 flex-wrap">
                    <button
                        onClick={() => setShowEligiblePanel(true)}
                        className="bg-brand-secondary/40 hover:bg-brand-secondary/60 border border-brand-primary/20 text-brand-primarySoft text-xl rounded-full px-8 py-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 backdrop-blur-xl transition-all flex items-center gap-3 font-mono tracking-widest uppercase shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                    >
                        <Users size={24} />
                        PESERTA
                    </button>
                    <button
                        onClick={() => setShowHistory(true)}
                        className="bg-brand-secondary/40 hover:bg-brand-secondary/60 border border-brand-primary/20 text-brand-primarySoft text-xl rounded-full px-8 py-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 backdrop-blur-xl transition-all flex items-center gap-3 font-mono tracking-widest uppercase shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                    >
                        <History size={24} />
                        RIWAYAT
                    </button>
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
