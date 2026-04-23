"use client";
import RequireAuth from '../../../components/RequireAuth';
import { useEffect, useState } from 'react';
import { apiFetch, apiBase, parseErrorMessage } from '../../../lib/api';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Gift, Trash2, Plus, Trophy, Tag, RefreshCw, Edit2, FileDown, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PRIZE_CATEGORIES = [
    { value: 'HIBURAN', label: 'Hadiah Hiburan' },
    { value: 'UTAMA', label: 'Hadiah Utama' },
];

interface Prize {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    category: string;
    allowMultipleWins: boolean;
    winners: any[];
}

export default function PrizesPage() {
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [newName, setNewName] = useState('');
    const [newQty, setNewQty] = useState(1);
    const [newDesc, setNewDesc] = useState('');
    const [newCategory, setNewCategory] = useState('HIBURAN');
    const [newAllowMultipleWins, setNewAllowMultipleWins] = useState(false);
    const [creating, setCreating] = useState(false);

    // Edit Quantity State
    const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null);
    const [editingQty, setEditingQty] = useState(1);

    const load = async () => {
        setLoading(true);
        try {
            const data = await apiFetch<Prize[]>('/prizes');
            setPrizes(data);
        } catch (e: any) {
            setError(parseErrorMessage(e.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const createPrize = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;
        setCreating(true);
        try {
            await apiFetch('/prizes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: newName, 
                    quantity: Number(newQty), 
                    description: newDesc,
                    category: newCategory,
                    allowMultipleWins: newAllowMultipleWins
                })
            });
            setNewName('');
            setNewQty(1);
            setNewDesc('');
            setNewCategory('HIBURAN');
            setNewAllowMultipleWins(false);
            load();
        } catch (e: any) {
            setError(parseErrorMessage(e.message));
        } finally {
            setCreating(false);
        }
    };

    const deletePrize = async (id: string) => {
        if (!confirm('Hapus hadiah ini?')) return;
        try {
            await apiFetch(`/prizes/${id}`, { method: 'DELETE' });
            load();
        } catch (e: any) {
            setError(parseErrorMessage(e.message));
        }
    };

    const resetPrize = async (id: string) => {
        if (!confirm('Reset pemenang untuk hadiah ini?')) return;
        try {
            await apiFetch(`/prizes/${id}/reset`, { method: 'POST' });
            load();
        } catch (e: any) {
            setError(parseErrorMessage(e.message));
        }
    };

    const updateQuantity = async (id: string) => {
        try {
            await apiFetch(`/prizes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: editingQty })
            });
            setEditingPrizeId(null);
            load();
        } catch (e: any) {
            setError(parseErrorMessage(e.message));
        }
    };

    const removeWinner = async (prizeId: string, guestId: string) => {
        if (!confirm('Anulir pemenang ini dari hadiah? Stok hadiah akan kembali bisa diundi.')) return;
        try {
            await apiFetch(`/prizes/${prizeId}/winners/${guestId}`, { method: 'DELETE' });
            load();
        } catch (e: any) {
            setError(parseErrorMessage(e.message));
        }
    };

    const exportExcel = () => {
        const data: any[] = [];
        let no = 1;
        prizes.forEach(p => {
            p.winners.forEach(w => {
                data.push({
                    'No': no++,
                    'Nama Hadiah': p.name,
                    'Nama Pemenang': w.name,
                    'ID Pendaftaran': w.guestId || '-',
                    'Departemen': w.company || '-',
                    'Divisi': w.division || '-',
                    'Waktu Menang': w.wonAt ? new Date(w.wonAt).toLocaleString('id-ID') : '-',
                    'TTD Penerimaan Hadiah': '' // Empty column for signature
                });
            });
        });
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan Pemenang");
        XLSX.writeFile(wb, "Laporan_Pemenang_Lucky_Draw.xlsx");
    };

    const exportPdf = () => {
        const doc = new jsPDF('landscape');
        doc.setFontSize(16);
        doc.text('Laporan Pemenang Lucky Draw - Tanda Terima Hadiah', 14, 15);
        
        const tableData: any[][] = [];
        let no = 1;
        prizes.forEach(p => {
            p.winners.forEach(w => {
                tableData.push([
                    no++,
                    p.name,
                    w.name,
                    w.guestId || '-',
                    w.company || '-',
                    w.division || '-',
                    w.wonAt ? new Date(w.wonAt).toLocaleString('id-ID') : '-',
                    '' // Empty column for signature
                ]);
            });
        });

        autoTable(doc, {
            head: [['No', 'Nama Hadiah', 'Nama Pemenang', 'ID', 'Dept', 'Divisi', 'Waktu Menang', 'TTD Penerimaan Hadiah']],
            body: tableData,
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [212, 168, 83] }, // brand-primary color
            columnStyles: {
                7: { cellWidth: 50 } // Wide space for signature
            },
            styles: { fontSize: 9, cellPadding: 4, valign: 'middle', minCellHeight: 15 }
        });

        doc.save('Laporan_Pemenang_Lucky_Draw.pdf');
    };

    return (
        <RequireAuth>
            <div className="min-h-screen p-6 md:p-8 mx-auto max-w-5xl space-y-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Trophy className="text-brand-accent" />
                        Kelola Door Prize
                    </h1>
                    <div className="flex gap-3">
                        <button onClick={exportExcel} disabled={prizes.length === 0} className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/50 rounded-lg hover:bg-green-600/40 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            <FileDown size={18} />
                            Export Excel
                        </button>
                        <button onClick={exportPdf} disabled={prizes.length === 0} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg hover:bg-red-600/40 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            <FileDown size={18} />
                            Export PDF
                        </button>
                    </div>
                </div>

                {error && <div className="p-4 rounded-lg bg-brand-danger/10 border border-brand-danger/20 text-brand-danger">{error}</div>}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create Form */}
                    <Card variant="glass" className="h-fit">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Plus size={20} /> Tambah Hadiah
                        </h2>
                        <form onSubmit={createPrize} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-brand-textMuted mb-1">Nama Hadiah</label>
                                <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Contoh: Sepeda Gunung"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-brand-textMuted mb-1">Jumlah</label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={newQty}
                                    onChange={(e) => setNewQty(Number(e.target.value))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-brand-textMuted mb-1">Deskripsi (Opsional)</label>
                                <Input
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="Keterangan tambahan..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-brand-textMuted mb-1">Kategori</label>
                                <select
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                >
                                    {PRIZE_CATEGORIES.map((cat) => (
                                        <option key={cat.value} value={cat.value} className="bg-brand-secondary">{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                <input
                                    type="checkbox"
                                    id="allowMultipleWins"
                                    checked={newAllowMultipleWins}
                                    onChange={(e) => setNewAllowMultipleWins(e.target.checked)}
                                    className="w-5 h-5 rounded border-white/30 bg-white/10 text-brand-primary focus:ring-brand-primary/50"
                                />
                                <label htmlFor="allowMultipleWins" className="text-sm text-white/80 cursor-pointer">
                                    <span className="font-medium">Boleh Menang Berkali-kali</span>
                                    <p className="text-xs text-white/50 mt-0.5">Pemenang hadiah lain tetap bisa ikut undian hadiah ini</p>
                                </label>
                            </div>
                            <Button type="submit" disabled={creating} className="w-full">
                                {creating ? 'Menyimpan...' : 'Simpan Hadiah'}
                            </Button>
                        </form>
                    </Card>

                    {/* List */}
                    <div className="lg:col-span-2 space-y-4">
                        {loading && <div className="text-white/50 text-center py-8">Memuat data...</div>}

                        {!loading && prizes.length === 0 && (
                            <div className="text-white/30 text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                                Belum ada hadiah yang ditambahkan
                            </div>
                        )}

                        {prizes.map((p) => (
                            <Card key={p.id} variant="glass" className="group hover:bg-white/10 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center flex-wrap gap-2 mb-1">
                                            <h3 className="font-bold text-lg text-white">{p.name}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                                                p.category === 'UTAMA' 
                                                    ? 'bg-brand-warning/20 text-brand-warning border-brand-warning/30' 
                                                    : 'bg-brand-primary/20 text-brand-primarySoft border-brand-primary/30'
                                            }`}>
                                                <Tag size={10} className="inline mr-1" />
                                                {PRIZE_CATEGORIES.find(c => c.value === p.category)?.label || p.category}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary text-xs font-medium border border-brand-primary/30 flex items-center gap-1">
                                                {p.winners.length} / {p.quantity} Pemenang
                                                <button 
                                                    onClick={() => {
                                                        setEditingPrizeId(p.id);
                                                        setEditingQty(p.quantity);
                                                    }}
                                                    className="ml-1 text-brand-primarySoft hover:text-white transition-colors"
                                                    title="Edit Jumlah Hadiah"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                            </span>
                                            {editingPrizeId === p.id && (
                                                <div className="flex items-center gap-2 bg-white/10 p-1 rounded-md ml-2">
                                                    <input 
                                                        type="number" 
                                                        min={p.winners.length} 
                                                        value={editingQty}
                                                        onChange={(e) => setEditingQty(Number(e.target.value))}
                                                        className="w-16 bg-black/50 text-white text-xs px-2 py-1 rounded outline-none"
                                                    />
                                                    <button onClick={() => updateQuantity(p.id)} className="text-xs bg-brand-primary text-brand-secondary px-2 py-1 rounded font-bold">OK</button>
                                                    <button onClick={() => setEditingPrizeId(null)} className="text-xs bg-white/20 text-white px-2 py-1 rounded">Batal</button>
                                                </div>
                                            )}
                                            {p.allowMultipleWins && (
                                                <span className="px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-medium border border-brand-accent/30">
                                                    <RefreshCw size={10} className="inline mr-1" />
                                                    Bisa Menang Ulang
                                                </span>
                                            )}
                                        </div>
                                        {p.description && <p className="text-sm text-white/60 mb-3">{p.description}</p>}

                                        {/* Winners List */}
                                        {p.winners.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-white/10">
                                                <div className="text-xs font-medium text-brand-textMuted mb-2 uppercase tracking-wider">Pemenang Terpilih</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {p.winners.map((w: any) => (
                                                        <div key={w.id} className="group/winner relative flex items-center gap-2 bg-brand-success/10 border border-brand-success/20 rounded-lg px-3 py-1.5 pr-6">
                                                            <div className="w-6 h-6 rounded-full bg-brand-success/20 flex items-center justify-center text-xs font-bold text-brand-success">
                                                                {w.queueNumber}
                                                            </div>
                                                            <div className="text-sm text-brand-surface/80">
                                                                {w.name}
                                                                {w.division && <span className="opacity-70 text-xs ml-1">({w.division})</span>}
                                                            </div>
                                                            <button 
                                                                onClick={() => removeWinner(p.id, w.id)}
                                                                className="absolute right-1.5 opacity-0 group-hover/winner:opacity-100 p-0.5 rounded-full text-brand-danger hover:bg-brand-danger/20 transition-all"
                                                                title="Anulir Pemenang"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => deletePrize(p.id)}
                                            className="p-2 rounded-lg text-brand-danger hover:bg-brand-danger/10 transition-colors"
                                            title="Hapus Hadiah"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        {p.winners.length > 0 && (
                                            <button
                                                onClick={() => resetPrize(p.id)}
                                                className="p-2 rounded-lg text-brand-warning hover:bg-brand-warning/10 transition-colors"
                                                title="Reset Pemenang"
                                            >
                                                <Gift size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </RequireAuth>
    );
}
