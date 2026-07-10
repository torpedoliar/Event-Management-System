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

// Gold-neutral cohesive palette (matching design tokens)
const COLORS = [
    '#D4A853', // Gold (brand-primary)
    '#C49A4A', // Warm gold
    '#A18A5A', // Muted gold
    '#8B7D6B', // Bronze neutral
    '#6B6888', // Dusty mauve
    '#575575', // Muted slate
    '#F5ECD7', // Cream (brand-primarySoft)
    '#E8D5A8', // Light gold
    '#B8A070', // Antique gold
    '#7A7060', // Dark bronze
];

export default function CompanyStatsChart({ stats }: CompanyStatsChartProps) {
    // Filter out companies with 0 guests if any, just in case
    const data = stats.filter(s => s.total > 0);

    return (
        <Card className="w-full flex flex-col h-full">
            <div className="mb-4 border-b border-brand-border pb-3">
                <h3 className="text-lg font-semibold text-brand-text">Statistik per Perusahaan</h3>
                <p className="text-xs text-brand-textMuted">Distribusi Total Tamu</p>
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
                                        <div className="surface-glass p-3 rounded-lg shadow-xl z-50 min-w-[200px]">
                                            <p className="text-sm font-bold text-brand-text mb-2 border-b border-brand-border pb-1">{d.company}</p>
                                            <div className="space-y-1 text-xs">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-brand-textMuted">Total Tamu:</span>
                                                    <span className="font-mono font-bold text-brand-text">{d.total}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-brand-success">Sudah Check-in:</span>
                                                    <span className="font-mono font-bold text-brand-success">{d.checkedIn} ({percentage}%)</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-brand-textMuted">Belum Check-in:</span>
                                                    <span className="font-mono font-bold text-brand-textDim">{d.notCheckedIn}</span>
                                                </div>
                                                <div className="mt-2 pt-1 border-t border-brand-border">
                                                    <div className="w-full bg-brand-surfaceMuted rounded-full h-1.5">
                                                        <div
                                                            className="bg-brand-success h-1.5 rounded-full transition-all duration-500"
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
                                        <span className="text-brand-text font-medium text-xs">{value}</span>
                                        <span className="text-brand-textMuted text-2xs">
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
