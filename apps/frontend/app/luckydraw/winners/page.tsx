"use client";
import React, { useEffect, useState } from 'react';
import { apiFetch, toApiUrl } from '../../../lib/api';
import { useSSE } from '../../../lib/sse-context';
import { Trophy } from 'lucide-react';

interface Winner {
    id: string;
    name: string;
    company?: string;
    division?: string;
    queueNumber: number;
    guestId?: string;
}

interface Prize {
    id: string;
    name: string;
    category: string;
    winners: Winner[];
}

export default function AutoScrollWinnersPage() {
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [eventCfg, setEventCfg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // UI states
    const [scrollSpeed, setScrollSpeed] = useState(30); // seconds for full scroll
    const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
    
    const { addEventListener, removeEventListener } = useSSE();
    
    const loadData = async () => {
        try {
            const [prizesData, configData] = await Promise.all([
                apiFetch<Prize[]>('/prizes'),
                apiFetch<any>('/config/event')
            ]);
            
            // Only keep prizes with winners
            const prizesWithWinners = prizesData.filter(p => p.winners && p.winners.length > 0);
            setPrizes(prizesWithWinners);
            setEventCfg(configData);
        } catch (e) {
            console.error('Failed to load winners data', e);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        loadData();
        
        const onUpdate = () => {
            loadData();
        };
        
        addEventListener('prize_draw', onUpdate);
        addEventListener('event_change', onUpdate);
        
        return () => {
            removeEventListener('prize_draw', onUpdate);
            removeEventListener('event_change', onUpdate);
        };
    }, [addEventListener, removeEventListener]);
    
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-brand-bg text-brand-text font-mono text-2xl tracking-widest animate-pulse">LOADING WINNERS...</div>;
    }
    
    // Base layout style
    const bgStyle = eventCfg?.backgroundUrl 
        ? { backgroundImage: `url(${toApiUrl(eventCfg.backgroundUrl)})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { backgroundColor: '#0B0B11' };
        
    return (
        <div className="min-h-screen w-full overflow-hidden relative flex flex-col" style={bgStyle}>
            {/* Dark Overlay for better contrast */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"></div>
            
            {/* Header (Fixed) */}
            <div className="relative z-20 pt-10 pb-6 px-8 flex flex-col items-center bg-gradient-to-b from-black/80 to-transparent border-b border-white/10">
                {eventCfg?.logoUrl && (
                    <img src={toApiUrl(eventCfg.logoUrl)} className="h-20 md:h-28 object-contain drop-shadow-2xl mb-4" alt="Event Logo" />
                )}
                <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-brand-primarySoft via-brand-primary to-brand-accent uppercase tracking-[0.2em] drop-shadow-[0_0_20px_rgba(212,168,83,0.5)] gradient-text-festive">
                    HALL OF FAME
                </h1>
                <div className="text-brand-textMuted font-mono tracking-[0.3em] mt-2 text-center text-sm md:text-base">DAFTAR PEMENANG UNDIAN</div>
            </div>
            
            {/* Control Panel (Hover to show) */}
            <div className="fixed bottom-4 right-4 z-50 opacity-0 hover:opacity-100 transition-opacity duration-300 glass p-4 rounded-2xl flex flex-col gap-3 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                <div className="text-xs font-mono text-brand-primarySoft text-center mb-1 border-b border-brand-border pb-2">SCROLL CONTROLS</div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-brand-textMuted font-mono">DIRECTION:</span>
                    <button 
                        onClick={() => setScrollDirection('up')}
                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${scrollDirection === 'up' ? 'bg-brand-primary text-brand-bg' : 'bg-brand-text/10 text-brand-text hover:bg-brand-text/20'}`}
                    >
                        UP ⬆️
                    </button>
                    <button 
                        onClick={() => setScrollDirection('down')}
                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${scrollDirection === 'down' ? 'bg-brand-primary text-brand-bg' : 'bg-brand-text/10 text-brand-text hover:bg-brand-text/20'}`}
                    >
                        DOWN ⬇️
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-brand-textMuted font-mono">SPEED:</span>
                    <input 
                        type="range" 
                        min="10" 
                        max="120" 
                        value={130 - scrollSpeed} // Invert so right is faster
                        onChange={(e) => setScrollSpeed(130 - parseInt(e.target.value))}
                        className="w-24 accent-brand-primary"
                    />
                </div>
            </div>

            {/* Scrolling Content */}
            {prizes.length === 0 ? (
                <div className="flex-1 relative z-10 flex flex-col items-center justify-center">
                    <Trophy size={80} className="text-brand-textDim mb-6" />
                    <div className="text-2xl font-mono text-brand-textDim tracking-[0.2em] text-center">BELUM ADA PEMENANG</div>
                </div>
            ) : (
                <div className="flex-1 relative z-10 overflow-hidden w-full max-w-6xl mx-auto mask-fade-y">
                    <div 
                        className="flex flex-col gap-16 absolute w-full px-4 md:px-8 mt-12"
                        style={{
                            animation: `autoScroll ${scrollSpeed}s linear infinite ${scrollDirection === 'up' ? 'normal' : 'reverse'}`,
                        }}
                    >
                        {/* Render exactly 2 copies of the list for seamless loop */}
                        {[1, 2].map((copyIdx) => (
                            <div key={`copy-${copyIdx}`} className="flex flex-col gap-16 pb-16 w-full">
                                {prizes.map((prize) => (
                                    <div key={`${copyIdx}-${prize.id}`} className="surface-glass rounded-[3rem] p-8 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center w-full">
                                        <div className="bg-black border-2 border-brand-primary/50 px-8 py-4 rounded-full mb-10 -mt-16 shadow-[0_15px_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
                                            <div className="absolute inset-0 bg-brand-primary/10 animate-pulse pointer-events-none"></div>
                                            <h2 className="relative z-10 text-2xl md:text-4xl font-black text-brand-primarySoft uppercase tracking-widest text-center">
                                                {prize.name}
                                            </h2>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 w-full">
                                            {prize.winners.map((winner, wIdx) => (
                                                <div key={`${copyIdx}-${prize.id}-${winner.id}-${wIdx}`} className="surface flex flex-col bg-brand-bg/40 border border-brand-border rounded-2xl p-5 hover:bg-brand-bg/60 hover:border-brand-primary/50 hover:shadow-gold transition-colors shadow-lg">
                                                    <div className="text-brand-primary font-mono font-bold text-lg md:text-xl tracking-wider mb-1">
                                                        {winner.guestId || winner.queueNumber}
                                                    </div>
                                                    <div className="font-bold text-xl md:text-2xl text-brand-text truncate">{winner.name}</div>
                                                    <div className="text-sm md:text-base text-brand-primarySoft font-mono truncate uppercase tracking-wider mt-1">
                                                        {winner.company || '-'} {winner.division ? `(${winner.division})` : ''}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}
