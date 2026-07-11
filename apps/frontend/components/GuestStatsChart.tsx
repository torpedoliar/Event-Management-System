"use client";

import { memo, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, Label } from 'recharts';
import Card from './ui/Card';

type Stats = { total: number; checkedIn: number; notCheckedIn: number };

interface GuestStatsChartProps {
    stats: Stats;
}

// Modern Palette
const COLORS = [
    '#34d399', // Emerald-400 (Checked In)
    '#f472b6', // Pink-400 (Not Checked In) - more vibrant contrast
];

function GuestStatsChart({ stats }: GuestStatsChartProps) {
    const data = useMemo(() => [
        { name: 'Sudah Check-in', value: stats.checkedIn },
        { name: 'Belum Check-in', value: stats.notCheckedIn },
    ], [stats.checkedIn, stats.notCheckedIn]);

    const attendanceRate = useMemo(() => 
        stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0,
        [stats.total, stats.checkedIn]
    );

    return (
        <Card className="w-full flex flex-col">
            <div className="mb-3 flex items-center justify-between border-b border-brand-border pb-3">
                <div>
                    <h3 className="text-lg font-semibold text-brand-text">Statistik Kedatangan</h3>
                    <p className="text-xs text-brand-textMuted">Real-time update</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-semibold text-brand-success">{attendanceRate}%</div>
                    <div className="text-xs text-brand-textMuted">Kehadiran</div>
                </div>
            </div>

            <div className="w-full flex items-center justify-center relative h-[200px]">
                <PieChart width={200} height={200}>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        <Label
                            value={`${stats.checkedIn} / ${stats.total}`}
                            position="center"
                            className="fill-brand-text text-lg font-bold"
                        />
                    </Pie>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="surface p-3 shadow-panel">
                                        <p className="text-sm font-medium text-brand-text mb-1">{data.name}</p>
                                        <p className="text-lg font-bold" style={{ color: payload[0].color }}>
                                            {data.value} Tamu
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </PieChart>

                {/* Custom Legend Overlay */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-brand-success" />
                        <span className="text-white/80">Sudah Check-in</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-brand-danger/80" />
                        <span className="text-white/80">Belum Check-in</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default memo(GuestStatsChart);
