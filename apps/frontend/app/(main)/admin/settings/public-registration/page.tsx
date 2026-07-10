"use client";
import RequireAuth from "@/components/RequireAuth";
import { useEffect, useState, useCallback } from "react";
import { apiBase, parseErrorMessage } from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import Select from "@/components/ui/Select";
import { Save, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Settings, Users, Clock, FileText, ListPlus, BarChart3 } from "lucide-react";
import { toLocalDatetimeString, toUTCDateString } from "@/lib/utils";

interface RegField { key: string; label: string; required: boolean; type: string; placeholder?: string; }
interface RegConfig {
  isActive: boolean; maxQuota: number; openAt: string | null; closeAt: string | null;
  title: string; description: string | null;
  successMessage: string; closedMessage: string; fullMessage: string;
  fields: RegField[]; preventDuplicates: boolean; guestIdPrefix: string;
}
interface RegStats {
  isActive: boolean; isOpen: boolean; maxQuota: number;
  currentCount: number; remainingQuota: number | null; isFull: boolean;
}

const FIELD_KEY_OPTIONS = [
  { value: "name", label: "Nama" }, { value: "guestId", label: "ID Peserta" },
  { value: "email", label: "Email" }, { value: "phone", label: "No. HP / Telepon" },
  { value: "company", label: "Perusahaan / Organisasi" }, { value: "department", label: "Departemen" },
  { value: "division", label: "Divisi" }, { value: "tableLocation", label: "Meja / Lokasi" },
  { value: "notes", label: "Catatan" },
];

const DEFAULT_CONFIG: RegConfig = {
  isActive: false, maxQuota: 0, openAt: null, closeAt: null,
  title: "Registrasi Peserta", description: "",
  successMessage: "Terima kasih, registrasi Anda berhasil!",
  closedMessage: "Pendaftaran telah ditutup.",
  fullMessage: "Kuota pendaftaran telah penuh.",
  fields: [{ key: "name", label: "Nama Lengkap", required: true, type: "text", placeholder: "Nama lengkap Anda" }],
  preventDuplicates: false, guestIdPrefix: "PUB",
};

export default function PublicRegistrationSettingsPage() {
  const [config, setConfig] = useState<RegConfig>(DEFAULT_CONFIG);
  const [stats, setStats] = useState<RegStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const tokenHeader = (): HeadersInit => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [cfgRes, statsRes] = await Promise.all([
        fetch(`${apiBase()}/admin/public-registration`, { headers: tokenHeader() }),
        fetch(`${apiBase()}/admin/public-registration/stats`, { headers: tokenHeader() }),
      ]);
      if (!cfgRes.ok) throw new Error(parseErrorMessage(await cfgRes.text()));
      const cfgData = await cfgRes.json();
      setConfig({
        ...DEFAULT_CONFIG, ...cfgData,
        openAt: cfgData.openAt || null,
        closeAt: cfgData.closeAt || null,
        fields: cfgData.fields || DEFAULT_CONFIG.fields,
      });
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Field builder helpers
  const addField = () => {
    const usedKeys = config.fields.map(f => f.key);
    const available = FIELD_KEY_OPTIONS.find(o => !usedKeys.includes(o.value));
    if (!available) { setError("Semua field sudah ditambahkan"); return; }
    setConfig({ ...config, fields: [...config.fields, { key: available.value, label: available.label, required: false, type: "text", placeholder: "" }] });
  };
  const removeField = (index: number) => {
    if (config.fields[index]?.key === "name") { setError("Field 'Nama' tidak bisa dihapus"); return; }
    setConfig({ ...config, fields: config.fields.filter((_, i) => i !== index) });
  };
  const updateField = (index: number, updates: Partial<RegField>) => {
    setConfig({ ...config, fields: config.fields.map((f, i) => i === index ? { ...f, ...updates } : f) });
  };
  const moveField = (index: number, dir: "up" | "down") => {
    const newFields = [...config.fields];
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newFields.length) return;
    [newFields[index], newFields[target]] = [newFields[target], newFields[index]];
    setConfig({ ...config, fields: newFields });
  };

  const handleSave = async () => {
    setSaving(true); setError(null); setMessage(null);
    try {
      const res = await fetch(`${apiBase()}/admin/public-registration`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify({ ...config, openAt: config.openAt || null, closeAt: config.closeAt || null }),
      });
      if (!res.ok) throw new Error(parseErrorMessage(await res.text()));
      setMessage("Pengaturan berhasil disimpan");
      fetchData();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <RequireAuth>
        <div className="min-h-screen flex items-center justify-center p-6">
          <Loader2 className="animate-spin text-brand-primary" size={32} />
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="min-h-screen p-6 md:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Settings size={28} className="text-brand-primary" />
              Registrasi Publik
            </h1>
          </div>

          {error && <div className="text-sm text-brand-danger bg-brand-danger/10 p-3 rounded-lg border border-brand-danger/20">{error}</div>}
          {message && <div className="text-sm text-brand-success bg-brand-success/10 p-3 rounded-lg border border-brand-success/20">{message}</div>}

          {/* Stats */}
          {stats && (
            <Card variant="glass" className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <BarChart3 size={20} className="text-brand-primary" />
                <h3 className="font-semibold text-brand-text">Statistik</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-brand-text">{stats.currentCount}</div>
                  <div className="text-xs text-brand-textMuted">Pendaftar</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-brand-text">{stats.maxQuota > 0 ? stats.maxQuota : "~"}</div>
                  <div className="text-xs text-brand-textMuted">Kuota</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className={`text-2xl font-bold ${stats.isOpen ? "text-brand-success" : "text-brand-textMuted"}`}>{stats.isOpen ? "Buka" : "Tutup"}</div>
                  <div className="text-xs text-brand-textMuted">Status</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-brand-text">{stats.remainingQuota !== null ? stats.remainingQuota : "~"}</div>
                  <div className="text-xs text-brand-textMuted">Sisa</div>
                </div>
              </div>
            </Card>
          )}

          {/* Status & Kuota */}
          <Card variant="elevated" className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Users size={20} className="text-brand-primary" />
              <h3 className="font-semibold text-brand-text">Status & Kuota</h3>
            </div>
            <Toggle checked={config.isActive} onChange={(checked) => setConfig({ ...config, isActive: checked })}
              label="Aktifkan Registrasi Publik" description="Buka halaman /register untuk pendaftaran publik" />
            <div>
              <Label className="mb-2">Kuota Peserta (0 = tanpa batas)</Label>
              <Input type="number" min={0} value={config.maxQuota}
                onChange={(e) => setConfig({ ...config, maxQuota: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label className="mb-2">Waktu Buka (opsional)</Label>
                <Input type="datetime-local" value={config.openAt ? toLocalDatetimeString(config.openAt) : ""} onChange={(e) => setConfig({ ...config, openAt: e.target.value ? toUTCDateString(e.target.value) : null })} /></div>
              <div><Label className="mb-2">Waktu Tutup (opsional)</Label>
                <Input type="datetime-local" value={config.closeAt ? toLocalDatetimeString(config.closeAt) : ""} onChange={(e) => setConfig({ ...config, closeAt: e.target.value ? toUTCDateString(e.target.value) : null })} /></div>
            </div>
          </Card>

          {/* Form Content */}
          <Card variant="elevated" className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <FileText size={20} className="text-brand-primary" />
              <h3 className="font-semibold text-brand-text">Konten Form</h3>
            </div>
            <div><Label className="mb-2">Judul</Label>
              <Input value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} /></div>
            <div><Label className="mb-2">Deskripsi</Label>
              <Textarea value={config.description || ""} onChange={(e) => setConfig({ ...config, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label className="mb-2">Pesan Sukses</Label><Input value={config.successMessage} onChange={(e) => setConfig({ ...config, successMessage: e.target.value })} /></div>
              <div><Label className="mb-2">Pesan Tutup</Label><Input value={config.closedMessage} onChange={(e) => setConfig({ ...config, closedMessage: e.target.value })} /></div>
              <div><Label className="mb-2">Pesan Penuh</Label><Input value={config.fullMessage} onChange={(e) => setConfig({ ...config, fullMessage: e.target.value })} /></div>
            </div>
          </Card>

          {/* Field Builder */}
          <Card variant="elevated" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <ListPlus size={20} className="text-brand-primary" />
                <h3 className="font-semibold text-brand-text">Field Pendaftaran</h3>
              </div>
              <Button size="sm" variant="secondary" onClick={addField}><Plus size={16} /> Tambah Field</Button>
            </div>
            <p className="text-xs text-brand-textMuted">Susun field yang ditampilkan di form. Field 'Nama' wajib ada dan tidak bisa dihapus.</p>
            <div className="space-y-3">
              {config.fields.map((field, index) => (
                <div key={index} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-brand-textMuted">#{index + 1}{field.key === "name" && " (wajib)"}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveField(index, "up")} disabled={index === 0} className="p-1.5 text-brand-textMuted hover:text-brand-text disabled:opacity-30"><ChevronUp size={16} /></button>
                      <button onClick={() => moveField(index, "down")} disabled={index === config.fields.length - 1} className="p-1.5 text-brand-textMuted hover:text-brand-text disabled:opacity-30"><ChevronDown size={16} /></button>
                      {field.key !== "name" && <button onClick={() => removeField(index)} className="p-1.5 text-brand-textMuted hover:text-brand-danger"><Trash2 size={16} /></button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label className="mb-1 text-xs">Field</Label>
                      <Select value={field.key} disabled={field.key === "name"} onChange={(e) => updateField(index, { key: e.target.value })} className="w-full">
                        {FIELD_KEY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </Select></div>
                    <div><Label className="mb-1 text-xs">Label</Label>
                      <Input value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} /></div>
                    <div><Label className="mb-1 text-xs">Tipe</Label>
                      <Select value={field.type} onChange={(e) => updateField(index, { type: e.target.value })} className="w-full">
                        <option value="text">Text (input)</option>
                        <option value="textarea">Textarea (multi-line)</option>
                      </Select></div>
                    <div><Label className="mb-1 text-xs">Placeholder</Label>
                      <Input value={field.placeholder || ""} onChange={(e) => updateField(index, { placeholder: e.target.value })} /></div>
                  </div>
                  <Toggle checked={field.required} onChange={(checked) => updateField(index, { required: checked })} label="Wajib diisi" disabled={field.key === "name"} />
                </div>
              ))}
            </div>
          </Card>

          {/* Other Settings */}
          <Card variant="elevated" className="space-y-4">
            <h3 className="font-semibold text-brand-text">Pengaturan Lainnya</h3>
            <Toggle checked={config.preventDuplicates} onChange={(checked) => setConfig({ ...config, preventDuplicates: checked })}
              label="Cegah Pendaftar Ganda" description="Tolak pendaftar dengan data yang sudah ada" />
            <div>
              <Label className="mb-2">Prefix ID Peserta Otomatis</Label>
              <Input value={config.guestIdPrefix} onChange={(e) => setConfig({ ...config, guestIdPrefix: e.target.value })} placeholder="PUB" className="font-mono" />
              <p className="text-xs text-brand-textMuted mt-1">Digunakan jika field 'ID Peserta' tidak ditampilkan. Contoh: PUB-42</p>
            </div>
          </Card>

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving} size="lg"><Save size={18} /> Simpan Pengaturan</Button>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
