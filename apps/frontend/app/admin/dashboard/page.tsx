"use client";
import RequireAuth from '../../../components/RequireAuth';
import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { apiFetch, apiBase, parseErrorMessage } from '../../../lib/api';
import { useGuestStats, useActiveEvent, useInvalidateQueries } from '../../../lib/hooks/use-guests';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Label from '../../../components/ui/Label';
import Modal from '../../../components/ui/Modal';
import StatusBadge from '../../../components/ui/StatusBadge';
import { SkeletonStats, SkeletonCard } from '../../../components/ui/Skeleton';
import { TrendingUp, Radio, BarChart3, Users, Dices, ExternalLink, UserPlus, Save, Loader2, CheckCircle, XCircle, Activity } from 'lucide-react';
import { useSSE } from '../../../lib/sse-context';

const GuestStatsChart = lazy(() => import('../../../components/GuestStatsChart'));

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
      <div className="min-h-[100dvh] p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-brand-text">Dashboard</h1>
              <p className="text-sm text-brand-textMuted">Pantau kehadiran dan kelola tamu</p>
            </div>
            <StatusBadge status={connected ? 'success' : 'danger'} pulse={connected}>
              {connected ? 'Sinkronisasi aktif' : 'Terputus dari server'}
            </StatusBadge>
          </div>

          {/* Alerts */}
          {(message || error) && (
            <div className="space-y-3">
              {message && (
                <div className="bg-brand-success/10 border border-brand-success/20 text-brand-success rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle size={18} />
                  {message}
                </div>
              )}
              {error && (
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-xl p-4 flex items-center gap-3">
                  <XCircle size={18} />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <Card className="md:col-span-8 flex flex-col justify-center border-t-2 border-t-brand-primary">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">
                  <TrendingUp size={20} />
                </div>
                <span className="text-sm font-medium text-brand-textMuted uppercase tracking-wider">Total Kehadiran</span>
              </div>
              <div className="flex items-baseline gap-4 flex-wrap">
                <span className="text-6xl md:text-7xl lg:text-8xl font-bold text-brand-text tracking-tight">
                  {statsLoading ? '-' : stats?.checkedIn || 0}
                </span>
                <span className="text-xl md:text-2xl text-brand-textMuted pb-2">
                  / {statsLoading ? '-' : stats?.total || 0} register
                </span>
              </div>
            </Card>

            <div className="md:col-span-4 grid grid-cols-1 gap-4">
              <Card className="border-t-2 border-t-brand-accent">
                <div className="text-sm font-medium text-brand-textMuted uppercase tracking-wider mb-1">Menunggu</div>
                <div className="text-3xl md:text-4xl font-semibold text-brand-text">
                  {statsLoading ? '-' : stats?.notCheckedIn || 0}
                </div>
              </Card>
              <Card className="border-t-2 border-t-brand-vivid">
                <div className="text-sm font-medium text-brand-textMuted uppercase tracking-wider mb-1">Progress</div>
                <div className="text-3xl md:text-4xl font-semibold text-brand-text">{checkinPercent}%</div>
                <div className="w-full h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-brand-primary to-brand-accent rounded-full transition-all duration-1000 ease-out animate-[pulse_3s_infinite]" style={{ width: `${checkinPercent}%` }} />
                </div>
              </Card>
            </div>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="surface-elevated">
                <h2 className="text-lg font-semibold text-brand-text mb-4">Akses Cepat</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <QuickLink href="/admin/statistics" icon={<BarChart3 size={18} />}>Statistik</QuickLink>
                  <QuickLink href="/admin/guests" icon={<Users size={18} />}>Tamu</QuickLink>
                  <QuickLink href="/luckydraw" icon={<Dices size={18} />}>Lucky Draw</QuickLink>
                  <QuickLink href="/checkin" external icon={<ExternalLink size={18} />}>Kiosk</QuickLink>
                </div>
              </Card>

              {stats && (
                <Suspense fallback={<SkeletonCard className="h-80" />}>
                  <div className="surface-elevated p-4">
                    <GuestStatsChart stats={stats} />
                  </div>
                </Suspense>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <Card>
                <h2 className="text-lg font-semibold text-brand-text mb-4 flex items-center gap-2">
                  <UserPlus size={18} className="text-brand-primary" />
                  Tambah Tamu
                </h2>
                <form onSubmit={addGuest} className="space-y-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-brand-textMuted mb-1.5 block" htmlFor="quick-guest-id">ID Tamu</Label>
                    <Input id="quick-guest-id" value={guestId} onChange={(e) => setGuestId(e.target.value)} required />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-brand-textMuted mb-1.5 block" htmlFor="quick-name">Nama Lengkap</Label>
                    <Input id="quick-name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-brand-textMuted mb-1.5 block" htmlFor="quick-table">Meja / Ruangan</Label>
                    <Input id="quick-table" value={tableLocation} onChange={(e) => setTableLocation(e.target.value)} required />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-brand-textMuted mb-1.5 block" htmlFor="quick-company">Perusahaan</Label>
                    <Input id="quick-company" value={company} onChange={(e) => setCompany(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" loading={saving}>
                    {!saving && <Save size={18} />}
                    {saving ? 'Menyimpan...' : 'Tambah Tamu'}
                  </Button>
                </form>
              </Card>

              <Card>
                <h2 className="text-lg font-semibold text-brand-text mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-brand-danger" />
                  Tindakan Admin
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-brand-textMuted mb-1.5 block">Check-in Manual</Label>
                    <div className="flex gap-2">
                      <Input value={adminGuestId} onChange={(e) => setAdminGuestId(e.target.value)} placeholder="ID Tamu" />
                      <Button onClick={manualCheckin} disabled={busyAdminCheck || !adminGuestId} loading={busyAdminCheck}>
                        <CheckCircle size={16} />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-brand-textMuted mb-1.5 block">Batalkan Check-in</Label>
                    <div className="flex gap-2">
                      <Input value={adminGuestId} onChange={(e) => setAdminGuestId(e.target.value)} placeholder="ID Tamu" />
                      <Button variant="danger" onClick={openUncheck} disabled={busyAdminUncheck || !adminGuestId} loading={busyAdminUncheck}>
                        <XCircle size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Uncheck Modal */}
      <Modal
        open={showUncheckModal && !!uncheckGuestInfo}
        onClose={() => { setShowUncheckModal(false); setUncheckPassword(''); setUncheckReason(''); setUncheckError(null); }}
        title="Batalkan Check-in"
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-textMuted">
            Membatalkan check-in akan mencabut hak undian tamu: <strong className="text-brand-text">{uncheckGuestInfo?.name}</strong>.
          </p>
          {uncheckError && (
            <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-lg p-3 text-sm">
              {uncheckError}
            </div>
          )}
          <div>
            <Label className="text-xs uppercase tracking-wider text-brand-textMuted mb-1.5 block">Password Admin</Label>
            <Input type="password" value={uncheckPassword} onChange={(e) => { setUncheckPassword(e.target.value); setUncheckError(null); }} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-brand-textMuted mb-1.5 block">Alasan (min. 5 karakter)</Label>
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
  const base = 'flex flex-col gap-2 p-4 surface-interactive rounded-xl text-brand-text transition-colors';
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
