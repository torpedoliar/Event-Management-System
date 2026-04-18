"use client";
import RequireAuth from '../../../components/RequireAuth';
import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { apiFetch, apiBase, toApiUrl, parseErrorMessage } from '../../../lib/api';
import { useGuestStats, useActiveEvent, useInvalidateQueries } from '../../../lib/hooks/use-guests';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Label from '../../../components/ui/Label';
import { SkeletonStats, SkeletonCard } from '../../../components/ui/Skeleton';
import { Calendar, MapPin, TrendingUp, Radio } from 'lucide-react';
import { useSSE } from '../../../lib/sse-context';

// Lazy load heavy components
const WebcamCapture = lazy(() => import('../../../components/WebcamCapture'));
const GuestStatsChart = lazy(() => import('../../../components/GuestStatsChart'));

export default function DashboardPage() {
  // Use React Query for data fetching with caching
  const { data: stats, error: statsError, isLoading: statsLoading } = useGuestStats();
  const { data: event } = useActiveEvent();
  const { invalidateStats, invalidateAll } = useInvalidateQueries();
  
  const [error, setError] = useState<string | null>(null);
  // Quick add form state
  const [guestId, setGuestId] = useState('');
  const [name, setName] = useState('');
  const [tableLocation, setTableLocation] = useState('');
  const [company, setCompany] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Portal actions state
  const [publicGuestId, setPublicGuestId] = useState('');
  const [adminGuestId, setAdminGuestId] = useState('');
  const [busyPublic, setBusyPublic] = useState(false);
  const [busyAdminCheck, setBusyAdminCheck] = useState(false);
  const [busyAdminUncheck, setBusyAdminUncheck] = useState(false);
  // Uncheckin modal state
  const [showUncheckModal, setShowUncheckModal] = useState(false);
  const [uncheckGuestInfo, setUncheckGuestInfo] = useState<{ id: string; name: string } | null>(null);
  const [uncheckPassword, setUncheckPassword] = useState('');
  const [uncheckReason, setUncheckReason] = useState('');
  const [uncheckError, setUncheckError] = useState<string | null>(null);
  
  // Background logic (synced with system settings)
  const pageBgType = event?.backgroundType ?? 'NONE';
  const pageBgImage = event?.backgroundImageUrl;
  const pageBgVideo = event?.backgroundVideoUrl;
  const overlayStyle = useMemo(() => ({
    backgroundColor: `rgba(0,0,0,${event?.overlayOpacity ?? 0.5})`,
  }), [event?.overlayOpacity]);

  const { addEventListener, removeEventListener, connected } = useSSE();

  // Set error from statsError
  useEffect(() => {
    if (statsError) setError((statsError as Error).message);
  }, [statsError]);

  // Realtime refresh stats when check-in/uncheckin occurs or event changes
  useEffect(() => {
    const onChange = () => { invalidateStats(); };
    const onEventChange = () => { invalidateAll(); };
    addEventListener('checkin', onChange);
    addEventListener('uncheckin', onChange);
    addEventListener('guest-update', onChange);
    addEventListener('event_change', onEventChange);
    addEventListener('config', onEventChange);
    addEventListener('sync_complete', onChange);
    return () => {
      removeEventListener('checkin', onChange);
      removeEventListener('uncheckin', onChange);
      removeEventListener('guest-update', onChange);
      removeEventListener('event_change', onEventChange);
      removeEventListener('config', onEventChange);
      removeEventListener('sync_complete', onChange);
    };
  }, [addEventListener, removeEventListener, invalidateStats, invalidateAll]);

  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const checkinPercent = useMemo(() => 
    stats ? (stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0) : 0,
    [stats]
  );

  return (
    <RequireAuth>
      <div className="min-h-screen overflow-hidden relative bg-transparent">
        {/* Dynamic Background Layer */}
        {pageBgType === 'IMAGE' && pageBgImage && (
          <div className="absolute inset-0 bg-center bg-cover transition-all duration-1000" style={{ backgroundImage: `url(${toApiUrl(pageBgImage)})` }} />
        )}
        {pageBgType === 'VIDEO' && pageBgVideo && (
          <video className="absolute inset-0 w-full h-full object-cover transition-all duration-1000" src={toApiUrl(pageBgVideo)} muted loop autoPlay playsInline />
        )}
        <div className="absolute inset-0 transition-colors duration-1000" style={overlayStyle} />

        <div className="flex flex-col lg:flex-row min-h-screen relative z-10">
          
          {/* Left Canvas (The Majestic Data) */}
          <div className="flex-1 p-8 lg:p-16 flex flex-col justify-between relative z-10 animate-in fade-in slide-in-from-left-8 duration-700">
            {/* Header / Brand */}
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30 shadow-[0_0_20px_rgba(212,168,83,0.2)]">
                  <TrendingUp size={24} className="text-brand-primarySoft" />
                </div>
                <h1 className="text-2xl font-bold text-brand-surface tracking-[0.2em] uppercase font-heading">KOKPIT INTELIJEN</h1>
              </div>
              <div className="flex items-center gap-2">
                <Radio size={14} className={`${connected ? 'text-brand-success animate-pulse' : 'text-brand-danger'}`} />
                <span className="text-sm font-mono text-brand-surface/60 uppercase tracking-widest">{connected ? 'Sinkronisasi Aktif' : 'Terputus'}</span>
              </div>
            </div>

            {/* Notifications */}
            <div className="mt-8 space-y-4 max-w-xl">
              {message && (
                <div className="text-brand-success text-sm bg-brand-success/10 p-4 rounded-xl border border-brand-success/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                  <CheckCircle size={18} className="shrink-0" />
                  {message}
                  <button onClick={() => setMessage(null)} className="ml-auto hover:opacity-80"><X size={16} /></button>
                </div>
              )}
              {error && (
                <div className="text-brand-danger text-sm bg-brand-danger/10 p-4 rounded-xl border border-brand-danger/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                  <XCircle size={18} className="shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Data Grid Area */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 my-auto relative w-full pt-12">
              {/* Primary Metric - Takes up 8 columns */}
              <div className="col-span-1 md:col-span-8 relative group">
                <div className="absolute -inset-10 bg-brand-primary/5 rounded-[3rem] blur-[80px] -z-10 group-hover:bg-brand-primary/10 transition-all duration-700" />
                <div className="bg-black/20 backdrop-blur-md rounded-3xl border border-white/5 p-10 h-full flex flex-col justify-end overflow-hidden relative shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-white/10 transition-colors">
                   <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                      <TrendingUp size={120} />
                   </div>
                   <div className="text-sm font-mono text-brand-primary uppercase tracking-[0.3em] mb-6 relative z-10">Total Kehadiran</div>
                   <div className="flex items-baseline gap-4 flex-wrap relative z-10">
                     <div className="text-[6rem] lg:text-[8rem] xl:text-[10rem] leading-[0.85] font-heading font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-brand-surface to-brand-primarySoft drop-shadow-[0_10px_30px_rgba(212,168,83,0.2)] tracking-tight">
                       {statsLoading ? '-' : stats?.checkedIn || 0}
                     </div>
                     <div className="text-xl lg:text-3xl font-heading text-brand-surface/40 tracking-widest uppercase pb-4">
                       / {statsLoading ? '-' : stats?.total || 0} Register
                     </div>
                   </div>
                </div>
              </div>

              {/* Secondary Metrics - Takes up 4 columns, stacked */}
              <div className="col-span-1 md:col-span-4 flex flex-col gap-8">
                {/* Menunggu */}
                <div className="bg-black/20 backdrop-blur-md rounded-3xl border border-brand-warning/10 p-8 flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-700 delay-300 relative group overflow-hidden hover:border-brand-warning/30 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-warning/10 rounded-full blur-[40px] -mr-10 -mt-10 group-hover:bg-brand-warning/20 transition-all" />
                  <div className="text-xs font-mono text-brand-warning uppercase tracking-widest mb-3 opacity-90"><span className="animate-pulse mr-2 inline-block">●</span>MENUNGGU</div>
                  <div className="text-4xl lg:text-5xl font-bold text-white font-mono relative z-10">{statsLoading ? '-' : stats?.notCheckedIn || 0}</div>
                </div>

                {/* Progress */}
                <div className="bg-black/20 backdrop-blur-md rounded-3xl border border-brand-success/10 p-8 flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-700 delay-500 relative group overflow-hidden hover:border-brand-success/30 transition-colors">
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-brand-success/10 rounded-full blur-[40px] -mr-10 -mb-10 group-hover:bg-brand-success/20 transition-all" />
                  <div className="text-xs font-mono text-brand-success uppercase tracking-widest mb-3 opacity-90"><span className="animate-pulse mr-2 inline-block">●</span>PROGRESS</div>
                  <div className="flex items-end gap-2 relative z-10">
                    <div className="text-4xl lg:text-5xl font-bold text-white font-mono">{checkinPercent}</div>
                    <div className="text-2xl text-white/50 font-mono mb-1">%</div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-white/10 rounded-full mt-6 overflow-hidden relative z-10">
                     <div className="h-full bg-brand-success rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${checkinPercent}%` }}>
                        <div className="absolute inset-0 bg-white/30 animate-pulse" />
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="w-full max-w-xl opacity-70 hover:opacity-100 transition-opacity duration-500 mt-8">
              {stats && (
                <Suspense fallback={<SkeletonCard />}>
                  <GuestStatsChart stats={stats} />
                </Suspense>
              )}
            </div>
          </div>

          {/* Right Sidebar (Magazine Style Form & Portal) */}
          <div className="w-full lg:w-[400px] xl:w-[450px] bg-black/30 backdrop-blur-3xl border-l border-white/10 p-6 lg:p-8 flex flex-col gap-8 overflow-y-auto relative z-20 shadow-[-30px_0_60px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-right-8 duration-700 delay-200 fill-mode-both">
            
            {/* Quick Actions Matrix */}
            <div className="grid grid-cols-2 gap-3 pb-8 border-b border-white/10">
              <a className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-brand-primary/20 hover:border-brand-primary/50 transition-all group" href="/admin/statistics">
                <BarChart3 size={20} className="text-brand-primarySoft group-hover:text-brand-primary" />
                <span className="text-xs font-mono uppercase tracking-widest text-white/70">Statistik</span>
              </a>
              <a className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-brand-primary/20 hover:border-brand-primary/50 transition-all group" href="/admin/guests">
                <Users size={20} className="text-brand-primarySoft group-hover:text-brand-primary" />
                <span className="text-xs font-mono uppercase tracking-widest text-white/70">Tamu</span>
              </a>
              <a className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-brand-primary/20 hover:border-brand-primary/50 transition-all group" href="/luckydraw">
                <Dices size={20} className="text-brand-primarySoft group-hover:text-brand-primary" />
                <span className="text-xs font-mono uppercase tracking-widest text-white/70">Lucky Draw</span>
              </a>
              <a className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-brand-primary/20 hover:border-brand-primary/50 transition-all group" href="/checkin" target="_blank">
                <ExternalLink size={20} className="text-brand-primarySoft group-hover:text-brand-primary" />
                <span className="text-xs font-mono uppercase tracking-widest text-white/70">Kiosk</span>
              </a>
            </div>

            {/* Quick Add Guest Form */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-lg font-bold text-white tracking-widest uppercase font-heading">
                <UserPlus size={20} className="text-brand-primary" />
                Quick Add
              </div>
              <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setMessage(null);
                    setSaving(true);
                    try {
                      const fd = new FormData();
                      fd.append('guestId', guestId);
                      fd.append('name', name);
                      fd.append('tableLocation', tableLocation);
                      if (company) fd.append('company', company);
                      if (photo) fd.append('photo', photo);
                      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                      const res = await fetch(`${apiBase()}/guests`, {
                        method: 'POST',
                        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                        body: fd,
                      });
                      if (!res.ok) {
                        const errorText = await res.text();
                        throw new Error(parseErrorMessage(errorText));
                      }
                      setGuestId('');
                      setName('');
                      setTableLocation('');
                      setCompany('');
                      setPhoto(null);
                      setMessage('Tamu berhasil ditambahkan.');
                      invalidateStats();
                    } catch (e: any) {
                      setError(e.message || 'Gagal menambahkan tamu');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <Label className="mb-2 text-xs font-mono uppercase tracking-widest opacity-60" htmlFor="quick-guest-id">Guest ID</Label>
                    <Input
                      id="quick-guest-id"
                      value={guestId}
                      onChange={(e) => setGuestId(e.target.value)}
                      required
                      className="font-mono bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 text-xs font-mono uppercase tracking-widest opacity-60" htmlFor="quick-name">Nama Lengkap</Label>
                    <Input
                      id="quick-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 text-xs font-mono uppercase tracking-widest opacity-60" htmlFor="quick-table">Meja / Ruangan</Label>
                    <Input
                      id="quick-table"
                      value={tableLocation}
                      onChange={(e) => setTableLocation(e.target.value)}
                      required
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 text-xs font-mono uppercase tracking-widest opacity-60" htmlFor="quick-company">Perusahaan</Label>
                    <Input
                      id="quick-company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="pt-2">
                    <Button type="submit" disabled={saving} size="md" className="w-full flex items-center justify-center gap-2 bg-brand-primary text-brand-secondary hover:bg-brand-primarySoft">
                      {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      {saving ? 'MENYIMPAN...' : 'TAMBAH TAMU'}
                    </Button>
                  </div>
                </form>
            </div>

            {/* Admin Override Actions */}
            <div className="space-y-6 pt-8 border-t border-white/10">
              <div className="flex items-center gap-3 text-lg font-bold text-brand-danger tracking-widest uppercase font-heading">
                <Activity size={20} />
                Overrides
              </div>
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-mono uppercase tracking-widest opacity-60 mb-2">Check-in Manual</div>
                  <div className="flex gap-2">
                      <Input
                        value={adminGuestId}
                        onChange={(e) => setAdminGuestId(e.target.value)}
                        placeholder="Guest ID"
                        className="font-mono bg-white/5 border-white/10"
                      />
                      <Button
                        size="sm"
                        disabled={busyAdminCheck || !adminGuestId}
                        onClick={async () => {
                          setError(null); setMessage(null); setBusyAdminCheck(true);
                          try {
                            const r = await fetch(`${apiBase()}/public/guests/search?guestId=${encodeURIComponent(adminGuestId)}`);
                            if (!r.ok) {
                              const errorText = await r.text();
                              throw new Error(parseErrorMessage(errorText));
                            }
                            const arr = await r.json();
                            const g = arr && arr[0];
                            if (!g) throw new Error('Guest tidak ditemukan');
                            await apiFetch(`/guests/${g.id}/checkin`, { method: 'POST' });
                            setMessage(`Check-in manual berhasil untuk ${g.name}`);
                          } catch (e: any) { setError(e.message || 'Gagal check-in'); } finally { setBusyAdminCheck(false); }
                        }}
                      >
                        {busyAdminCheck ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                      </Button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-mono uppercase tracking-widest text-brand-danger opacity-80 mb-2">Batal Check-in</div>
                  <div className="flex gap-2">
                      <Input
                        value={adminGuestId}
                        onChange={(e) => setAdminGuestId(e.target.value)}
                        placeholder="Guest ID"
                        className="font-mono bg-brand-danger/5 border-brand-danger/20"
                      />
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyAdminUncheck || !adminGuestId}
                        onClick={async () => {
                          setError(null); setMessage(null); setBusyAdminUncheck(true);
                          try {
                            const r = await fetch(`${apiBase()}/public/guests/search?guestId=${encodeURIComponent(adminGuestId)}`);
                            if (!r.ok) {
                              const errorText = await r.text();
                              throw new Error(parseErrorMessage(errorText));
                            }
                            const arr = await r.json(); const g = arr && arr[0];
                            if (!g) throw new Error('Guest tidak ditemukan');
                            setUncheckGuestInfo({ id: g.id, name: g.name });
                            setShowUncheckModal(true);
                          } catch (e: any) { setError(e.message || 'Gagal mencari'); } finally { setBusyAdminUncheck(false); }
                        }}
                      >
                        {busyAdminUncheck ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />}
                      </Button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Uncheckin Modal */}
        {showUncheckModal && uncheckGuestInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => { setShowUncheckModal(false); setUncheckPassword(''); setUncheckReason(''); setUncheckError(null); setUncheckGuestInfo(null); }}>
            <div className="w-full max-w-md rounded-2xl bg-brand-secondary border border-brand-danger/30 p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)]" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-6 text-xl font-bold text-white flex items-center gap-3 font-heading tracking-widest uppercase">
                <XCircle size={24} className="text-brand-danger" />
                BATALKAN CHECK-IN
              </h3>
              <div className="mb-6 p-4 rounded-xl bg-brand-danger/10 border border-brand-danger/20">
                <p className="text-sm text-brand-danger font-mono tracking-wide leading-relaxed">
                  Tindakan ini memerlukan verifikasi admin. Membatalkan check-in akan mencabut hak undian tamu: <strong>{uncheckGuestInfo.name}</strong>.
                </p>
              </div>
              {uncheckError && (
                <div className="mb-4 p-3 rounded-lg bg-brand-danger/10 border border-brand-danger/20 flex items-center gap-2">
                  <XCircle size={16} className="text-brand-danger shrink-0" />
                  <p className="text-sm text-brand-danger">{uncheckError}</p>
                </div>
              )}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">Password Admin</label>
                  <Input
                    type="password"
                    placeholder="***"
                    value={uncheckPassword}
                    onChange={(e) => { setUncheckPassword(e.target.value); setUncheckError(null); }}
                    className="bg-white/5 border-white/10 text-center tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">Alasan (min. 5 kar)</label>
                  <Input
                    placeholder="Alasan pembatalan..."
                    value={uncheckReason}
                    onChange={(e) => setUncheckReason(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <Button
                  variant="ghost"
                  onClick={() => { setShowUncheckModal(false); setUncheckPassword(''); setUncheckReason(''); setUncheckError(null); setUncheckGuestInfo(null); }}
                  className="flex-1"
                >
                  BATAL
                </Button>
                <Button
                  variant="danger"
                  disabled={!uncheckPassword || uncheckReason.length < 5 || busyAdminUncheck}
                  onClick={async () => {
                    setUncheckError(null); setBusyAdminUncheck(true);
                    try {
                      await apiFetch(`/guests/${uncheckGuestInfo.id}/uncheckin`, {
                        method: 'POST',
                        body: JSON.stringify({ password: uncheckPassword, reason: uncheckReason }),
                      });
                      setMessage(`Uncheck-in berhasil untuk ${uncheckGuestInfo.name}`);
                      setShowUncheckModal(false);
                      setUncheckPassword('');
                      setUncheckReason('');
                      setUncheckError(null);
                      setUncheckGuestInfo(null);
                      setAdminGuestId('');
                    } catch (e: any) { 
                      const errorMsg = parseErrorMessage(e.message) || 'Gagal uncheck-in';
                      setUncheckError(errorMsg);
                    } finally { setBusyAdminUncheck(false); }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 font-mono tracking-widest text-sm"
                >
                  {busyAdminUncheck ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />}
                  KONFIRMASI
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'from-brand-primary/20 to-brand-primary/10', text: 'text-brand-primary', border: 'border-brand-primary/20' },
  emerald: { bg: 'from-brand-success/20 to-brand-success/10', text: 'text-brand-success', border: 'border-brand-success/20' },
  amber: { bg: 'from-brand-warning/20 to-brand-warning/10', text: 'text-brand-warning', border: 'border-brand-warning/20' },
  purple: { bg: 'from-brand-accent/20 to-brand-accent/10', text: 'text-brand-accent', border: 'border-brand-accent/20' },
};

function StatsCard({ 
  title, 
  value, 
  icon, 
  color = 'blue', 
  subtitle,
  isPercent,
  percent 
}: { 
  title: string; 
  value: number | string; 
  icon?: React.ReactNode;
  color?: 'blue' | 'emerald' | 'amber' | 'purple';
  subtitle?: string;
  isPercent?: boolean;
  percent?: number;
}) {
  const colors = colorMap[color];
  
  return (
    <div className={`stats-card glass-card p-5 border ${colors.border}`}>
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
      {isPercent && percent !== undefined && (
        <div className="mt-3">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${color === 'purple' ? 'from-brand-accent to-brand-primary' : 'from-brand-primary to-brand-primarySoft'} transition-all duration-500`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

import { Users, UserPlus, ExternalLink, Monitor, Activity, CheckCircle, XCircle, Loader2, Camera, Save, Clock, Gift, BarChart3, Package, Dices, User, X } from 'lucide-react';
