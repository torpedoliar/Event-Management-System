"use client";
import RequireAuth from '@/components/RequireAuth';
import { useEffect, useState, useRef, useCallback } from 'react';
import { apiFetch, toApiUrl, apiBase } from '@/lib/api';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Edit, Trash2, CheckCircle, Gift, X, AlertTriangle, Users, Tag, Mail, Send, Loader2, Settings, Trophy, Package, Download } from 'lucide-react';
import { useSSE } from '@/lib/sse-context';
import { Textarea } from '@/components/ui/Textarea';

type GuestCategory = 'REGULAR' | 'VIP' | 'VVIP' | 'MEDIA' | 'SPONSOR' | 'SPEAKER' | 'ORGANIZER';
type RegistrationSource = 'MANUAL' | 'IMPORT' | 'WALKIN' | 'PUBLIC';

const CATEGORY_CONFIG: Record<GuestCategory, { label: string; color: string; bg: string; border: string }> = {
  REGULAR: { label: 'Regular', color: 'text-brand-textMuted', bg: 'bg-brand-textMuted/10', border: 'border-brand-textMuted/20' },
  VIP: { label: 'VIP', color: 'text-brand-warning', bg: 'bg-brand-warning/20', border: 'border-brand-warning/30' },
  VVIP: { label: 'VVIP', color: 'text-brand-primary', bg: 'bg-brand-primary/20', border: 'border-brand-primary/30' },
  MEDIA: { label: 'Media', color: 'text-brand-primarySoft', bg: 'bg-brand-primary/20', border: 'border-brand-primary/30' },
  SPONSOR: { label: 'Sponsor', color: 'text-brand-success', bg: 'bg-brand-success/20', border: 'border-brand-success/30' },
  SPEAKER: { label: 'Speaker', color: 'text-rose-300', bg: 'bg-rose-500/20', border: 'border-rose-500/30' },
  ORGANIZER: { label: 'Organizer', color: 'text-cyan-300', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
};

const SOURCE_CONFIG: Record<RegistrationSource, { label: string; color: string; bg: string; border: string }> = {
  MANUAL: { label: 'Manual', color: 'text-brand-textMuted', bg: 'bg-brand-textMuted/10', border: 'border-brand-textMuted/20' },
  IMPORT: { label: 'Import', color: 'text-brand-primarySoft', bg: 'bg-brand-primary/20', border: 'border-brand-primary/30' },
  WALKIN: { label: 'Walk-in', color: 'text-orange-300', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  PUBLIC: { label: 'Public', color: 'text-emerald-300', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
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
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

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

  const load = useCallback(async (isDuplicates = showDuplicatesOnly) => {
    setLoading(true);
    setError(null);
    try {
      if (isDuplicates) {
        const data = await apiFetch<Guest[]>('/guests/duplicates');
        setResp({ data, total: data.length });
      } else {
        const params = new URLSearchParams({ q: qRef.current, page: String(pageRef.current), pageSize: String(pageSize) });
        const data = await apiFetch<GuestsResponse>(`/guests?${params.toString()}`);
        setResp(data);
      }
      // Clear selection when loading new data
      setSelectedIds(new Set());
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [pageSize, showDuplicatesOnly]);

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

  useEffect(() => { load(showDuplicatesOnly); }, [page, showDuplicatesOnly]);

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
          <Button
            size="sm"
            variant={showDuplicatesOnly ? "primary" : "secondary"}
            className={showDuplicatesOnly ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-500" : ""}
            onClick={() => {
              const newMode = !showDuplicatesOnly;
              setShowDuplicatesOnly(newMode);
              setPage(1);
            }}
          >
            {showDuplicatesOnly ? "Kembali ke Semua Data" : "Cek Data Ganda"}
          </Button>
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
            variant="secondary"
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
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/20">
            <span className="text-sm text-brand-primarySoft font-medium">
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
              className="text-brand-danger hover:text-brand-danger hover:bg-brand-danger/10"
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

        {message && <div className="text-sm text-brand-primary">{message}</div>}
        {error && <div className="text-sm text-brand-danger">{error}</div>}

        {/* Import Result with Duplicates Warning */}
        {importResult && importResult.duplicates.length > 0 && (
          <Card variant="glass" className="p-4 border-brand-warning/30 bg-brand-warning/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-brand-warning shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h4 className="font-medium text-brand-warning mb-2">
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
                  className="mt-3 text-xs text-brand-warning hover:text-brand-warning"
                >
                  Tutup
                </button>
              </div>
            </div>
          </Card>
        )}

        <div className="relative overflow-hidden surface-elevated backdrop-blur-xl shadow-glass">
          {loading && <div className="absolute inset-0 z-20 flex items-center justify-center bg-brand-bgElevated/50 backdrop-blur-sm"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>}
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-brand-bgElevated/95 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <tr className="text-xs font-mono uppercase tracking-widest text-brand-primarySoft/70 border-b border-brand-primary/20">
                  <th className="px-4 py-5 w-10 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={!!(resp?.data && resp.data.length > 0 && selectedIds.size === resp.data.length)}
                      onChange={toggleSelectAll}
                      className="rounded border-white/30 bg-white/10 text-brand-primary focus:ring-brand-primary"
                    />
                  </th>
                  <th className="px-4 py-5 whitespace-nowrap">No</th>
                  <th className="px-4 py-5 whitespace-nowrap">Foto</th>
                  <th className="px-4 py-5 whitespace-nowrap">ID</th>
                  <th className="px-4 py-5 whitespace-nowrap">Nama</th>
                  <th className="px-4 py-5 whitespace-nowrap">Email</th>
                  <th className="px-4 py-5 whitespace-nowrap">Kategori</th>
                  <th className="px-4 py-5 whitespace-nowrap">Meja</th>
                  <th className="px-4 py-5 whitespace-nowrap">Perusahaan</th>
                  <th className="px-4 py-5 whitespace-nowrap">Divisi</th>
                  <th className="px-4 py-5 whitespace-nowrap">Departemen</th>
                  <th className="px-4 py-5 whitespace-nowrap">Waktu Check-in</th>
                  {eventCfg?.enableSouvenir && <th className="px-4 py-5 text-center whitespace-nowrap">Souvenir</th>}
                  <th className="px-4 py-5 text-center whitespace-nowrap">Hadiah</th>
                  <th className="px-4 py-5 text-center whitespace-nowrap">Status</th>
                  <th className="px-4 py-5 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {resp?.data.map((g) => {
                  const cat = CATEGORY_CONFIG[g.category] || CATEGORY_CONFIG.REGULAR;
                  const src = g.registrationSource ? SOURCE_CONFIG[g.registrationSource] : null;
                  return (
                    <tr key={g.id} className={`group transition-all duration-300 ${showDuplicatesOnly ? 'bg-rose-500/10 hover:bg-rose-500/20 shadow-[inset_0_0_30px_rgba(225,29,72,0.1)]' : 'hover:bg-brand-bgSubtle hover:shadow-[inset_0_0_30px_rgba(212,168,83,0.05)]'} relative ${selectedIds.has(g.id) ? 'bg-brand-primary/10' : ''}`}>
                      <td className="px-4 py-4 align-middle whitespace-nowrap">
                        {/* Glow Row Indicator */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${showDuplicatesOnly ? 'bg-rose-500' : 'bg-brand-primary'} opacity-0 group-hover:opacity-100 transition-opacity`} />
                        <input
                          type="checkbox"
                          checked={selectedIds.has(g.id)}
                          onChange={() => toggleSelect(g.id)}
                          className="rounded border-white/30 bg-white/10 text-brand-primary focus:ring-brand-primary"
                        />
                      </td>
                      <td className="px-4 py-4 text-xs font-mono text-brand-primarySoft/50 align-middle">{g.queueNumber}</td>
                      <td className="px-4 py-4 align-middle">
                        {g.photoUrl ? (
                          <img src={toApiUrl(g.photoUrl)} alt={g.name} className="h-10 w-10 rounded-full object-cover border border-white/20" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-xs text-white/30 border border-white/10">
                            <Users size={16} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-brand-primarySoft/80 align-middle">{g.guestId}</td>
                      <td className="px-4 py-4 text-white font-medium align-middle">
                        <div className="group-hover:text-brand-primarySoft transition-colors flex items-center gap-2">
                          {g.name}
                          {showDuplicatesOnly && <span className="px-2 py-0.5 rounded text-2xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">DUPLIKAT</span>}
                        </div>
                        {g.notes && (
                          <div className="text-xs text-brand-warning/80 mt-1 px-2 py-1 bg-brand-warning/10 rounded border border-brand-warning/20 max-w-xs truncate">
                            {g.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-white/70 text-xs align-middle">
                        {g.email ? (
                          <span className="flex items-center gap-1">
                            <Mail size={12} className="text-brand-primary" />
                            <span>{g.email}</span>
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="flex flex-wrap gap-1">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cat.bg} ${cat.color} border ${cat.border}`}>
                            {cat.label}
                          </span>
                          {src && (g.registrationSource === 'WALKIN' || g.registrationSource === 'PUBLIC') && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${src.bg} ${src.color} border ${src.border}`}>
                              {src.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-white/90 align-middle">{g.tableLocation}</td>
                      <td className="px-4 py-4 text-white/60 align-middle font-mono text-xs">{g.company || '-'}</td>
                      <td className="px-4 py-4 text-white/60 align-middle font-mono text-xs">{g.division || '-'}</td>
                      <td className="px-4 py-4 text-white/60 align-middle font-mono text-xs">{g.department || '-'}</td>
                      <td className="px-4 py-4 text-white/50 text-xs align-middle font-mono">
                        {g.checkedInAt ? new Date(g.checkedInAt).toLocaleString('id-ID', { hour12: false }) : '-'}
                      </td>
                      {eventCfg?.enableSouvenir && (
                        <td className="px-4 py-4 align-middle text-center">
                          {g.souvenirTakes && g.souvenirTakes.length > 0 ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-brand-primary/20 text-brand-primary border border-brand-primary/30">
                                <Package size={12} />
                                {g.souvenirTakes.length}
                              </span>
                              <span className="text-2xs text-white/50 max-w-[100px] truncate" title={g.souvenirTakes.map(s => s.souvenir.name).join(', ')}>
                                {g.souvenirTakes.map(s => s.souvenir.name).join(', ')}
                              </span>
                            </div>
                          ) : g.souvenirTaken ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-brand-primary/20 text-brand-primary border border-brand-primary/30">
                              <Gift size={12} />
                              Ya
                            </span>
                          ) : (
                            <span className="text-white/30 text-xs">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-4 align-middle text-center">
                        {g.prizeWins && g.prizeWins.length > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            {g.prizeWins.map((pw, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${pw.collection
                                  ? 'bg-brand-success/20 text-brand-success border border-brand-success/30'
                                  : 'bg-brand-warning/20 text-brand-warning border border-brand-warning/30'
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
                      <td className="px-4 py-4 align-middle text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-mono uppercase tracking-widest ${g.checkedIn ? 'bg-brand-success/10 text-brand-success border border-brand-success/20' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                          {g.checkedIn ? 'CHECKED-IN' : 'BELUM'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button
                            title="Tampilkan QR"
                            className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                            onClick={() => setQrGuest(g)}
                          >
                            <QrCode size={18} />
                          </button>
                          <button
                            title={g.checkedIn ? "Sudah Check-in" : "Check-in Manual"}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${g.checkedIn ? 'text-brand-success/50 cursor-not-allowed' : 'text-brand-success hover:bg-brand-success/10 hover:text-brand-success'}`}
                            disabled={g.checkedIn || busyCheckinId === g.id}
                            onClick={() => markCheckedIn(g.id)}
                          >
                            <CheckCircle size={18} />
                          </button>
                          <a
                            title="Edit Tamu"
                            className="p-1.5 rounded-lg text-brand-primary hover:bg-brand-primary/10 hover:text-brand-primarySoft transition-colors"
                            href={`/admin/guests/${g.id}`}
                          >
                            <Edit size={18} />
                          </a>
                          {g.email && (
                            <button
                              title="Kirim Email Undangan"
                              className="p-1.5 rounded-lg text-brand-info hover:bg-cyan-400/10 hover:text-cyan-300 transition-colors"
                              onClick={() => openEmailModal([g.id])}
                            >
                              <Send size={18} />
                            </button>
                          )}
                          <button
                            title="Hapus Tamu"
                            className="p-1.5 rounded-lg text-brand-danger hover:bg-brand-danger/10 hover:text-brand-danger transition-colors disabled:opacity-50"
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
        </div>

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
            <div className="w-full max-w-md rounded-xl bg-brand-bgElevated border border-brand-border p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-4 text-lg font-bold text-white flex items-center gap-2">
                <Tag size={20} className="text-brand-primary" />
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
                          ? `${cfg.bg} ${cfg.border} ring-2 ring-brand-primary`
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
            <div className="w-full max-w-lg rounded-xl bg-brand-bgElevated border border-brand-border p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-4 text-lg font-bold text-white flex items-center gap-2">
                <Mail size={20} className="text-brand-primary" />
                Kirim Email Undangan
              </h3>

              <div className="mb-4 p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/20">
                <p className="text-sm text-brand-primarySoft">
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

              <div className="mb-4 p-3 rounded-lg bg-brand-warning/10 border border-brand-warning/20">
                <p className="text-sm text-brand-warning flex items-start gap-2">
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
