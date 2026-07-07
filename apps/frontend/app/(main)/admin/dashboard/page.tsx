"use client";
import RequireAuth from '@/components/RequireAuth';
import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { apiFetch, apiBase, parseErrorMessage } from '@/lib/api';
import { useGuestStats, useActiveEvent, useInvalidateQueries } from '@/lib/hooks/use-guests';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Label from '@/components/ui/Label';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import StatusBadge from '@/components/ui/StatusBadge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { TrendingUp, Radio, BarChart3, Users, Dices, ExternalLink, UserPlus, Save, CheckCircle, XCircle, Activity, Trophy } from 'lucide-react';
import { useSSE } from '@/lib/sse-context';

const GuestStatsChart = lazy(() => import('@/components/GuestStatsChart'));

export default function DashboardPage() {
  const { data: stats, error: statsError, isLoading: statsLoading } = useGuestStats();
  const { data: event } = useActiveEvent();
  const { invalidateStats, invalidateAll } = useInvalidateQueries();

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [guestId, setGuestId] = useState('');
  const [name, setName] = useState('');
  const [tableLocation, setTableLocation] = useState('');
  const [company, setCompany] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [adminGuestId, setAdminGuestId] = useState('');
  const [busyAdminCheck, setBusyAdminCheck] = useState(false);
  const [busyAdminUncheck, setBusyAdminUncheck] = useState(false);

  const [showUncheckModal, setShowUncheckModal] = useState(false);
  const [uncheckGuestInfo, setUncheckGuestInfo] = useState<{ id: string; name: string } | null>(null);
  const [uncheckPassword, setUncheckPassword] = useState('');
  const [uncheckReason, setUncheckReason] = useState('');
  const [uncheckError, setUncheckError] = useState<string | null>(null);

  const { addEventListener, removeEventListener, connected } = useSSE();

  useEffect(() => {
    if (statsError) setError((statsError as Error).message);
  }, [statsError]);

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

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
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
  };

  const manualCheckin = async () => {
    setError(null); setMessage(null); setBusyAdminCheck(true);
    try {
      const r = await fetch(`${apiBase()}/public/guests/search?guestId=${encodeURIComponent(adminGuestId)}`);
      if (!r.ok) {
        const errorText = await r.text();
        throw new Error(parseErrorMessage(errorText));
      }
      const arr = await r.json();
      const g = arr && arr[0];
      if (!g) throw new Error('Tamu tidak ditemukan');
      await apiFetch(`/guests/${g.id}/checkin`, { method: 'POST' });
      setMessage(`Check-in berhasil untuk ${g.name}`);
      setAdminGuestId('');
    } catch (e: any) { setError(e.message || 'Gagal check-in'); }
    finally { setBusyAdminCheck(false); }
  };

  const openUncheck = async () => {
    setError(null); setMessage(null); setBusyAdminUncheck(true);
    try {
      const r = await fetch(`${apiBase()}/public/guests/search?guestId=${encodeURIComponent(adminGuestId)}`);
      if (!r.ok) {
        const errorText = await r.text();
        throw new Error(parseErrorMessage(errorText));
      }
      const arr = await r.json();
      const g = arr && arr[0];
      if (!g) throw new Error('Tamu tidak ditemukan');
      setUncheckGuestInfo({ id: g.id, name: g.name });
      setShowUncheckModal(true);
    } catch (e: any) { setError(e.message || 'Gagal mencari'); }
    finally { setBusyAdminUncheck(false); }
  };

  const confirmUncheck = async () => {
    if (!uncheckGuestInfo) return;
    setUncheckError(null); setBusyAdminUncheck(true);
    try {
      await apiFetch(`/guests/${uncheckGuestInfo.id}/uncheckin`, {
        method: 'POST',
        body: JSON.stringify({ password: uncheckPassword, reason: uncheckReason }),
      });
      setMessage(`Check-in dibatalkan untuk ${uncheckGuestInfo.name}`);
      setShowUncheckModal(false);
      setUncheckPassword('');
      setUncheckReason('');
      setUncheckGuestInfo(null);
      setAdminGuestId('');
    } catch (e: any) {
      setUncheckError(parseErrorMessage(e.message) || 'Gagal membatalkan check-in');
    } finally { setBusyAdminUncheck(false); }
  };

  return (
    <RequireAuth>
      <main className="min-h-[100dvh] py-6 md:py-8 lg:py-10">
        <div className="container-padded space-y-8">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-heading-1 text-brand-text mb-1">Dashboard</h1>
              <p className="text-body-sm text-brand-textMuted">Pantau kehadiran dan kelola tamu</p>
            </div>
            <StatusBadge status={connected ? 'success' : 'danger'} pulse={connected}>
              {connected ? 'Sinkronisasi aktif' : 'Terputus dari server'}
            </StatusBadge>
          </header>

          {/* Alerts */}
          {(message || error) && (
            <div className="space-y-3">
              {message && <Alert variant="success"><CheckCircle size={18} className="shrink-0 mt-0.5" />{message}</Alert>}
              {error && <Alert variant="error"><XCircle size={18} className="shrink-0 mt-0.5" />{error}</Alert>}
            </div>
          )}

          {/* Stats grid */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <Card className="md:col-span-8 flex flex-col justify-center p-6 md:p-8 border-t-2 border-t-brand-primary">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary">
                  <TrendingUp size={22} />
                </div>
                <span className="text-label text-brand-textMuted uppercase">Total Kehadiran</span>
              </div>
              <div className="flex items-baseline gap-4 flex-wrap">
                <span className="text-6xl md:text-7xl lg:text-8xl font-bold text-brand-text tracking-tight font-sans">
                  {statsLoading ? '-' : stats?.checkedIn || 0}
                </span>
                <span className="text-xl md:text-2xl text-brand-textMuted pb-2 tabular-nums">
                  / {statsLoading ? '-' : stats?.total || 0} register
                </span>
              </div>
            </Card>

            <div className="md:col-span-4 grid grid-cols-1 gap-5">
              <Card className="border-t-2 border-t-brand-textDim/60">
                <div className="text-label text-brand-textMuted uppercase mb-2">Menunggu</div>
                <div className="text-3xl md:text-4xl font-semibold text-brand-text tabular-nums">
                  {statsLoading ? '-' : stats?.notCheckedIn || 0}
                </div>
              </Card>
              <Card className="border-t-2 border-t-brand-primary">
                <div className="text-label text-brand-textMuted uppercase mb-2">Progress</div>
                <div className="text-3xl md:text-4xl font-semibold text-brand-text tabular-nums">{checkinPercent}%</div>
                <div className="w-full h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-brand-primary to-brand-primaryHover rounded-full transition-all duration-1000 ease-out" style={{ width: `${checkinPercent}%` }} />
                </div>
              </Card>
            </div>
          </section>

          {/* Main content */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              <Card variant="elevated">
                <h2 className="text-heading-2 text-brand-text mb-5">Akses Cepat</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <QuickLink href="/admin/statistics" icon={<BarChart3 size={18} />}>Statistik</QuickLink>
                  <QuickLink href="/admin/guests" icon={<Users size={18} />}>Tamu</QuickLink>
                  <QuickLink href="/luckydraw" icon={<Dices size={18} />}>Lucky Draw</QuickLink>
                  <QuickLink href="/checkin" external icon={<ExternalLink size={18} />}>Kiosk</QuickLink>
                  {event?.enableTournament && (
                    <QuickLink href="/admin/tournaments" icon={<Trophy size={18} />}>Tournament</QuickLink>
                  )}
                </div>
              </Card>

              {stats && (
                <Suspense fallback={<SkeletonCard className="h-80" />}>
                  <div className="surface-elevated p-5 rounded-2xl border border-brand-border">
                    <GuestStatsChart stats={stats} />
                  </div>
                </Suspense>
              )}
            </div>

            {/* Right column */}
            <aside className="space-y-6">
              <Card>
                <h2 className="text-heading-2 text-brand-text mb-5 flex items-center gap-2">
                  <UserPlus size={18} className="text-brand-primary" />
                  Tambah Tamu
                </h2>
                <form onSubmit={addGuest} className="space-y-4">
                  <div>
                    <Label htmlFor="quick-guest-id">ID Tamu</Label>
                    <Input id="quick-guest-id" value={guestId} onChange={(e) => setGuestId(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="quick-name">Nama Lengkap</Label>
                    <Input id="quick-name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="quick-table">Meja / Ruangan</Label>
                    <Input id="quick-table" value={tableLocation} onChange={(e) => setTableLocation(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="quick-company">Perusahaan</Label>
                    <Input id="quick-company" value={company} onChange={(e) => setCompany(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" loading={saving}>
                    {!saving && <Save size={18} />}
                    {saving ? 'Menyimpan...' : 'Tambah Tamu'}
                  </Button>
                </form>
              </Card>

              <Card>
                <h2 className="text-heading-2 text-brand-text mb-5 flex items-center gap-2">
                  <Activity size={18} className="text-brand-danger" />
                  Tindakan Admin
                </h2>
                <div className="space-y-5">
                  <div>
                    <Label className="mb-2 block">Check-in Manual</Label>
                    <div className="flex gap-2">
                      <Input value={adminGuestId} onChange={(e) => setAdminGuestId(e.target.value)} placeholder="ID Tamu" />
                      <Button onClick={manualCheckin} disabled={busyAdminCheck || !adminGuestId} loading={busyAdminCheck}>
                        <CheckCircle size={16} />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Batalkan Check-in</Label>
                    <div className="flex gap-2">
                      <Input value={adminGuestId} onChange={(e) => setAdminGuestId(e.target.value)} placeholder="ID Tamu" />
                      <Button variant="danger" onClick={openUncheck} disabled={busyAdminUncheck || !adminGuestId} loading={busyAdminUncheck}>
                        <XCircle size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </aside>
          </section>
        </div>
      </main>

      {/* Uncheck Modal */}
      <Modal
        open={showUncheckModal && !!uncheckGuestInfo}
        onClose={() => { setShowUncheckModal(false); setUncheckPassword(''); setUncheckReason(''); setUncheckError(null); }}
        title="Batalkan Check-in"
        description="Membatalkan check-in akan mencabut hak undian tamu."
      >
        <div className="space-y-4">
          <p className="text-body-sm text-brand-textMuted">
            Tamu: <strong className="text-brand-text">{uncheckGuestInfo?.name}</strong>
          </p>
          {uncheckError && (
            <Alert variant="error">{uncheckError}</Alert>
          )}
          <div>
            <Label>Password Admin</Label>
            <Input type="password" value={uncheckPassword} onChange={(e) => { setUncheckPassword(e.target.value); setUncheckError(null); }} />
          </div>
          <div>
            <Label>Alasan (min. 5 karakter)</Label>
            <Input value={uncheckReason} onChange={(e) => setUncheckReason(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setShowUncheckModal(false); setUncheckPassword(''); setUncheckReason(''); setUncheckError(null); }}>
              Batal
            </Button>
            <Button variant="danger" className="flex-1" onClick={confirmUncheck} disabled={!uncheckPassword || uncheckReason.length < 5 || busyAdminUncheck} loading={busyAdminUncheck}>
              <XCircle size={16} />
              Konfirmasi
            </Button>
          </div>
        </div>
      </Modal>
    </RequireAuth>
  );
}

function QuickLink({ href, children, icon, external }: { href: string; children: React.ReactNode; icon: React.ReactNode; external?: boolean }) {
  const base = 'flex flex-col gap-3 p-4 surface-interactive rounded-xl text-brand-text transition-all duration-fast';
  const content = (
    <>
      <div className="text-brand-primary">{icon}</div>
      <span className="text-sm font-medium">{children}</span>
    </>
  );
  if (external) {
    return <a href={href} target="_blank" rel="noreferrer" className={base}>{content}</a>;
  }
  return <a href={href} className={base}>{content}</a>;
}
