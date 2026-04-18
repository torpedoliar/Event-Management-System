"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Card from './ui/Card';

type CompanyStats = {
    company: string;
    total: number;
    checkedIn: number;
    notCheckedIn: number;
};

interface CompanyStatsChartProps {
    stats: CompanyStats[];
}

// Modern Palette for many items
const COLORS = [
    '#34d399', // Emerald-400
    '#60a5fa', // Blue-400
    '#f472b6', // Pink-400
    '#fbbf24', // Amber-400
    '#a78bfa', // Violet-400
    '#2dd4bf', // Teal-400
    '#fb7185', // Rose-400
    '#c084fc', // Purple-400
    '#818cf8', // Indigo-400
    '#e879f9', // Fuchsia-400
];

export default function CompanyStatsChart({ stats }: CompanyStatsChartProps) {
    // Filter out companies with 0 guests if any, just in case
    const data = stats.filter(s => s.total > 0);

    return (
        <Card variant="glass" className="w-full flex flex-col p-5 h-full">
            <div className="mb-4 border-b border-white/10 pb-3">
                <h3 className="text-lg font-bold text-white">Statistik per Perusahaan</h3>
                <p className="text-xs text-white/60">Distribusi Total Tamu</p>
            </div>

            <div className="w-full h-[400px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={2}
                            dataKey="total"
                            nameKey="company"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload as CompanyStats;
                                    const percentage = d.total > 0 ? Math.round((d.checkedIn / d.total) * 100) : 0;
                                    return (
                                        <div className="bg-brand-secondary/95 border border-brand-border p-3 rounded-lg shadow-xl backdrop-blur-md z-50 min-w-[200px]">
                                            <p className="text-sm font-bold text-white mb-2 border-b border-white/10 pb-1">{d.company}</p>
                                            <div className="space-y-1 text-xs">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-white/70">Total Tamu:</span>
                                                    <span className="font-mono font-bold text-white">{d.total}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-brand-success">Sudah Check-in:</span>
                                                    <span className="font-mono font-bold text-brand-success">{d.checkedIn} ({percentage}%)</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-brand-accent">Belum Check-in:</span>
                                                    <span className="font-mono font-bold text-brand-accent">{d.notCheckedIn}</span>
                                                </div>
                                                <div className="mt-2 pt-1 border-t border-white/10">
                                                    <div className="w-full bg-white/10 rounded-full h-1.5">
                                                        <div
                                                            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            wrapperStyle={{
                                paddingLeft: '20px',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                scrollbarWidth: 'thin',
                            }}
                            formatter={(value, entry: any) => {
                                const { payload } = entry;
                                const percentage = payload.total > 0 ? Math.round((payload.checkedIn / payload.total) * 100) : 0;
                                return (
                                    <div className="inline-flex flex-col ml-2 mb-2 align-middle">
                                        <span className="text-white font-medium text-xs">{value}</span>
                                        <span className="text-white/60 text-[10px]">
                                            {payload.checkedIn} / {payload.total} Check-in ({percentage}%)
                                        </span>
                                    </div>
                                );
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
