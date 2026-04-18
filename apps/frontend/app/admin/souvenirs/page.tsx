"use client";
import RequireAuth from '../../../components/RequireAuth';
import { useEffect, useState } from 'react';
import { apiFetch, parseErrorMessage } from '../../../lib/api';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Package, Trash2, Plus, RefreshCw, Users, Edit2, X, Check } from 'lucide-react';

interface SouvenirTake {
    id: string;
    guestId: string;
    souvenirId: string;
    takenAt: string;
    guest: {
        id: string;
        name: string;
        queueNumber: number;
        division?: string;
    };
}

interface Souvenir {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    quantity: number;
    takes: SouvenirTake[];
    takenCount: number;
    remaining: number;
}

export default function SouvenirsPage() {
    const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [newName, setNewName] = useState('');
    const [newQty, setNewQty] = useState(1);
    const [newDesc, setNewDesc] = useState('');
    const [creating, setCreating] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editQty, setEditQty] = useState(1);
    const [editDesc, setEditDesc] = useState('');
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await apiFetch<Souvenir[]>('/souvenirs');
            setSouvenirs(data);
        } catch (e: any) {
            setError(parseErrorMessage(e.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const createSouvenir = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;
        setCreating(true);
        try {
            await apiFetch('/souvenirs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    quantity: Number(newQty),
                    description: newDesc
                })
            });
            setNewName('');
            setNewQty(1);
            setNewDesc('');
            load();
        } catch (e: any) {
            setError(parseErrorMessage(e.message));
        } finally {
            setCreating(false);
        }
    };

    const deleteSouvenir = async (id: string) => {
        if (!confirm('Hapus souvenir ini?')) return;
        try {
            await apiFetch(`/souvenirs/${id}`, { method: 'DELETE' });
            load();
        } catch (e: any) {
            setError(parseErrorMessage(e.message));
        }
    };

    const resetSouvenir = async (id: string) => {
        if (!confirm('Reset pengambilan untuk souvenir ini? Semua data pengambilan akan dihapus.')) return;
        try {
            await apiFetch(`/souvenirs/${id}/reset`, { method: 'POST' });
            load();
        } catch (e: any) {
            setError(parseErrorMessage(e.message));
        }
    };

    const startEdit = (s: Souvenir) => {
        setEditingId(s.id);
        setEditName(s.name);
        setEditQty(s.quantity);
        setEditDesc(s.description || '');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditQty(1);
        setEditDesc('');
    };

    const saveEdit = async () => {
        if (!editingId || !editName) return;
        setSaving(true);
        try {
            await apiFetch(`/souvenirs/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editName,
                    quantity: Number(editQty),
                    description: editDesc
                })
            });
            setEditingId(null);
            load();
        } catch (e: any) {
            setError(parseErrorMessage(e.message));
        } finally {
            setSaving(false);
        }
    };

    // Calculate totals
    const totalStock = souvenirs.reduce((acc, s) => acc + s.quantity, 0);
    const totalTaken = souvenirs.reduce((acc, s) => acc + s.takenCount, 0);
    const totalRemaining = totalStock - totalTaken;

    return (
        <RequireAuth>
            <div className="min-h-screen p-6 md:p-8 mx-auto max-w-6xl space-y-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Package className="text-brand-accent" />
                        Kelola Souvenir
                    </h1>
                    {/* Summary Stats */}
                    <div className="flex gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                            <div className="text-xs text-white/60 uppercase tracking-wider">Total Stock</div>
                            <div className="text-xl font-bold text-white">{totalStock}</div>
                        </div>
                        <div className="bg-brand-success/10 border border-brand-success/20 rounded-xl px-4 py-2">
                            <div className="text-xs text-brand-success uppercase tracking-wider">Sudah Diambil</div>
                            <div className="text-xl font-bold text-brand-success">{totalTaken}</div>
                        </div>
                        <div className="bg-brand-warning/10 border border-brand-warning/20 rounded-xl px-4 py-2">
                            <div className="text-xs text-brand-warning uppercase tracking-wider">Sisa</div>
                            <div className="text-xl font-bold text-brand-warning">{totalRemaining}</div>
                        </div>
                    </div>
                </div>

                {error && <div className="p-4 rounded-lg bg-brand-danger/10 border border-brand-danger/20 text-brand-danger">{error}</div>}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create Form */}
                    <Card variant="glass" className="h-fit">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Plus size={20} /> Tambah Souvenir
                        </h2>
                        <form onSubmit={createSouvenir} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-brand-textMuted mb-1">Nama Souvenir</label>
                                <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Contoh: Goodie Bag"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-brand-textMuted mb-1">Jumlah Stock</label>
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
                            <Button type="submit" disabled={creating} className="w-full">
                                {creating ? 'Menyimpan...' : 'Simpan Souvenir'}
                            </Button>
                        </form>
                    </Card>

                    {/* List */}
                    <div className="lg:col-span-2 space-y-4">
                        {loading && <div className="text-white/50 text-center py-8">Memuat data...</div>}

                        {!loading && souvenirs.length === 0 && (
                            <div className="text-white/30 text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                                Belum ada souvenir yang ditambahkan
                            </div>
                        )}

                        {souvenirs.map((s) => (
                            <Card key={s.id} variant="glass" className="group hover:bg-white/10 transition-colors">
                                {editingId === s.id ? (
                                    // Edit Mode
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-brand-textMuted mb-1">Nama</label>
                                                <Input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-brand-textMuted mb-1">Jumlah Stock</label>
                                                <Input
                                                    type="number"
                                                    min={s.takenCount}
                                                    value={editQty}
                                                    onChange={(e) => setEditQty(Number(e.target.value))}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-brand-textMuted mb-1">Deskripsi</label>
                                                <Input
                                                    value={editDesc}
                                                    onChange={(e) => setEditDesc(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={cancelEdit}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
                                            >
                                                <X size={16} /> Batal
                                            </button>
                                            <button
                                                onClick={saveEdit}
                                                disabled={saving}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-primary text-white hover:bg-brand-primary/80 transition-colors disabled:opacity-50"
                                            >
                                                <Check size={16} /> {saving ? 'Menyimpan...' : 'Simpan'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // View Mode
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center flex-wrap gap-2 mb-1">
                                                <h3 className="font-bold text-lg text-white">{s.name}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${s.remaining > 0
                                                        ? 'bg-brand-success/20 text-brand-success border-brand-success/30'
                                                        : 'bg-brand-danger/20 text-brand-danger border-brand-danger/30'
                                                    }`}>
                                                    {s.takenCount} / {s.quantity} Diambil
                                                </span>
                                                {s.remaining <= 0 && (
                                                    <span className="px-2 py-0.5 rounded-full bg-brand-danger/20 text-brand-danger text-xs font-medium border border-brand-danger/30">
                                                        HABIS
                                                    </span>
                                                )}
                                            </div>
                                            {s.description && <p className="text-sm text-white/60 mb-3">{s.description}</p>}

                                            {/* Progress Bar */}
                                            <div className="mt-3">
                                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${s.remaining > 0 ? 'bg-brand-success' : 'bg-brand-danger'}`}
                                                        style={{ width: `${(s.takenCount / s.quantity) * 100}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-xs text-white/50 mt-1">
                                                    <span>Sisa: {s.remaining}</span>
                                                    <span>{Math.round((s.takenCount / s.quantity) * 100)}%</span>
                                                </div>
                                            </div>

                                            {/* Recent Takes */}
                                            {s.takes.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-white/10">
                                                    <div className="text-xs font-medium text-brand-textMuted mb-2 uppercase tracking-wider flex items-center gap-1">
                                                        <Users size={12} /> Pengambil Terbaru
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {s.takes.slice(-5).map((t) => (
                                                            <div key={t.id} className="flex items-center gap-2 bg-brand-accent/10 border border-brand-accent/20 rounded-lg px-3 py-1.5">
                                                                <div className="w-6 h-6 rounded-full bg-brand-accent/20 flex items-center justify-center text-xs font-bold text-brand-accent">
                                                                    {t.guest.queueNumber}
                                                                </div>
                                                                <div className="text-sm text-brand-surface">
                                                                    {t.guest.name}
                                                                    {t.guest.division && <span className="opacity-70 text-xs ml-1">({t.guest.division})</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {s.takes.length > 5 && (
                                                            <div className="text-xs text-white/50 flex items-center">
                                                                +{s.takes.length - 5} lainnya
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEdit(s)}
                                                className="p-2 rounded-lg text-brand-primary hover:bg-brand-primary/10 transition-colors"
                                                title="Edit Souvenir"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => deleteSouvenir(s.id)}
                                                className="p-2 rounded-lg text-brand-danger hover:bg-brand-danger/10 transition-colors"
                                                title="Hapus Souvenir"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            {s.takes.length > 0 && (
                                                <button
                                                    onClick={() => resetSouvenir(s.id)}
                                                    className="p-2 rounded-lg text-brand-warning hover:bg-brand-warning/10 transition-colors"
                                                    title="Reset Pengambilan"
                                                >
                                                    <RefreshCw size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </RequireAuth>
    );
}
