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
      <div className="min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-lg">
                <TrendingUp size={24} className="text-brand-secondary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-brand-surface">Dashboard</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Radio size={12} className={`${connected ? 'text-brand-success pulse-live' : 'text-brand-danger'}`} />
                  <span className="text-sm text-brand-surface/60">{connected ? 'Realtime Connected' : 'Reconnecting...'}</span>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <a
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-accent to-brand-primary px-4 py-2 text-sm font-semibold text-brand-secondary shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                href="/admin/statistics"
              >
                <BarChart3 size={16} />
                Statistik
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-xl bg-brand-surface/10 backdrop-blur-sm border border-brand-surface/20 px-4 py-2 text-sm font-medium text-brand-surface hover:bg-brand-surface/20 transition-all duration-200"
                href="/admin/guests"
              >
                <Users size={16} />
                Tamu
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-xl bg-brand-surface/10 backdrop-blur-sm border border-brand-surface/20 px-4 py-2 text-sm font-medium text-brand-surface hover:bg-brand-surface/20 transition-all duration-200"
                href="/luckydraw"
              >
                <Dices size={16} />
                Lucky Draw
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-xl bg-brand-surface/10 backdrop-blur-sm border border-brand-surface/20 px-4 py-2 text-sm font-medium text-brand-surface hover:bg-brand-surface/20 transition-all duration-200"
                href="/souvenir"
              >
                <Package size={16} />
                Souvenir
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent px-4 py-2 text-sm font-semibold text-brand-secondary shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                href="/checkin"
                target="_blank"
              >
                <ExternalLink size={16} />
                Kiosk
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-xl bg-brand-success/20 border border-brand-success/30 px-4 py-2 text-sm font-semibold text-brand-success shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                href="/show"
                target="_blank"
              >
                <Monitor size={16} />
                Display
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-xl bg-brand-warning/20 border border-brand-warning/30 px-4 py-2 text-sm font-semibold text-brand-warning shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                href="/show/my"
                target="_blank"
              >
                <User size={16} />
                My Display
              </a>
            </div>
          </div>

          {message && (
            <div className="text-brand-success text-sm bg-brand-success/10 p-4 rounded-xl border border-brand-success/20 flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-brand-success/20 flex items-center justify-center shrink-0">
                <CheckCircle size={18} className="text-brand-success" />
              </div>
              {message}
              <button onClick={() => setMessage(null)} className="ml-auto text-brand-success hover:opacity-80">
                <X size={16} />
              </button>
            </div>
          )}

          {error && (
            <div className="text-brand-danger text-sm bg-brand-danger/10 p-4 rounded-xl border border-brand-danger/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-danger/20 flex items-center justify-center shrink-0">
                <XCircle size={18} className="text-brand-danger" />
              </div>
              {error}
            </div>
          )}

          {/* Stats Cards */}
          {statsLoading ? (
            <SkeletonStats />
          ) : stats ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard 
                title="Total Tamu" 
                value={stats.total} 
                icon={<Users size={24} />} 
                color="blue"
                subtitle="Terdaftar"
              />
              <StatsCard 
                title="Sudah Check-in" 
                value={stats.checkedIn} 
                icon={<CheckCircle size={24} />} 
                color="emerald"
                subtitle={`${checkinPercent}% dari total`}
              />
              <StatsCard 
                title="Belum Check-in" 
                value={stats.notCheckedIn} 
                icon={<Clock size={24} />} 
                color="amber"
                subtitle="Menunggu"
              />
              <StatsCard 
                title="Progress" 
                value={`${checkinPercent}%`} 
                icon={<TrendingUp size={24} />} 
                color="purple"
                subtitle="Kehadiran"
                isPercent
                percent={checkinPercent}
              />
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Stats & Event Details */}
            <div className="space-y-6">
              {stats && (
                <Suspense fallback={<SkeletonCard />}>
                  <GuestStatsChart stats={stats} />
                </Suspense>
              )}

              {event && (
                <Card variant="glass" className="w-full p-6">
                  <div className="flex flex-col items-center text-center gap-4">
                    {event.logoUrl ? (
                      <img src={event.logoUrl} alt="Event Logo" className="h-24 w-24 object-contain bg-white/5 rounded-xl p-2" />
                    ) : (
                      <div className="h-24 w-24 flex items-center justify-center bg-white/5 rounded-xl text-white/20">
                        <Gift size={40} />
                      </div>
                    )}
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-white">{event.name}</h2>
                      <div className="flex flex-col items-center gap-1 text-sm text-white/70">
                        {event.date && (
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-brand-primary" />
                            <span>{new Date(event.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-brand-accent" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Column 2: Quick Add Guest */}
            <div className="space-y-6">
              <Card variant="glass" className="w-full h-full">
                <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-white border-b border-white/10 pb-2">
                  <UserPlus size={20} />
                  Quick Add Guest
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
                    <Label className="mb-1" htmlFor="quick-guest-id">Guest ID</Label>
                    <Input
                      id="quick-guest-id"
                      value={guestId}
                      onChange={(e) => setGuestId(e.target.value)}
                      required
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label className="mb-1" htmlFor="quick-name">Nama</Label>
                    <Input
                      id="quick-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1" htmlFor="quick-table">Meja/Ruangan</Label>
                    <Input
                      id="quick-table"
                      value={tableLocation}
                      onChange={(e) => setTableLocation(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1" htmlFor="quick-company">Perusahaan (opsional)</Label>
                    <Input
                      id="quick-company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Foto (opsional)</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                        className="flex-1 min-w-0 text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-surface file:text-brand-text hover:file:bg-brand-surfaceMuted cursor-pointer"
                      />
                      <Button
                        type="button"
                        onClick={() => setWebcamOpen(true)}
                        variant="secondary"
                        size="sm"
                        className="shrink-0 flex items-center gap-2"
                      >
                        <Camera size={16} />
                        Webcam
                      </Button>
                    </div>
                    {preview && (
                      <div className="mt-3">
                        <img src={preview} alt="preview" className="h-20 w-20 object-cover rounded-lg border border-white/20" />
                      </div>
                    )}
                  </div>
                  <div className="pt-2">
                    <Button type="submit" disabled={saving} size="md" className="w-full flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      {saving ? 'Menyimpan...' : 'Tambah Tamu'}
                    </Button>
                  </div>
                </form>
                {webcamOpen && (
                  <Suspense fallback={null}>
                    <WebcamCapture open={webcamOpen} onClose={() => setWebcamOpen(false)} onCapture={(file) => { setPhoto(file); }} aspect="square" />
                  </Suspense>
                )}
              </Card>
            </div>

            {/* Column 3: Portal Actions */}
            <div className="space-y-6">
              <Card variant="glass" className="w-full">
                <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-white border-b border-white/10 pb-2">
                  <Activity size={20} />
                  Portal Actions
                </div>
                {message && <div className="mb-4 text-sm text-brand-accent bg-brand-primary/10 p-3 rounded-lg border border-brand-primary/20">{message}</div>}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-white/90">Public Check-in (by Guest ID)</div>
                    <div className="flex gap-2">
                      <Input
                        value={publicGuestId}
                        onChange={(e) => setPublicGuestId(e.target.value)}
                        placeholder="Guest ID"
                        className="font-mono"
                      />
                      <Button
                        size="sm"
                        disabled={busyPublic || !publicGuestId}
                        onClick={async () => {
                          setError(null); setMessage(null); setBusyPublic(true);
                          try {
                            const res = await fetch(`${apiBase()}/public/guests/checkin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guestId: publicGuestId }) });
                            if (!res.ok) {
                              const errorText = await res.text();
                              throw new Error(parseErrorMessage(errorText));
                            }
                            setMessage('Check-in publik berhasil.');
                            setPublicGuestId('');
                          } catch (e: any) { setError(e.message || 'Gagal check-in publik'); } finally { setBusyPublic(false); }
                        }}
                      >
                        {busyPublic ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                        <span className="ml-2">Check-in</span>
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-white/90">Admin Check-in (by Guest ID)</div>
                    <div className="flex gap-2">
                      <Input
                        value={adminGuestId}
                        onChange={(e) => setAdminGuestId(e.target.value)}
                        placeholder="Guest ID"
                        className="font-mono"
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
                            setMessage(`Check-in admin berhasil untuk ${g.name}`);
                          } catch (e: any) { setError(e.message || 'Gagal check-in admin'); } finally { setBusyAdminCheck(false); }
                        }}
                      >
                        {busyAdminCheck ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                        <span className="ml-2">Check-in</span>
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-white/90">Admin Uncheck-in (by Guest ID)</div>
                    <div className="flex gap-2">
                      <Input
                        value={adminGuestId}
                        onChange={(e) => setAdminGuestId(e.target.value)}
                        placeholder="Guest ID"
                        className="font-mono"
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
                            // Show modal for password and reason
                            setUncheckGuestInfo({ id: g.id, name: g.name });
                            setShowUncheckModal(true);
                          } catch (e: any) { setError(e.message || 'Gagal mencari guest'); } finally { setBusyAdminUncheck(false); }
                        }}
                      >
                        {busyAdminUncheck ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />}
                        <span className="ml-2">Uncheck-in</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Uncheckin Modal */}
        {showUncheckModal && uncheckGuestInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => { setShowUncheckModal(false); setUncheckPassword(''); setUncheckReason(''); setUncheckError(null); setUncheckGuestInfo(null); }}>
            <div className="w-full max-w-md rounded-xl bg-brand-secondary border border-brand-border p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-4 text-lg font-bold text-brand-surface flex items-center gap-2">
                <XCircle size={20} className="text-brand-danger" />
                Batalkan Check-in: {uncheckGuestInfo.name}
              </h3>
              <div className="mb-4 p-3 rounded-lg bg-brand-warning/10 border border-brand-warning/20">
                <p className="text-sm text-brand-warning">
                  Tindakan ini memerlukan password admin dan alasan pembatalan.
                </p>
              </div>
              {uncheckError && (
                <div className="mb-4 p-3 rounded-lg bg-brand-danger/10 border border-brand-danger/20 flex items-center gap-2">
                  <XCircle size={16} className="text-brand-danger shrink-0" />
                  <p className="text-sm text-brand-danger">{uncheckError}</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Password Admin</label>
                  <Input
                    type="password"
                    placeholder="Masukkan password Anda"
                    value={uncheckPassword}
                    onChange={(e) => { setUncheckPassword(e.target.value); setUncheckError(null); }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Alasan Pembatalan (minimal 5 karakter)</label>
                  <Input
                    placeholder="Contoh: Tamu salah scan, koreksi data..."
                    value={uncheckReason}
                    onChange={(e) => setUncheckReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="ghost"
                  onClick={() => { setShowUncheckModal(false); setUncheckPassword(''); setUncheckReason(''); setUncheckError(null); setUncheckGuestInfo(null); }}
                  className="flex-1"
                >
                  Batal
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
                  className="flex-1"
                >
                  {busyAdminUncheck ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />}
                  <span className="ml-2">Konfirmasi Uncheck-in</span>
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
