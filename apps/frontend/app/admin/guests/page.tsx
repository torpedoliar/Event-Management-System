"use client";
import RequireAuth from '../../../components/RequireAuth';
import { useEffect, useState, useRef, useCallback } from 'react';
import { apiFetch, toApiUrl, apiBase } from '../../../lib/api';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Edit, Trash2, CheckCircle, Gift, X, AlertTriangle, Users, Tag, Mail, Send, Loader2, Settings, Trophy, Package, Download } from 'lucide-react';
import { useSSE } from '../../../lib/sse-context';
import { Textarea } from '../../../components/ui/Textarea';

type GuestCategory = 'REGULAR' | 'VIP' | 'VVIP' | 'MEDIA' | 'SPONSOR' | 'SPEAKER' | 'ORGANIZER';
type RegistrationSource = 'MANUAL' | 'IMPORT' | 'WALKIN';

const CATEGORY_CONFIG: Record<GuestCategory, { label: string; color: string; bg: string; border: string }> = {
  REGULAR: { label: 'Regular', color: 'text-gray-300', bg: 'bg-gray-500/20', border: 'border-gray-500/30' },
  VIP: { label: 'VIP', color: 'text-amber-300', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  VVIP: { label: 'VVIP', color: 'text-purple-300', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  MEDIA: { label: 'Media', color: 'text-blue-300', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  SPONSOR: { label: 'Sponsor', color: 'text-emerald-300', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  SPEAKER: { label: 'Speaker', color: 'text-rose-300', bg: 'bg-rose-500/20', border: 'border-rose-500/30' },
  ORGANIZER: { label: 'Organizer', color: 'text-cyan-300', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
};

const SOURCE_CONFIG: Record<RegistrationSource, { label: string; color: string; bg: string; border: string }> = {
  MANUAL: { label: 'Manual', color: 'text-gray-300', bg: 'bg-gray-500/20', border: 'border-gray-500/30' },
  IMPORT: { label: 'Import', color: 'text-blue-300', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  WALKIN: { label: 'Walk-in', color: 'text-orange-300', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
};

interface PrizeWin {
  id: string;
  wonAt: string;
  prize: { id: string; name: string; category: string };
  collection?: { collectedAt: string; collectedByName?: string } | null;
}

interface SouvenirTake {
  id: string;
  takenAt: string;
  takenByName?: string;
  souvenir: { id: string; name: string };
}

interface GuestCheckin {
  id: string;
  checkinAt: string;
  checkinByName?: string;
  counterName?: string;
}

interface Guest {
  id: string;
  queueNumber: number;
  guestId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  tableLocation: string;
  company?: string | null;
  department?: string | null;
  division?: string | null;
  notes?: string | null;
  category: GuestCategory;
  registrationSource?: RegistrationSource;
  checkedIn: boolean;
  checkedInAt?: string | null;
  souvenirTaken: boolean;
  emailSent?: boolean;
  emailSentAt?: string | null;
  prizeWins?: PrizeWin[];
  souvenirTakes?: SouvenirTake[];
  checkins?: GuestCheckin[];
  checkinCount?: number;
}

interface GuestsResponse { data: Guest[]; total: number }

interface ImportResult {
  created: number;
  skipped: number;
  total: number;
  duplicates: Array<{ guestId: string; name: string; reason: string }>;
}

export default function GuestsListPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [resp, setResp] = useState<GuestsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyCheckinId, setBusyCheckinId] = useState<string | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingFull, setExportingFull] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<GuestCategory | ''>('');

  // Email state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCustomMessage, setEmailCustomMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailTargetIds, setEmailTargetIds] = useState<string[]>([]);

  const [eventCfg, setEventCfg] = useState<any>(null);
  const { addEventListener, removeEventListener } = useSSE();

  // Use refs to avoid stale closures in SSE callbacks
  const pageRef = useRef(page);
  const qRef = useRef(q);
  pageRef.current = page;
  qRef.current = q;

  useEffect(() => {
    fetch(`${apiBase()}/config/event`).then(r => r.json()).then(setEventCfg).catch(() => { });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: qRef.current, page: String(pageRef.current), pageSize: String(pageSize) });
      const data = await apiFetch<GuestsResponse>(`/guests?${params.toString()}`);
      setResp(data);
      // Clear selection when loading new data
      setSelectedIds(new Set());
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const toggleSouvenir = async (id: string, current: boolean) => {
    try {
      await apiFetch(`/guests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ souvenirTaken: !current })
      });
      await load();
    } catch (e: any) {
      setError(e.message || 'Gagal update souvenir');
    }
  };

  const doExport = async () => {
    try {
      setExporting(true);
      setError(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${apiBase()}/guests/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errData = await res.json();
          throw new Error(errData.message || errData.error || 'Gagal export');
        }
        throw new Error(await res.text() || 'Gagal export');
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = /filename="?([^";]+)"?/i.exec(cd);
      const filename = m?.[1] || 'data_tamu.xlsx';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      setMessage('Export data tamu berhasil!');
    } catch (e: any) {
      setError(e.message || 'Gagal export');
    } finally {
      setExporting(false);
    }
  };

  const doExportFull = async () => {
    try {
      setExportingFull(true);
      setError(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${apiBase()}/guests/export/full`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errData = await res.json();
          throw new Error(errData.message || errData.error || 'Gagal export laporan');
        }
        throw new Error(await res.text() || 'Gagal export laporan');
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = /filename="?([^";]+)"?/i.exec(cd);
      const filename = m?.[1] || 'laporan_event.xlsx';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      setMessage('Export laporan event berhasil!');
    } catch (e: any) {
      setError(e.message || 'Gagal export laporan');
    } finally {
      setExportingFull(false);
    }
  };

  const doExportPdf = async () => {
    try {
      setExportingPdf(true);
      setError(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${apiBase()}/guests/export/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errData = await res.json();
          throw new Error(errData.message || errData.error || 'Gagal export PDF');
        }
        throw new Error(await res.text() || 'Gagal export PDF');
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = /filename="?([^";]+)"?/i.exec(cd);
      const filename = m?.[1] || 'laporan_event.pdf';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      setMessage('Export PDF berhasil!');
    } catch (e: any) {
      setError(e.message || 'Gagal export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  // Realtime: auto-refresh on checkin/uncheckin events or event changes
  useEffect(() => {
    const onChange = async () => {
      await load();
    };
    const onEventChange = async () => {
      // Reset to page 1 and reload when event changes
      setPage(1);
      await load();
    };
    addEventListener('checkin', onChange);
    addEventListener('uncheckin', onChange);
    addEventListener('guest-update', onChange);
    addEventListener('event_change', onEventChange);
    return () => {
      removeEventListener('checkin', onChange);
      removeEventListener('uncheckin', onChange);
      removeEventListener('guest-update', onChange);
      removeEventListener('event_change', onEventChange);
    };
  }, [load, addEventListener, removeEventListener]);

  const markCheckedIn = async (id: string) => {
    try {
      setBusyCheckinId(id);
      await apiFetch(`/guests/${id}/checkin`, { method: 'POST' });
      await load();
    } catch (e: any) {
      setError(e.message || 'Gagal check-in');
    } finally {
      setBusyCheckinId(null);
    }
  };

  const removeGuest = async (id: string) => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('Hapus tamu ini?');
      if (!ok) return;
    }
    try {
      setBusyDeleteId(id);
      await apiFetch(`/guests/${id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus tamu');
    } finally {
      setBusyDeleteId(null);
    }
  };

  const doImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setMessage(null);
    setError(null);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${apiBase()}/guests/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errData = await res.json();
          throw new Error(errData.message || errData.error || 'Gagal import');
        }
        throw new Error(await res.text() || 'Gagal import');
      }
      const data: ImportResult = await res.json();
      setImportResult(data);
      if (data.skipped > 0) {
        setMessage(`Import selesai: ${data.created} dibuat, ${data.skipped} dilewati (duplikat/error).`);
      } else {
        setMessage(`Import berhasil: ${data.created}/${data.total} dibuat.`);
      }
      setImportFile(null);
      setPage(1);
      load();
    } catch (e: any) {
      setError(e.message || 'Gagal import');
    } finally {
      setImporting(false);
    }
  };

  // Bulk operations
  const toggleSelectAll = () => {
    if (!resp?.data) return;
    if (selectedIds.size === resp.data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(resp.data.map(g => g.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const doBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = window.confirm(`Hapus ${selectedIds.size} tamu yang dipilih?`);
    if (!ok) return;

    setBulkActionLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ deleted: number }>('/guests/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      setMessage(`${res.deleted} tamu berhasil dihapus.`);
      setSelectedIds(new Set());
      await load();
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus tamu');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const doBulkUpdate = async () => {
    if (selectedIds.size === 0 || !bulkCategory) return;

    setBulkActionLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ updated: number }>('/guests/bulk-update', {
        method: 'POST',
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          category: bulkCategory,
        }),
      });
      setMessage(`${res.updated} tamu berhasil diperbarui.`);
      setSelectedIds(new Set());
      setShowBulkEditModal(false);
      setBulkCategory('');
      await load();
    } catch (e: any) {
      setError(e.message || 'Gagal memperbarui tamu');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const doBulkCheckin = async (checkedIn: boolean) => {
    if (selectedIds.size === 0) return;
    const action = checkedIn ? 'check-in' : 'batalkan check-in';
    const ok = window.confirm(`${action} ${selectedIds.size} tamu yang dipilih?`);
    if (!ok) return;

    setBulkActionLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ updated: number }>('/guests/bulk-update', {
        method: 'POST',
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          checkedIn,
        }),
      });
      setMessage(`${res.updated} tamu berhasil di-${action}.`);
      setSelectedIds(new Set());
      await load();
    } catch (e: any) {
      setError(e.message || `Gagal ${action}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Email functions
  const openEmailModal = (guestIds: string[]) => {
    const guestsWithEmail = resp?.data?.filter(g => guestIds.includes(g.id) && g.email) || [];
    if (guestsWithEmail.length === 0) {
      setError('Tidak ada tamu dengan email yang dipilih');
      return;
    }
    setEmailTargetIds(guestsWithEmail.map(g => g.id));
    setEmailCustomMessage('');
    setShowEmailModal(true);
  };

  const sendEmails = async () => {
    if (emailTargetIds.length === 0) return;

    setSendingEmail(true);
    setError(null);
    try {
      if (emailTargetIds.length === 1) {
        // Single email
        await apiFetch('/email/send', {
          method: 'POST',
          body: JSON.stringify({
            guestId: emailTargetIds[0],
            customMessage: emailCustomMessage
          }),
        });
        setMessage('Email berhasil dikirim!');
      } else {
        // Bulk email
        const result = await apiFetch<{ sent: number; failed: number; skipped: number }>('/email/send-bulk', {
          method: 'POST',
          body: JSON.stringify({
            guestIds: emailTargetIds,
            customMessage: emailCustomMessage
          }),
        });
        setMessage(`Email terkirim: ${result.sent}, Gagal: ${result.failed}, Dilewati: ${result.skipped}`);
      }
      setShowEmailModal(false);
      setEmailTargetIds([]);
      setSelectedIds(new Set());
      await load();
    } catch (e: any) {
      setError(e.message || 'Gagal mengirim email');
    } finally {
      setSendingEmail(false);
    }
  };

  const [qrGuest, setQrGuest] = useState<Guest | null>(null);

  return (
    <RequireAuth>
      <div className="min-h-screen p-6 md:p-8 mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="w-full max-w-sm text-brand-text placeholder:text-brand-textMuted"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                load();
              }
            }}
            placeholder="Search..."
          />
          <Button
            size="sm"
            disabled={loading}
            onClick={() => { setPage(1); load(); }}
          >
            {loading ? 'Mencari...' : 'Cari'}
          </Button>
          <a
            href="/admin/guests/new"
            className="ml-auto inline-flex items-center rounded-full bg-brand-surface px-3 py-1 text-sm font-medium text-brand-text shadow-soft hover:bg-brand-primarySoft"
          >
            + Tambah
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={!importFile || importing}
            onClick={doImport}
          >
            {importing ? 'Mengimpor...' : 'Import Excel'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            onClick={async () => {
              try {
                setError(null);
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                const res = await fetch(`${apiBase()}/guests/template`, {
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                if (!res.ok) {
                  if (res.status === 401) {
                    throw new Error('Sesi telah berakhir. Silakan login kembali untuk mendownload template.');
                  }
                  // Try to parse JSON error from backend
                  const contentType = res.headers.get('content-type');
                  if (contentType?.includes('application/json')) {
                    const errData = await res.json();
                    throw new Error(errData.message || errData.error || 'Gagal mendownload template');
                  }
                  throw new Error(`Gagal mendownload template (HTTP ${res.status})`);
                }

                // Verify response is actually an XLSX file
                const contentType = res.headers.get('content-type') || '';
                if (!contentType.includes('spreadsheet') && !contentType.includes('octet-stream')) {
                  console.warn('[Download Template] Unexpected content-type:', contentType);
                }

                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'template_import_tamu.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (e: any) {
                setError(e.message || 'Gagal mendownload template');
              }
            }}
          >
            <Download size={14} className="mr-1" />
            Download Template
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto"
            onClick={doExport}
            disabled={exporting}
            title="Export data tamu untuk import ulang"
          >
            {exporting ? 'Exporting...' : 'Export Data Tamu'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="ml-2"
            onClick={doExportFull}
            disabled={exportingFull}
            title="Export laporan lengkap event (termasuk check-in, souvenir, hadiah)"
          >
            {exportingFull ? 'Exporting...' : 'Export Laporan Event'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="ml-2"
            onClick={doExportPdf}
            disabled={exportingPdf}
          >
            {exportingPdf ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <span className="text-sm text-blue-300 font-medium">
              {selectedIds.size} tamu dipilih
            </span>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowBulkEditModal(true)}
              disabled={bulkActionLoading}
            >
              <Tag size={14} className="mr-1" />
              Ubah Kategori
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => doBulkCheckin(true)}
              disabled={bulkActionLoading}
            >
              <CheckCircle size={14} className="mr-1" />
              Check-in
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openEmailModal(Array.from(selectedIds))}
              disabled={bulkActionLoading}
            >
              <Mail size={14} className="mr-1" />
              Kirim Email
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={doBulkDelete}
              disabled={bulkActionLoading}
            >
              <Trash2 size={14} className="mr-1" />
              Hapus
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              <X size={14} className="mr-1" />
              Batal
            </Button>
          </div>
        )}

        {message && <div className="text-sm text-brand-accent">{message}</div>}
        {error && <div className="text-sm text-brand-danger">{error}</div>}

        {/* Import Result with Duplicates Warning */}
        {importResult && importResult.duplicates.length > 0 && (
          <Card variant="glass" className="p-4 border-amber-500/30 bg-amber-500/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h4 className="font-medium text-amber-300 mb-2">
                  {importResult.skipped} data dilewati karena duplikat
                </h4>
                <div className="max-h-40 overflow-y-auto text-sm space-y-1">
                  {importResult.duplicates.slice(0, 10).map((d, i) => (
                    <div key={i} className="text-amber-200/80">
                      • <span className="font-mono">{d.guestId}</span> - {d.name} ({d.reason})
                    </div>
                  ))}
                  {importResult.duplicates.length > 10 && (
                    <div className="text-amber-200/60 italic">
                      ... dan {importResult.duplicates.length - 10} lainnya
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setImportResult(null)}
                  className="mt-3 text-xs text-amber-400 hover:text-amber-300"
                >
                  Tutup
                </button>
              </div>
            </div>
          </Card>
        )}

        <Card variant="glass" className="overflow-hidden p-0">
          {loading && <div className="p-3 text-sm text-white/80">Memuat data...</div>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20 bg-white/5 text-left text-xs font-semibold uppercase tracking-wide text-white/70">
                  <th className="px-2 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={!!(resp?.data && resp.data.length > 0 && selectedIds.size === resp.data.length)}
                      onChange={toggleSelectAll}
                      className="rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-2 py-3">No</th>
                  <th className="px-2 py-3">Foto</th>
                  <th className="px-2 py-3">ID</th>
                  <th className="px-2 py-3">Nama</th>
                  <th className="px-2 py-3">Email</th>
                  <th className="px-2 py-3">Kategori</th>
                  <th className="px-2 py-3">Meja</th>
                  <th className="px-2 py-3">Perusahaan</th>
                  <th className="px-2 py-3">Divisi</th>
                  <th className="px-2 py-3">Departemen</th>
                  <th className="px-2 py-3">Waktu Check-in</th>
                  {eventCfg?.enableSouvenir && <th className="px-2 py-3 text-center">Souvenir</th>}
                  <th className="px-2 py-3 text-center">Hadiah</th>
                  <th className="px-2 py-3 text-center">Status</th>
                  <th className="px-2 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {resp?.data.map((g) => {
                  const cat = CATEGORY_CONFIG[g.category] || CATEGORY_CONFIG.REGULAR;
                  const src = g.registrationSource ? SOURCE_CONFIG[g.registrationSource] : null;
                  return (
                    <tr key={g.id} className={`hover:bg-white/5 transition-colors ${selectedIds.has(g.id) ? 'bg-blue-500/10' : ''}`}>
                      <td className="px-2 py-3 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(g.id)}
                          onChange={() => toggleSelect(g.id)}
                          className="rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-3 text-xs text-white/70 align-middle">{g.queueNumber}</td>
                      <td className="px-2 py-3 align-middle">
                        {g.photoUrl ? (
                          <img src={toApiUrl(g.photoUrl)} alt={g.name} className="h-10 w-10 rounded-full object-cover border border-white/20" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/40 border border-white/10">
                            <Users size={16} />
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 font-mono text-xs text-white/80 align-middle">{g.guestId}</td>
                      <td className="px-2 py-3 text-white font-medium align-middle">
                        {g.name}
                        {g.notes && (
                          <div className="text-xs text-amber-300/80 mt-1 px-2 py-1 bg-amber-500/10 rounded border border-amber-500/20 max-w-xs truncate">
                            {g.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 text-white/70 text-xs align-middle">
                        {g.email ? (
                          <span className="flex items-center gap-1">
                            <Mail size={12} className="text-blue-400" />
                            <span>{g.email}</span>
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-3 align-middle">
                        <div className="flex flex-wrap gap-1">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cat.bg} ${cat.color} border ${cat.border}`}>
                            {cat.label}
                          </span>
                          {src && g.registrationSource === 'WALKIN' && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${src.bg} ${src.color} border ${src.border}`}>
                              {src.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-white align-middle">{g.tableLocation}</td>
                      <td className="px-2 py-3 text-white/70 align-middle">{g.company || '-'}</td>
                      <td className="px-2 py-3 text-white/70 align-middle">{g.division || '-'}</td>
                      <td className="px-2 py-3 text-white/70 align-middle">{g.department || '-'}</td>
                      <td className="px-2 py-3 text-white/70 text-xs align-middle">
                        {g.checkedInAt ? new Date(g.checkedInAt).toLocaleString('id-ID', { hour12: false }) : '-'}
                      </td>
                      {eventCfg?.enableSouvenir && (
                        <td className="px-2 py-3 align-middle text-center">
                          {g.souvenirTakes && g.souvenirTakes.length > 0 ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                <Package size={12} />
                                {g.souvenirTakes.length}
                              </span>
                              <span className="text-[10px] text-white/50 max-w-[100px] truncate" title={g.souvenirTakes.map(s => s.souvenir.name).join(', ')}>
                                {g.souvenirTakes.map(s => s.souvenir.name).join(', ')}
                              </span>
                            </div>
                          ) : g.souvenirTaken ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <Gift size={12} />
                              Ya
                            </span>
                          ) : (
                            <span className="text-white/30 text-xs">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-3 align-middle text-center">
                        {g.prizeWins && g.prizeWins.length > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            {g.prizeWins.map((pw, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${pw.collection
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}
                                title={`${pw.prize.name} - ${pw.collection ? 'Sudah diambil' : 'Belum diambil'}`}
                              >
                                <Trophy size={12} />
                                <span className="max-w-[80px] truncate">{pw.prize.name}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-white/30 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-3 align-middle text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${g.checkedIn ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                          {g.checkedIn ? 'Checked-in' : 'Belum'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Tampilkan QR"
                            className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                            onClick={() => setQrGuest(g)}
                          >
                            <QrCode size={18} />
                          </button>
                          <button
                            title={g.checkedIn ? "Sudah Check-in" : "Check-in Manual"}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${g.checkedIn ? 'text-emerald-400/50 cursor-not-allowed' : 'text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300'}`}
                            disabled={g.checkedIn || busyCheckinId === g.id}
                            onClick={() => markCheckedIn(g.id)}
                          >
                            <CheckCircle size={18} />
                          </button>
                          <a
                            title="Edit Tamu"
                            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-400/10 hover:text-blue-300 transition-colors"
                            href={`/admin/guests/${g.id}`}
                          >
                            <Edit size={18} />
                          </a>
                          {g.email && (
                            <button
                              title="Kirim Email Undangan"
                              className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300 transition-colors"
                              onClick={() => openEmailModal([g.id])}
                            >
                              <Send size={18} />
                            </button>
                          )}
                          <button
                            title="Hapus Tamu"
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors disabled:opacity-50"
                            disabled={busyDeleteId === g.id}
                            onClick={() => removeGuest(g.id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <div className="text-brand-textMuted">Hal {page}</div>
          <Button
            size="sm"
            variant="secondary"
            disabled={(resp?.data.length || 0) < pageSize}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
          {resp && (
            <div className="text-brand-textMuted ml-auto">
              Total: {resp.total} tamu
            </div>
          )}
        </div>

        {/* QR Modal */}
        {qrGuest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setQrGuest(null)}>
            <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-4 text-lg font-bold text-gray-900">QR Code: {qrGuest.name}</h3>
              <div className="mb-4 flex justify-center">
                <QRCodeSVG value={qrGuest.id} size={200} />
              </div>
              <p className="mb-6 text-sm text-gray-500">Scan code ini di Kiosk Check-in</p>
              <Button onClick={() => setQrGuest(null)}>Tutup</Button>
            </div>
          </div>
        )}

        {/* Bulk Edit Modal */}
        {showBulkEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowBulkEditModal(false)}>
            <div className="w-full max-w-md rounded-xl bg-slate-900 border border-white/20 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-4 text-lg font-bold text-white flex items-center gap-2">
                <Tag size={20} className="text-blue-400" />
                Ubah Kategori ({selectedIds.size} tamu)
              </h3>
              <div className="mb-6">
                <label className="block text-sm text-white/70 mb-2">Pilih Kategori Baru</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CATEGORY_CONFIG) as GuestCategory[]).map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setBulkCategory(cat)}
                        className={`p-3 rounded-lg border text-left transition-all ${bulkCategory === cat
                          ? `${cfg.bg} ${cfg.border} ring-2 ring-blue-500`
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                          }`}
                      >
                        <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => { setShowBulkEditModal(false); setBulkCategory(''); }}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={doBulkUpdate}
                  disabled={!bulkCategory || bulkActionLoading}
                  className="flex-1"
                >
                  {bulkActionLoading ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowEmailModal(false)}>
            <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-white/20 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-4 text-lg font-bold text-white flex items-center gap-2">
                <Mail size={20} className="text-blue-400" />
                Kirim Email Undangan
              </h3>

              <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-300">
                  <strong>{emailTargetIds.length}</strong> tamu dengan email akan menerima undangan
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-white/70 mb-2">
                  Pesan Kustom dari Administrator (opsional)
                </label>
                <Textarea
                  rows={4}
                  placeholder="Contoh: Kami tunggu kehadiran Bapak/Ibu. Mohon hadir 30 menit sebelum acara dimulai."
                  value={emailCustomMessage}
                  onChange={(e) => setEmailCustomMessage(e.target.value)}
                />
                <p className="mt-1 text-xs text-white/50">
                  Pesan ini akan ditampilkan di dalam email undangan
                </p>
              </div>

              <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-300 flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Pastikan pengaturan email sudah dikonfigurasi di{' '}
                    <a href="/admin/settings/email" className="underline hover:text-amber-200">
                      Settings → Email
                    </a>
                  </span>
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => { setShowEmailModal(false); setEmailTargetIds([]); }}
                  className="flex-1"
                  disabled={sendingEmail}
                >
                  Batal
                </Button>
                <Button
                  onClick={sendEmails}
                  disabled={sendingEmail || emailTargetIds.length === 0}
                  className="flex-1"
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Kirim Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
