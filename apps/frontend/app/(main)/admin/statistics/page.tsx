"use client";

import RequireAuth from '@/components/RequireAuth';
import { useEffect, useState } from 'react';
import { apiFetch, apiBase } from '@/lib/api';
import Card from '@/components/ui/Card';
import GuestStatsChart from '@/components/GuestStatsChart';
import CompanyStatsChart from '@/components/CompanyStatsChart';
import { ArrowLeft, Users, CheckCircle, Clock, Loader2, BarChart3, Radio, TrendingUp, Building2, Gift, Trophy, Package } from 'lucide-react';
import Link from 'next/link';
import { useSSE } from '@/lib/sse-context';

type Stats = { total: number; checkedIn: number; notCheckedIn: number };
type CompanyStats = {
    company: string;
    total: number;
    checkedIn: number;
    notCheckedIn: number;
};

type SouvenirStats = {
    totalSouvenirs: number;
    totalQuantity: number;
    totalTaken: number;
    totalRemaining: number;
    souvenirs: Array<{
        id: string;
        name: string;
        quantity: number;
        taken: number;
        remaining: number;
    }>;
};

type PrizeStats = {
    totalPrizes: number;
    totalQuantity: number;
    totalWon: number;
    totalRemaining: number;
    totalCollected: number;
    totalUncollected: number;
    prizes: Array<{
        id: string;
        name: string;
        category: string;
        quantity: number;
        won: number;
        remaining: number;
        collected: number;
        uncollected: number;
    }>;
};

export default function StatisticsPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [companyStats, setCompanyStats] = useState<CompanyStats[]>([]);
    const [souvenirStats, setSouvenirStats] = useState<SouvenirStats | null>(null);
    const [prizeStats, setPrizeStats] = useState<PrizeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addEventListener, removeEventListener, connected } = useSSE();

    const fetchAllData = async () => {
        try {
            const [s, c, souv, prize] = await Promise.all([
                apiFetch<Stats>('/guests/stats'),
                apiFetch<CompanyStats[]>('/guests/stats/company'),
                apiFetch<SouvenirStats>('/souvenirs/stats').catch(() => null),
                apiFetch<PrizeStats>('/prizes/stats').catch(() => null)
            ]);
            setStats(s);
            setCompanyStats(c);
            setSouvenirStats(souv);
            setPrizeStats(prize);
        } catch (e: any) {
            setError(e.message || 'Gagal memuat data statistik');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();

        // Realtime updates with debounce
        let timeout: NodeJS.Timeout;

        const onChange = () => {
            clearTimeout(timeout);
            timeout = setTimeout(fetchAllData, 1000);
        };

        const onEventChange = () => {
            // Immediate refresh when event changes
            setLoading(true);
            fetchAllData();
        };

        // Guest events
        addEventListener('checkin', onChange);
        addEventListener('uncheckin', onChange);
        addEventListener('guest-update', onChange);
        addEventListener('guest_created_souvenir', onChange);
        
        // Souvenir events
        addEventListener('souvenir_given', onChange);
        addEventListener('souvenir_removed', onChange);
        addEventListener('souvenir_reset', onChange);
        
        // Prize events
        addEventListener('prize_draw', onChange);
        addEventListener('prize_reset', onChange);
        addEventListener('prize_collected', onChange);
        addEventListener('prize_uncollected', onChange);

        addEventListener('event_change', onEventChange);
        addEventListener('config', onEventChange);
        addEventListener('sync_complete', onChange);

        return () => {
            removeEventListener('checkin', onChange);
            removeEventListener('uncheckin', onChange);
            removeEventListener('guest-update', onChange);
            removeEventListener('guest_created_souvenir', onChange);
            removeEventListener('souvenir_given', onChange);
            removeEventListener('souvenir_removed', onChange);
            removeEventListener('souvenir_reset', onChange);
            removeEventListener('prize_draw', onChange);
            removeEventListener('prize_reset', onChange);
            removeEventListener('prize_collected', onChange);
            removeEventListener('prize_uncollected', onChange);
            removeEventListener('event_change', onEventChange);
            removeEventListener('config', onEventChange);
            removeEventListener('sync_complete', onChange);
            clearTimeout(timeout);
        };
    }, [addEventListener, removeEventListener]);

    const checkinPercent = stats ? (stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0) : 0;

    return (
        <RequireAuth>
            <div className="min-h-screen p-4 md:p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/admin/dashboard"
                                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 border border-white/10"
                            >
                                <ArrowLeft size={20} />
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary to-brand-primarySoft flex items-center justify-center shadow-lg">
                                    <BarChart3 size={24} className="text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-white">Statistik Tamu</h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Radio size={12} className={`${connected ? 'text-brand-success pulse-live' : 'text-brand-danger'}`} />
                                        <span className="text-sm text-white/60">{connected ? 'Realtime Updates' : 'Reconnecting...'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="text-brand-danger text-sm bg-brand-danger/10 p-4 rounded-xl border border-brand-danger/20">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <Loader2 className="animate-spin text-brand-primary" size={48} />
                            <span className="text-white/60">Memuat statistik...</span>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            {stats && (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <StatsCard 
                                        title="Total Tamu" 
                                        value={stats.total} 
                                        icon={<Users size={24} />} 
                                        color="blue"
                                        subtitle="Terdaftar"
                                        border="border-t-2 border-t-brand-primary"
                                    />
                                    <StatsCard 
                                        title="Sudah Check-in" 
                                        value={stats.checkedIn} 
                                        icon={<CheckCircle size={24} />} 
                                        color="emerald"
                                        subtitle={`${checkinPercent}%`}
                                        border="border-t-2 border-t-brand-success"
                                    />
                                    <StatsCard 
                                        title="Belum Check-in" 
                                        value={stats.notCheckedIn} 
                                        icon={<Clock size={24} />} 
                                        color="amber"
                                        subtitle="Menunggu"
                                        border="border-t-2 border-t-brand-primary"
                                    />
                                    <StatsCard 
                                        title="Perusahaan" 
                                        value={companyStats.length} 
                                        icon={<Building2 size={24} />} 
                                        color="purple"
                                        subtitle="Terdaftar"
                                        border="border-t-2 border-t-brand-primarySoft"
                                    />
                                </div>
                            )}

                            {/* Progress Bar */}
                            {stats && (
                                <div className="surface p-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp size={18} className="text-brand-primary" />
                                            <span className="text-white font-medium">Progress Kehadiran</span>
                                        </div>
                                        <span className="text-2xl font-bold text-white">{checkinPercent}%</span>
                                    </div>
                                    <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-brand-primary via-brand-primarySoft to-brand-primarySoft transition-all duration-1000 ease-out"
                                            style={{ width: `${checkinPercent}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between mt-2 text-sm text-white/60">
                                        <span>{stats.checkedIn} hadir</span>
                                        <span>{stats.notCheckedIn} belum hadir</span>
                                    </div>
                                </div>
                            )}

                            {/* Charts Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Overall Stats Chart */}
                                <div className="lg:col-span-1 surface-elevated p-4">
                                    {stats && <GuestStatsChart stats={stats} />}
                                </div>

                                {/* Company Stats Chart */}
                                <div className="lg:col-span-2 surface-elevated p-4">
                                    {companyStats.length > 0 ? (
                                        <CompanyStatsChart stats={companyStats} />
                                    ) : (
                                        <Card variant="glass" className="p-8 flex flex-col items-center justify-center h-full text-white/50 gap-4">
                                            <Building2 size={48} className="opacity-30" />
                                            <span>Belum ada data perusahaan</span>
                                        </Card>
                                    )}
                                </div>
                            </div>

                            {/* Souvenir Stats Section */}
                            {souvenirStats && souvenirStats.totalSouvenirs > 0 && (
                                <>
                                    <div className="flex items-center gap-3 mt-8 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-primarySoft flex items-center justify-center shadow-lg">
                                            <Gift size={20} className="text-white" />
                                        </div>
                                        <h2 className="text-xl font-bold text-white">Statistik Souvenir</h2>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <StatsCard 
                                            title="Total Souvenir" 
                                            value={souvenirStats.totalQuantity} 
                                            icon={<Package size={24} />} 
                                            color="purple"
                                            subtitle={`${souvenirStats.totalSouvenirs} jenis`}
                                        />
                                        <StatsCard 
                                            title="Sudah Diambil" 
                                            value={souvenirStats.totalTaken} 
                                            icon={<CheckCircle size={24} />} 
                                            color="emerald"
                                            subtitle={`${souvenirStats.totalQuantity > 0 ? Math.round((souvenirStats.totalTaken / souvenirStats.totalQuantity) * 100) : 0}%`}
                                        />
                                        <StatsCard 
                                            title="Belum Diambil" 
                                            value={souvenirStats.totalRemaining} 
                                            icon={<Clock size={24} />} 
                                            color="amber"
                                            subtitle="Tersisa"
                                        />
                                    </div>

                                    {/* Souvenir Detail Chart */}
                                    <div className="surface p-6">
                                        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                                            <Gift size={18} className="text-brand-primary" />
                                            Detail Souvenir
                                        </h3>
                                        <div className="space-y-4">
                                            {souvenirStats.souvenirs.map((s) => (
                                                <div key={s.id}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-white text-sm">{s.name}</span>
                                                        <span className="text-white/60 text-sm">{s.taken}/{s.quantity}</span>
                                                    </div>
                                                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-brand-primary to-brand-primarySoft transition-all duration-500"
                                                            style={{ width: `${s.quantity > 0 ? (s.taken / s.quantity) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Prize Stats Section */}
                            {prizeStats && prizeStats.totalPrizes > 0 && (
                                <>
                                    <div className="flex items-center gap-3 mt-8 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg">
                                            <Trophy size={20} className="text-white" />
                                        </div>
                                        <h2 className="text-xl font-bold text-white">Statistik Lucky Draw</h2>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <StatsCard 
                                            title="Total Hadiah" 
                                            value={prizeStats.totalQuantity} 
                                            icon={<Trophy size={24} />} 
                                            color="amber"
                                            subtitle={`${prizeStats.totalPrizes} jenis`}
                                        />
                                        <StatsCard 
                                            title="Sudah Diundi" 
                                            value={prizeStats.totalWon} 
                                            icon={<CheckCircle size={24} />} 
                                            color="emerald"
                                            subtitle={`${prizeStats.totalQuantity > 0 ? Math.round((prizeStats.totalWon / prizeStats.totalQuantity) * 100) : 0}%`}
                                        />
                                        <StatsCard 
                                            title="Sudah Diambil" 
                                            value={prizeStats.totalCollected} 
                                            icon={<Gift size={24} />} 
                                            color="blue"
                                            subtitle={`${prizeStats.totalWon > 0 ? Math.round((prizeStats.totalCollected / prizeStats.totalWon) * 100) : 0}%`}
                                        />
                                        <StatsCard 
                                            title="Belum Diambil" 
                                            value={prizeStats.totalUncollected} 
                                            icon={<Clock size={24} />} 
                                            color="purple"
                                            subtitle="Menunggu"
                                        />
                                    </div>

                                    {/* Prize Detail Chart */}
                                    <div className="surface p-6">
                                        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                                            <Trophy size={18} className="text-yellow-400" />
                                            Detail Hadiah
                                        </h3>
                                        <div className="space-y-4">
                                            {prizeStats.prizes.map((p) => (
                                                <div key={p.id}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-white text-sm">{p.name} <span className="text-white/40 text-xs">({p.category})</span></span>
                                                        <div className="flex items-center gap-3 text-sm">
                                                            <span className="text-brand-success">{p.collected} diambil</span>
                                                            <span className="text-brand-warning">{p.uncollected} pending</span>
                                                            <span className="text-white/60">{p.won}/{p.quantity}</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-3 bg-white/10 rounded-full overflow-hidden flex">
                                                        <div 
                                                            className="h-full bg-brand-success transition-all duration-500"
                                                            style={{ width: `${p.quantity > 0 ? (p.collected / p.quantity) * 100 : 0}%` }}
                                                        />
                                                        <div 
                                                            className="h-full bg-brand-warning transition-all duration-500"
                                                            style={{ width: `${p.quantity > 0 ? (p.uncollected / p.quantity) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </RequireAuth>
    );
}

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'from-brand-primary/20 to-brand-primary/10', text: 'text-brand-primary', border: 'border-brand-primary/20' },
    emerald: { bg: 'from-brand-success/20 to-brand-success/10', text: 'text-brand-success', border: 'border-brand-success/20' },
    amber: { bg: 'from-brand-warning/20 to-brand-warning/10', text: 'text-brand-warning', border: 'border-brand-warning/20' },
    purple: { bg: 'from-brand-primary/20 to-brand-primary/10', text: 'text-brand-primary', border: 'border-brand-primary/20' },
};

function StatsCard({ 
    title, 
    value, 
    icon, 
    color = 'blue', 
    subtitle,
    border = ''
}: { 
    title: string; 
    value: number; 
    icon?: React.ReactNode;
    color?: 'blue' | 'emerald' | 'amber' | 'purple';
    subtitle?: string;
    border?: string;
}) {
    const colors = colorMap[color];
    
    return (
        <div className={`stats-card surface p-5 border ${colors.border} ${border}`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colors.bg}`}>
                    <div className={colors.text}>{icon}</div>
                </div>
                {subtitle && (
                    <span className="text-xs text-white/50 font-medium">{subtitle}</span>
                )}
            </div>
            <div>
                <div className="text-sm font-medium text-white/60 mb-1">{title}</div>
                <div className="text-3xl font-bold text-white">{value}</div>
            </div>
        </div>
    );
}
