"use client";
import React from 'react';
import { Trophy, X, PartyPopper, Sparkles } from 'lucide-react';

interface Winner {
    id: string;
    guestId?: string;
    name: string;
    company?: string;
    division?: string;
    queueNumber: number;
    wonAt?: string;
}

interface Prize {
    id: string;
    name: string;
    category?: string;
    winners: Winner[];
}

interface WinnerHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    prizes: Prize[];
    logoUrl?: string | null;
}

import PrizeReceiptModal from './PrizeReceiptModal';

export default function WinnerHistoryModal({ isOpen, onClose, prizes, logoUrl }: WinnerHistoryModalProps) {
    const [selectedPrintWinner, setSelectedPrintWinner] = React.useState<Winner | null>(null);
    const [selectedPrintPrize, setSelectedPrintPrize] = React.useState<Prize | null>(null);

    if (!isOpen) return null;

    const hasAnyWinners = prizes.some(p => p.winners.length > 0);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
            <div className="surface-elevated border-brand-primary/30 rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-brand-border flex justify-between items-center bg-brand-bg/30">
                    <h2 className="text-3xl font-bold text-brand-text flex items-center gap-4 uppercase tracking-[0.2em] font-mono">
                        <Trophy className="text-brand-primary" size={32} />
                        Riwayat Pemenang Undian
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-brand-surfaceMuted rounded-full text-brand-textDim hover:text-brand-text transition-all hover:rotate-90"
                    >
                        <X size={32} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-12">
                    {['UTAMA', 'HIBURAN'].map(category => {
                        const categoryPrizes = prizes.filter(p => (p.category || 'HIBURAN') === category);
                        if (categoryPrizes.length === 0 || !categoryPrizes.some(p => p.winners.length > 0)) return null;

                        return (
                            <div key={category} className="space-y-6">
                                <h3 className="text-2xl font-black text-brand-primarySoft mb-6 flex items-center gap-3 uppercase tracking-widest font-mono">
                                    <span className="w-8 h-[2px] bg-brand-primary/30" />
                                    Kategori {category}
                                    <span className="flex-1 h-[2px] bg-brand-primary/30" />
                                </h3>
                                
                                <div className="grid grid-cols-1 gap-8">
                                    {categoryPrizes.filter(p => p.winners.length > 0).map(prize => (
                                        <div key={prize.id} className="surface rounded-3xl p-6 shadow-xl">
                                            <h4 className="text-xl font-bold text-brand-text mb-6 flex items-center gap-3 font-mono tracking-wider uppercase">
                                                <PartyPopper size={24} className="text-brand-primary" />
                                                {prize.name}
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {prize.winners.map((w) => (
                                                    <div 
                                                        key={w.id} 
                                                        onClick={() => {
                                                            setSelectedPrintWinner(w);
                                                            setSelectedPrintPrize(prize);
                                                        }}
                                                        className="bg-brand-bg/50 rounded-2xl p-4 flex items-center gap-4 border border-brand-border hover:border-brand-primary/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(212,168,83,0.15)] transition-all duration-300 group cursor-pointer"
                                                        title="Klik untuk cetak Tanda Serah Terima Hadiah"
                                                    >
                                                        <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center font-black text-lg text-brand-primary group-hover:bg-brand-primary group-hover:text-brand-bg group-hover:scale-110 transition-all duration-300">
                                                            {w.queueNumber}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-base text-brand-text truncate group-hover:text-brand-primarySoft transition-all">
                                                                {w.name}
                                                            </div>
                                                            <div className="text-xs font-mono tracking-wider truncate flex items-center gap-2 mt-0.5">
                                                                {w.guestId && <span className="text-brand-primary/80 font-bold">{w.guestId}</span>}
                                                                <span className="text-brand-textDim">{w.company || '-'}</span>
                                                            </div>
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
                    
                    {!hasAnyWinners && (
                        <div className="text-center py-20 text-brand-textDim flex flex-col items-center gap-6">
                            <Sparkles size={64} className="opacity-20 animate-pulse" />
                            <div className="font-mono text-xl uppercase tracking-[0.4em]">Belum ada pemenang yang diundi</div>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-6 bg-brand-bg/50 border-t border-brand-border text-center">
                   <p className="text-brand-textDim font-mono text-xs uppercase tracking-widest">© Event Management System • Lucky Draw History</p>
                </div>
            </div>

            <PrizeReceiptModal
                isOpen={selectedPrintWinner !== null}
                onClose={() => {
                    setSelectedPrintWinner(null);
                    setSelectedPrintPrize(null);
                }}
                winner={selectedPrintWinner}
                prize={selectedPrintPrize}
                logoUrl={logoUrl}
            />
        </div>
    );
}
