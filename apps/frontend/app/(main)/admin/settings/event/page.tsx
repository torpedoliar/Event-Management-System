"use client";
import RequireAuth from '@/components/RequireAuth';
import { useEffect, useRef, useState } from 'react';
import { apiBase, toApiUrl, parseErrorMessage } from '@/lib/api';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Button from '@/components/ui/Button';

interface CustomCategory {
  value: string;
  label: string;
  color: string;
}

const DEFAULT_CATEGORIES: CustomCategory[] = [
  { value: 'REGULAR', label: 'Regular', color: 'text-gray-300' },
  { value: 'VIP', label: 'VIP', color: 'text-brand-warning' },
  { value: 'VVIP', label: 'VVIP', color: 'text-brand-primary' },
  { value: 'MEDIA', label: 'Media', color: 'text-brand-primarySoft' },
  { value: 'SPONSOR', label: 'Sponsor', color: 'text-brand-success' },
  { value: 'SPEAKER', label: 'Speaker', color: 'text-rose-300' },
  { value: 'ORGANIZER', label: 'Organizer', color: 'text-cyan-300' },
];

const COLOR_OPTIONS = [
  { value: 'text-gray-300', label: 'Gray', bg: 'bg-gray-500' },
  { value: 'text-brand-warning', label: 'Amber', bg: 'bg-brand-warning' },
  { value: 'text-brand-primary', label: 'Gold', bg: 'bg-brand-primary' },
  { value: 'text-brand-primarySoft', label: 'Blue', bg: 'bg-brand-primary' },
  { value: 'text-brand-success', label: 'Green', bg: 'bg-brand-success' },
  { value: 'text-rose-300', label: 'Rose', bg: 'bg-rose-500' },
  { value: 'text-cyan-300', label: 'Cyan', bg: 'bg-cyan-500' },
  { value: 'text-orange-300', label: 'Orange', bg: 'bg-orange-500' },
  { value: 'text-brand-primarySoft', label: 'Accent', bg: 'bg-brand-primarySoft' },
  { value: 'text-indigo-300', label: 'Indigo', bg: 'bg-indigo-500' },
];

interface EventConfig {
  id: string;
  name: string;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  logoUrl?: string | null;
  backgroundType: 'NONE' | 'IMAGE' | 'VIDEO';
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  overlayOpacity: number;
  checkinPopupTimeoutMs?: number;
  enablePhotoCapture: boolean;
  enableLuckyDraw: boolean;
  enableSouvenir: boolean;
  enableTournament: boolean;
  enablePublicRegistration: boolean;
  allowDuplicateGuestId: boolean;
  allowMultipleCheckinPerCounter?: boolean;
  customCategories?: CustomCategory[];
  rollSoundUrl?: string | null;
  tensionSoundUrl?: string | null;
  winSoundUrl?: string | null;
  grandWinSoundUrl?: string | null;
}

export default function EventSettingsPage() {
  const [cfg, setCfg] = useState<EventConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingSound, setUploadingSound] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [broadcastPreview, setBroadcastPreview] = useState(false);
  const previewTimer = useRef<any>(null);
  
  // Category management
  const [newCatValue, setNewCatValue] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatColor, setNewCatColor] = useState('text-gray-300');
  
  const getCategories = (): CustomCategory[] => {
    return cfg?.customCategories && cfg.customCategories.length > 0 
      ? cfg.customCategories 
      : DEFAULT_CATEGORIES;
  };
  
  const addCategory = () => {
    if (!newCatValue.trim() || !newCatLabel.trim()) return;
    const categories = getCategories();
    const exists = categories.some(c => c.value.toUpperCase() === newCatValue.toUpperCase().trim());
    if (exists) {
      setError('Kategori dengan value tersebut sudah ada');
      return;
    }
    const newCat: CustomCategory = {
      value: newCatValue.toUpperCase().trim().replace(/\s+/g, '_'),
      label: newCatLabel.trim(),
      color: newCatColor,
    };
    setCfg({ ...cfg!, customCategories: [...categories, newCat] });
    setNewCatValue('');
    setNewCatLabel('');
    setNewCatColor('text-gray-300');
  };
  
  const removeCategory = (value: string) => {
    const categories = getCategories();
    if (categories.length <= 1) {
      setError('Minimal harus ada 1 kategori');
      return;
    }
    setCfg({ ...cfg!, customCategories: categories.filter(c => c.value !== value) });
  };

  const tokenHeader = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  };

  useEffect(() => {
    fetch(`${apiBase()}/events/active`, { headers: tokenHeader() })
      .then(async (r) => {
        if (r.status === 404) {
          setCfg({
            id: '',
            name: '',
            backgroundType: 'NONE',
            overlayOpacity: 0.5,
            enablePhotoCapture: false,
            enableLuckyDraw: false,
            enableSouvenir: false,
            enableTournament: false,
            enablePublicRegistration: false,
            allowDuplicateGuestId: false,
            allowMultipleCheckinPerCounter: false,
            checkinPopupTimeoutMs: 5000
          });
          return;
        }
        if (!r.ok) {
          const errorText = await r.text();
          throw new Error(parseErrorMessage(errorText));
        }
        setCfg(await r.json());
      })
      .catch((e) => setError(e.message));
  }, []);

  // Clear live preview override on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('theme:preview', { detail: null }));
      }
      // also clear broadcast preview on server
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        fetch(`${apiBase()}/events/preview/clear`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => { });
      }
    };
  }, []);

  const schedulePreview = (payload: Partial<EventConfig>) => {
    // Merge payload with current cfg to get complete preview data
    const mergedPayload = cfg ? {
      overlayOpacity: payload.overlayOpacity ?? cfg.overlayOpacity,
      backgroundType: payload.backgroundType ?? cfg.backgroundType,
      backgroundImageUrl: payload.backgroundImageUrl !== undefined ? payload.backgroundImageUrl : cfg.backgroundImageUrl,
      backgroundVideoUrl: payload.backgroundVideoUrl !== undefined ? payload.backgroundVideoUrl : cfg.backgroundVideoUrl,
    } : payload;

    // local UI preview
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('theme:preview', { detail: mergedPayload }));
    }
    // broadcast via SSE to all clients when enabled
    if (!broadcastPreview) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      fetch(`${apiBase()}/events/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(mergedPayload),
      }).catch(() => { });
    }, 150);
  };

  const save = async () => {
    if (!cfg) return;
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch(`${apiBase()}/events/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(tokenHeader() || {}) },
        body: JSON.stringify({
          name: cfg.name,
          date: cfg.date || null,
          time: cfg.time || null,
          location: cfg.location || null,
          backgroundType: cfg.backgroundType,
          backgroundImageUrl: cfg.backgroundType === 'IMAGE' ? (cfg.backgroundImageUrl || null) : null,
          backgroundVideoUrl: cfg.backgroundType === 'VIDEO' ? (cfg.backgroundVideoUrl || null) : null,
          overlayOpacity: cfg.overlayOpacity,
          checkinPopupTimeoutMs: cfg.checkinPopupTimeoutMs ?? 5000,
          enablePhotoCapture: cfg.enablePhotoCapture ?? false,
          enableLuckyDraw: cfg.enableLuckyDraw ?? false,
          enableSouvenir: cfg.enableSouvenir ?? false,
          enableTournament: cfg.enableTournament ?? false,
          enablePublicRegistration: cfg.enablePublicRegistration ?? false,
          allowDuplicateGuestId: cfg.allowDuplicateGuestId ?? false,
          allowMultipleCheckinPerCounter: cfg.allowMultipleCheckinPerCounter ?? false,
          customCategories: cfg.customCategories || null,
        })
      });
      if (!res.ok) {
        const errorText = await res.text();
        setError(parseErrorMessage(errorText));
      } else {
        setMessage('Tersimpan.');
        // Clear preview override after successful save
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('theme:preview', { detail: null }));
        }
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
          fetch(`${apiBase()}/events/preview/clear`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => { });
        }
      }
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const upload = async (kind: 'logo' | 'background', file: File) => {
    const fd = new FormData();
    fd.append(kind, file);
    try {
      if (kind === 'logo') setUploadingLogo(true); else setUploadingBg(true);
      const res = await fetch(`${apiBase()}/events/upload/${kind}`, {
        method: 'POST',
        headers: tokenHeader(),
        body: fd,
      });
      if (!res.ok) {
        const errorText = await res.text();
        return setError(parseErrorMessage(errorText));
      }
      const updated = await res.json();
      setCfg(updated);
      setMessage(`${kind === 'logo' ? 'Logo' : 'Background'} terunggah.`);
    } catch (e: any) {
      setError(parseErrorMessage(e.message) || 'Gagal upload');
    } finally {
      if (kind === 'logo') setUploadingLogo(false); else setUploadingBg(false);
    }
  };

  const uploadSound = async (type: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      setUploadingSound(type);
      const res = await fetch(`${apiBase()}/events/upload/sound/${type}`, {
        method: 'POST',
        headers: tokenHeader(),
        body: fd,
      });
      if (!res.ok) {
        const errorText = await res.text();
        return setError(parseErrorMessage(errorText));
      }
      const updated = await res.json();
      setCfg(updated);
      setMessage(`Suara ${type} terunggah.`);
    } catch (e: any) {
      setError(parseErrorMessage(e.message) || 'Gagal upload suara');
    } finally {
      setUploadingSound(null);
    }
  };

  const resetSound = async (type: string) => {
    if (!cfg) return;
    setError(null);
    setMessage(null);
    try {
      const updateData: any = {};
      switch(type) {
        case 'roll': updateData.rollSoundUrl = null; break;
        case 'tension': updateData.tensionSoundUrl = null; break;
        case 'win': updateData.winSoundUrl = null; break;
        case 'grandwin': updateData.grandWinSoundUrl = null; break;
      }

      const res = await fetch(`${apiBase()}/events/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(tokenHeader() || {}) },
        body: JSON.stringify(updateData)
      });
      if (!res.ok) {
        const errorText = await res.text();
        setError(parseErrorMessage(errorText));
      } else {
        const updated = await res.json();
        setCfg(updated);
        setMessage(`Suara ${type} direset ke default.`);
      }
    } catch (e: any) {
      setError(e.message || 'Gagal reset suara');
    }
  };

  const purge = async (resetBranding: boolean) => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(resetBranding ? 'Hapus semua tamu dan reset branding?' : 'Hapus semua tamu pada event aktif?');
      if (!ok) return;
    }
    setError(null);
    setMessage(null);
    setPurging(true);
    try {
      const res = await fetch(`${apiBase()}/events/purge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tokenHeader() || {}) },
        body: JSON.stringify({ resetBranding })
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      setMessage(resetBranding ? 'Tamu terhapus dan branding direset.' : 'Tamu terhapus.');
      const r = await fetch(`${apiBase()}/events/active`, { headers: tokenHeader() });
      if (r.ok) setCfg(await r.json());
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus data.');
    } finally {
      setPurging(false);
    }
  };


  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  if (!cfg) return <RequireAuth><div className="p-6 text-sm text-brand-textMuted">Loading...</div></RequireAuth>;

  return (
    <RequireAuth>
      <div className="min-h-screen p-6 md:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white text-shadow-lg">Event Settings</h1>

          {/* Quick Management Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/admin/prizes"
              className="flex items-center justify-between p-4 rounded-xl bg-brand-warning/10 border border-brand-warning/20 hover:bg-brand-warning/20 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-warning/20">
                  <Trophy size={20} className="text-brand-warning" />
                </div>
                <div>
                  <div className="font-medium text-white">Prize Inventory</div>
                  <div className="text-xs text-white/60">Kelola hadiah door prize</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/40 group-hover:text-white/70 transition-colors" />
            </Link>

            <Link
              href="/admin/souvenirs"
              className="flex items-center justify-between p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/20 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-primary/20">
                  <Package size={20} className="text-brand-primary" />
                </div>
                <div>
                  <div className="font-medium text-white">Souvenir Inventory</div>
                  <div className="text-xs text-white/60">Kelola stock souvenir</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/40 group-hover:text-white/70 transition-colors" />
            </Link>

            <Link
              href="/admin/settings/users"
              className="flex items-center justify-between p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/20 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-primary/20">
                  <UserCog size={20} className="text-brand-primary" />
                </div>
                <div>
                  <div className="font-medium text-white">User Management</div>
                  <div className="text-xs text-white/60">Kelola admin users</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/40 group-hover:text-white/70 transition-colors" />
            </Link>

            <Link
              href="/admin/settings/email"
              className="flex items-center justify-between p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Mail size={20} className="text-brand-info" />
                </div>
                <div>
                  <div className="font-medium text-white">Email Settings</div>
                  <div className="text-xs text-white/60">Konfigurasi SMTP email</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/40 group-hover:text-white/70 transition-colors" />
            </Link>

            <Link
              href="/admin/settings/public-registration"
              className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <UserPlus size={20} className="text-emerald-400" />
                </div>
                <div>
                  <div className="font-medium text-white">Registrasi Publik</div>
                  <div className="text-xs text-white/60">Halaman pendaftaran publik & kuota</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/40 group-hover:text-white/70 transition-colors" />
            </Link>
          </div>

          {error && <div className="text-sm text-brand-danger bg-brand-danger/10 p-3 rounded-lg border border-brand-danger/20">{error}</div>}
          {message && <div className="text-sm text-brand-primary bg-brand-primary/10 p-3 rounded-lg border border-brand-primary/20">{message}</div>}

          <Card variant="glass" className="space-y-8 p-6 md:p-8 surface-elevated">
            <div className="grid gap-6">
              <div>
                <Label className="mb-2 flex items-center gap-2" htmlFor="event-name">
                  <Type size={16} className="text-white/50" />
                  Event Name
                </Label>
                <Input
                  id="event-name"
                  value={cfg.name}
                  onChange={(e) => setCfg({ ...cfg, name: e.target.value })}
                  className="text-lg"
                />
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <Label className="mb-2 flex items-center gap-2" htmlFor="event-date">
                    <Calendar size={16} className="text-white/50" />
                    Tanggal
                  </Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={cfg.date?.slice(0, 10) || ''}
                    onChange={(e) => setCfg({ ...cfg, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="mb-2 flex items-center gap-2" htmlFor="event-time">
                    <Clock size={16} className="text-white/50" />
                    Jam
                  </Label>
                  <Input
                    id="event-time"
                    type="time"
                    value={cfg.time || ''}
                    onChange={(e) => setCfg({ ...cfg, time: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="mb-2 flex items-center gap-2" htmlFor="event-location">
                    <MapPin size={16} className="text-white/50" />
                    Location
                  </Label>
                  <Input
                    id="event-location"
                    value={cfg.location || ''}
                    onChange={(e) => setCfg({ ...cfg, location: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl bg-brand-bgSubtle p-6 border border-brand-border">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings2 size={20} />
                Display Configuration
              </h3>

              <div>
                <label className="mb-2 block text-sm text-brand-textMuted flex justify-between">
                  <span>Overlay Opacity</span>
                  <span className="font-mono">{Math.round(cfg.overlayOpacity * 100)}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full accent-brand-primary h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  value={cfg.overlayOpacity}
                  onChange={(e) => { const v = Number(e.target.value); setCfg({ ...cfg, overlayOpacity: v }); schedulePreview({ overlayOpacity: v }); }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-brand-textMuted flex justify-between">
                  <span>Check-in Popup Timeout</span>
                  <span className="font-mono">{Math.round(((cfg.checkinPopupTimeoutMs ?? 5000) / 1000))}s</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={60}
                  step={1}
                  className="w-full accent-brand-primary h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  value={Math.round(((cfg.checkinPopupTimeoutMs ?? 5000) / 1000))}
                  onChange={(e) => {
                    const seconds = Number(e.target.value) || 5;
                    setCfg({ ...cfg, checkinPopupTimeoutMs: seconds * 1000 });
                  }}
                />
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <label className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Camera size={20} className="text-brand-success" />
                    <div>
                      <div className="font-medium text-white">Photo Capture saat Check-in</div>
                      <div className="text-sm text-white/60">Aktifkan opsi mengambil foto tamu via webcam setelah check-in</div>
                    </div>
                  </div>
                  <div className={`w-12 h-7 rounded-full transition-colors relative ${cfg.enablePhotoCapture ? 'bg-brand-success' : 'bg-white/20'}`}>
                    <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${cfg.enablePhotoCapture ? 'translate-x-5' : 'translate-x-0'}`} />
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={cfg.enablePhotoCapture}
                      onChange={(e) => setCfg({ ...cfg, enablePhotoCapture: e.target.checked })}
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users size={20} className="text-brand-warning" />
                    <div>
                      <div className="font-medium text-white">Izinkan Duplikat Guest ID</div>
                      <div className="text-sm text-white/60">Tamu dengan ID sama bisa didaftarkan lebih dari satu (misal: beda perusahaan)</div>
                    </div>
                  </div>
                  <div className={`w-12 h-7 rounded-full transition-colors relative ${cfg.allowDuplicateGuestId ? 'bg-brand-warning' : 'bg-white/20'}`}>
                    <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${cfg.allowDuplicateGuestId ? 'translate-x-5' : 'translate-x-0'}`} />
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={cfg.allowDuplicateGuestId}
                      onChange={(e) => setCfg({ ...cfg, allowDuplicateGuestId: e.target.checked })}
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <UserCheck size={20} className="text-brand-primary" />
                    <div>
                      <div className="font-medium text-white">Multiple Check-in Per Counter</div>
                      <div className="text-sm text-white/60">Tamu dapat check-in di berbagai admin/counter (maksimal 1x per counter)</div>
                    </div>
                  </div>
                  <div className={`w-12 h-7 rounded-full transition-colors relative ${cfg.allowMultipleCheckinPerCounter ? 'bg-brand-primary' : 'bg-white/20'}`}>
                    <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${cfg.allowMultipleCheckinPerCounter ? 'translate-x-5' : 'translate-x-0'}`} />
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={cfg.allowMultipleCheckinPerCounter ?? false}
                      onChange={(e) => setCfg({ ...cfg, allowMultipleCheckinPerCounter: e.target.checked })}
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Trophy size={20} className="text-brand-warning" />
                    <div>
                      <div className="font-medium text-white">Enable Tournament</div>
                      <div className="text-sm text-white/60">Aktifkan fitur manajemen turnamen pada event ini</div>
                    </div>
                  </div>
                  <div className={`w-12 h-7 rounded-full transition-colors relative ${cfg.enableTournament ? 'bg-brand-warning' : 'bg-white/20'}`}>
                    <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${cfg.enableTournament ? 'translate-x-5' : 'translate-x-0'}`} />
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={cfg.enableTournament ?? false}
                      onChange={(e) => setCfg({ ...cfg, enableTournament: e.target.checked })}
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <UserPlus size={20} className="text-emerald-400" />
                    <div>
                      <div className="font-medium text-white">Enable Public Registration</div>
                      <div className="text-sm text-white/60">Aktifkan halaman registrasi publik /register</div>
                    </div>
                  </div>
                  <div className={`w-12 h-7 rounded-full transition-colors relative ${cfg.enablePublicRegistration ? 'bg-emerald-500' : 'bg-white/20'}`}>
                    <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${cfg.enablePublicRegistration ? 'translate-x-5' : 'translate-x-0'}`} />
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={cfg.enablePublicRegistration ?? false}
                      onChange={(e) => setCfg({ ...cfg, enablePublicRegistration: e.target.checked })}
                    />
                  </div>
                </label>
              </div>
            </div>

            {/* Category Management */}
            <div className="space-y-4 rounded-xl bg-brand-bgSubtle p-6 border border-brand-border">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Tag size={20} />
                Kategori Tamu
              </h3>
              
              <div className="text-sm text-white/60 mb-4">
                Kelola kategori tamu seperti VIP, VVIP, Media, dll.
              </div>

              {/* Current Categories */}
              <div className="flex flex-wrap gap-2 mb-4">
                {getCategories().map((cat) => {
                  const colorOpt = COLOR_OPTIONS.find(c => c.value === cat.color);
                  return (
                    <div 
                      key={cat.value}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/5`}
                    >
                      <span className={`w-3 h-3 rounded-full ${colorOpt?.bg || 'bg-gray-500'}`} />
                      <span className="text-sm text-white">{cat.label}</span>
                      <span className="text-xs text-white/40 font-mono">({cat.value})</span>
                      <button
                        type="button"
                        onClick={() => removeCategory(cat.value)}
                        className="ml-1 p-0.5 rounded-full hover:bg-brand-danger/20 text-white/40 hover:text-brand-danger transition-colors"
                        title="Hapus kategori"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add New Category */}
              <div className="pt-4 border-t border-white/10">
                <div className="text-sm text-white/70 mb-3">Tambah Kategori Baru</div>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-white/50 mb-1">Value (ID)</label>
                    <Input
                      value={newCatValue}
                      onChange={(e) => setNewCatValue(e.target.value.toUpperCase())}
                      placeholder="VVIP"
                      className="text-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-white/50 mb-1">Label</label>
                    <Input
                      value={newCatLabel}
                      onChange={(e) => setNewCatLabel(e.target.value)}
                      placeholder="VVIP Guest"
                      className="text-sm"
                    />
                  </div>
                  <div className="min-w-[100px]">
                    <label className="block text-xs text-white/50 mb-1">Warna</label>
                    <select
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
                    >
                      {COLOR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-brand-bgElevated">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={addCategory}
                    disabled={!newCatValue.trim() || !newCatLabel.trim()}
                    className="flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Tambah
                  </Button>
                </div>
              </div>

              {/* Reset to Default */}
              <div className="pt-4 border-t border-white/10">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setCfg({ ...cfg!, customCategories: [...DEFAULT_CATEGORIES] })}
                  className="text-white/60 hover:text-white"
                >
                  Reset ke Default
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <div className="text-sm font-medium text-brand-text flex items-center gap-2">
                  <ImageIcon size={16} />
                  Logo
                </div>
                <div className="p-4 rounded-xl bg-brand-bgSubtle border-2 border-dashed border-brand-primary/40 hover:border-brand-primary/60 transition-colors flex flex-col items-center justify-center min-h-[160px] gap-4">
                  {cfg.logoUrl ? (
                    <img src={toApiUrl(cfg.logoUrl)} className="h-20 object-contain" alt="logo" />
                  ) : (
                    <div className="text-white/30 text-sm">No Logo</div>
                  )}
                  <div>
                    <input
                      ref={logoInputRef}
                      disabled={uploadingLogo}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) upload('logo', f); }}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={uploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      {uploadingLogo ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                      <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-brand-text flex items-center gap-2">
                  <Monitor size={16} />
                  Background
                </div>
                <div className="p-4 rounded-xl bg-brand-bgSubtle border border-brand-border space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {(['NONE', 'IMAGE', 'VIDEO'] as const).map((t) => (
                      <label key={t} className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border ${cfg.backgroundType === t ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white/5 text-white/60 border-transparent hover:bg-white/10'}`}>
                        <input
                          type="radio"
                          name="bgtype"
                          className="hidden"
                          checked={cfg.backgroundType === t}
                          onChange={() => { setCfg({ ...cfg, backgroundType: t }); schedulePreview({ backgroundType: t }); }}
                        />
                        <span className="text-xs font-medium">{t}</span>
                      </label>
                    ))}
                  </div>

                  <div className="relative min-h-[160px] rounded-lg overflow-hidden bg-black/20 flex items-center justify-center border border-white/10">
                    {cfg.backgroundType === 'IMAGE' && cfg.backgroundImageUrl && (
                      <img src={toApiUrl(cfg.backgroundImageUrl)} className="w-full h-full object-cover absolute inset-0" />
                    )}
                    {cfg.backgroundType === 'VIDEO' && cfg.backgroundVideoUrl && (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video src={toApiUrl(cfg.backgroundVideoUrl)} className="w-full h-full object-cover absolute inset-0" controls loop muted />
                    )}
                    {(!cfg.backgroundType || cfg.backgroundType === 'NONE' || (cfg.backgroundType === 'IMAGE' && !cfg.backgroundImageUrl) || (cfg.backgroundType === 'VIDEO' && !cfg.backgroundVideoUrl)) && (
                      <div className="text-white/30 text-sm">No Background</div>
                    )}
                  </div>

                  <div>
                    <input
                      ref={bgInputRef}
                      disabled={uploadingBg}
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) upload('background', f); }}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={uploadingBg}
                      onClick={() => bgInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      {uploadingBg ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                      <span>{uploadingBg ? 'Uploading...' : 'Change Background'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Lucky Draw Sounds Management */}
            <div className="space-y-4 rounded-xl bg-brand-bgSubtle p-6 border border-brand-border">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Music size={20} />
                Lucky Draw Sounds
              </h3>
              
              <div className="text-sm text-white/60 mb-4">
                Kustomisasi suara saat proses pengundian. Gunakan file .mp3 atau .wav (Maks 10MB).
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'roll', label: 'Rolling Sound', url: cfg.rollSoundUrl, default: '/sounds/roll.mp3' },
                  { id: 'tension', label: 'Tension Sound', url: cfg.tensionSoundUrl, default: '/sounds/tension.mp3' },
                  { id: 'win', label: 'Win Sound', url: cfg.winSoundUrl, default: '/sounds/win.mp3' },
                  { id: 'grandwin', label: 'Grand Win Sound', url: cfg.grandWinSoundUrl, default: '/sounds/grand-win.mp3' },
                ].map((sound) => (
                  <div key={sound.id} className="p-4 rounded-lg bg-black/20 border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-white/80">{sound.label}</Label>
                      {sound.url ? (
                        <span className="text-[10px] bg-brand-primary/20 text-brand-primarySoft px-2 py-0.5 rounded-full font-mono">Custom</span>
                      ) : (
                        <span className="text-[10px] bg-white/10 text-white/40 px-2 py-0.5 rounded-full font-mono">Default</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const audio = new Audio(toApiUrl(sound.url || sound.default));
                          audio.play().catch(e => console.warn('Preview failed', e));
                        }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        title="Preview"
                      >
                        <Volume2 size={16} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-white/30 truncate font-mono">
                          {sound.url ? sound.url.split('/').pop() : sound.default.split('/').pop()}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        id={`sound-${sound.id}`}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadSound(sound.id, f);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={uploadingSound !== null}
                        onClick={() => document.getElementById(`sound-${sound.id}`)?.click()}
                        className="flex-1 text-xs h-8"
                      >
                        {uploadingSound === sound.id ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                        <span>{uploadingSound === sound.id ? '...' : 'Upload'}</span>
                      </Button>
                      {sound.url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => resetSound(sound.id)}
                          className="text-white/40 hover:text-brand-danger h-8 px-2"
                          title="Reset to Default"
                        >
                          <RotateCcw size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${broadcastPreview ? 'bg-brand-primary' : 'bg-white/20'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${broadcastPreview ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={broadcastPreview}
                    onChange={(e) => {
                      const on = e.target.checked; setBroadcastPreview(on);
                      if (on && cfg) {
                        schedulePreview({
                          overlayOpacity: cfg.overlayOpacity,
                          backgroundType: cfg.backgroundType,
                          backgroundImageUrl: cfg.backgroundImageUrl,
                          backgroundVideoUrl: cfg.backgroundVideoUrl,
                        });
                      } else {
                        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                        if (token) fetch(`${apiBase()}/events/preview/clear`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => { });
                        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('theme:preview', { detail: null }));
                      }
                    }}
                  />
                  <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">Live Preview (Broadcast)</span>
                </label>

                {broadcastPreview && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => { const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null; if (token) fetch(`${apiBase()}/events/preview/clear`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => { }); if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('theme:preview', { detail: null })); }}
                    className="flex items-center gap-2"
                  >
                    <EyeOff size={16} />
                    Stop Preview
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => purge(false)}
                    disabled={purging}
                    size="sm"
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    {purging ? 'Processing...' : 'Purge Guests'}
                  </Button>
                  <Button
                    onClick={() => purge(true)}
                    disabled={purging}
                    size="sm"
                    variant="danger"
                    className="flex items-center gap-2"
                  >
                    <AlertTriangle size={16} />
                    {purging ? 'Processing...' : 'Reset All'}
                  </Button>
                </div>

                <Button
                  onClick={save}
                  disabled={saving}
                  size="md"
                  className="flex items-center gap-2 min-w-[140px] justify-center"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </RequireAuth>
  );
}

import { Type, Calendar, Clock, MapPin, Settings2, Image as ImageIcon, Monitor, Upload, Loader2, EyeOff, Save, Trash2, AlertTriangle, Gift, Dices, Package, UserCog, Trophy, ChevronRight, Camera, Users, UserCheck, Tag, X, Plus, Mail, Music, RotateCcw, Volume2, UserPlus } from 'lucide-react';
import Link from 'next/link';
