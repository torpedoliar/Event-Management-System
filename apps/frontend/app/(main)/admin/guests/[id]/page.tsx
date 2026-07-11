"use client";
import RequireAuth from '@/components/RequireAuth';
import { useEffect, useState } from 'react';
import { apiBase, toApiUrl, parseErrorMessage } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import WebcamCapture from '@/components/WebcamCapture';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Label from '@/components/ui/Label';
import Button from '@/components/ui/Button';

type GuestCategory = 'REGULAR' | 'VIP' | 'VVIP' | 'MEDIA' | 'SPONSOR' | 'SPEAKER' | 'ORGANIZER';

const CATEGORY_OPTIONS: { value: GuestCategory; label: string; color: string }[] = [
  { value: 'REGULAR', label: 'Regular', color: 'text-gray-300' },
  { value: 'VIP', label: 'VIP', color: 'text-brand-warning' },
  { value: 'VVIP', label: 'VVIP', color: 'text-brand-primary' },
  { value: 'MEDIA', label: 'Media', color: 'text-brand-info' },
  { value: 'SPONSOR', label: 'Sponsor', color: 'text-brand-success' },
  { value: 'SPEAKER', label: 'Speaker', color: 'text-rose-300' },
  { value: 'ORGANIZER', label: 'Organizer', color: 'text-cyan-300' },
];

interface Guest {
  id: string;
  queueNumber: number;
  guestId: string;
  name: string;
  email?: string | null;
  photoUrl?: string | null;
  tableLocation: string;
  company?: string | null;
  department?: string | null;
  division?: string | null;
  notes?: string | null;
  category: GuestCategory;
  checkedIn: boolean;
  checkedInAt?: string | null;
}

export default function EditGuestPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [guest, setGuest] = useState<Guest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${apiBase()}/guests/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .then(async (r) => setGuest(await r.json()))
      .catch((e) => setError(parseErrorMessage(e.message)));
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('guestId', guest!.guestId);
      fd.append('name', guest!.name);
      fd.append('tableLocation', guest!.tableLocation);
      if (guest!.email) fd.append('email', guest!.email);
      if (guest!.company) fd.append('company', guest!.company);
      if (guest!.department) fd.append('department', guest!.department);
      if (guest!.division) fd.append('division', guest!.division);
      if (guest!.notes) fd.append('notes', guest!.notes);
      if (guest!.category) fd.append('category', guest!.category);
      if (guest!.queueNumber) fd.append('queueNumber', String(guest!.queueNumber));
      if (typeof guest!.checkedIn === 'boolean') fd.append('checkedIn', String(guest!.checkedIn));
      if (guest!.checkedInAt) fd.append('checkedInAt', guest!.checkedInAt);
      if (photo) fd.append('photo', photo);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase()}/guests/${id}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      setMessage('Perubahan tersimpan.');
      // Optional: navigate back after short delay
      setTimeout(() => router.replace('/admin/guests'), 800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!guest) return <RequireAuth><div className="p-6 text-sm text-brand-textMuted">Loading...</div></RequireAuth>;

  return (
    <RequireAuth>
      <div className="min-h-screen p-6 md:p-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold text-brand-text text-shadow-lg">Edit Tamu</h1>
          {error && <div className="text-sm text-brand-danger">{error}</div>}
          {message && <div className="text-sm text-brand-primary">{message}</div>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {guest.photoUrl && (
              <div>
                <div className="mb-1 text-sm text-brand-textMuted">Foto Saat Ini</div>
                <img src={toApiUrl(guest.photoUrl)} alt={guest.name} className="h-32 w-32 rounded object-cover" />
              </div>
            )}
            {preview && (
              <div>
                <div className="mb-1 text-sm text-brand-textMuted">Foto Baru (Preview)</div>
                <img src={preview} alt="preview" className="h-32 w-32 rounded object-cover" />
              </div>
            )}
          </div>
          <Card variant="glass" className="surface-elevated">
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label className="mb-1" htmlFor="guest-id">Guest ID</Label>
                <Input
                  id="guest-id"
                  value={guest.guestId}
                  onChange={(e) => setGuest({ ...guest!, guestId: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1" htmlFor="queueNumber">Nomor Urut (Queue)</Label>
                <Input
                  id="queueNumber"
                  type="number"
                  min={1}
                  value={guest.queueNumber}
                  onChange={(e) => setGuest({ ...guest!, queueNumber: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="mb-1" htmlFor="name">Nama</Label>
                <Input
                  id="name"
                  value={guest.name}
                  onChange={(e) => setGuest({ ...guest!, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1" htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={guest.email || ''}
                  onChange={(e) => setGuest({ ...guest!, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label className="mb-1" htmlFor="tableLocation">Meja/Ruangan</Label>
                <Input
                  id="tableLocation"
                  value={guest.tableLocation}
                  onChange={(e) => setGuest({ ...guest!, tableLocation: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1" htmlFor="company">Perusahaan/Organisasi</Label>
                <Input
                  id="company"
                  value={guest.company || ''}
                  onChange={(e) => setGuest({ ...guest!, company: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1" htmlFor="department">Departemen</Label>
                <Input
                  id="department"
                  value={guest.department || ''}
                  onChange={(e) => setGuest({ ...guest!, department: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1" htmlFor="division">Divisi</Label>
                <Input
                  id="division"
                  value={guest.division || ''}
                  onChange={(e) => setGuest({ ...guest!, division: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1" htmlFor="category">Kategori</Label>
                <select
                  id="category"
                  value={guest.category || 'REGULAR'}
                  onChange={(e) => setGuest({ ...guest!, category: e.target.value as GuestCategory })}
                  className="w-full rounded-lg border border-brand-border bg-brand-surface/5 px-3 py-2 text-brand-text focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-brand-bgElevated text-brand-text">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1" htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={guest.notes || ''}
                  onChange={(e) => setGuest({ ...guest!, notes: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-brand-text">
                  <input
                    type="checkbox"
                    checked={guest.checkedIn}
                    onChange={(e) => setGuest({ ...guest!, checkedIn: e.target.checked })}
                  />
                  Sudah Check-in
                </label>
                <div>
                  <Label className="mb-1" htmlFor="checkedInAt">Waktu Check-in (ISO, opsional)</Label>
                  <Input
                    id="checkedInAt"
                    placeholder="YYYY-MM-DDTHH:mm:ss.sssZ"
                    value={guest.checkedInAt || ''}
                    onChange={(e) => setGuest({ ...guest!, checkedInAt: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1">Foto (opsional)</Label>
                <div className="p-4 border-2 border-dashed border-brand-primary/40 rounded-xl hover:border-brand-primary/60 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => { const f = e.target.files?.[0] || null; setPhoto(f); if (f) { const url = URL.createObjectURL(f); setPreview(url); } else { setPreview(null); } }}
                  />
                  <Button
                    type="button"
                    onClick={() => setWebcamOpen(true)}
                    variant="secondary"
                    size="sm"
                    className="ml-2"
                  >
                    Ambil via Webcam
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={saving}
                  size="md"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => router.back()}
                >
                  Batal
                </Button>
              </div>
            </form>
          </Card>
          <WebcamCapture open={webcamOpen} onClose={() => setWebcamOpen(false)} onCapture={(file) => { setPhoto(file); const url = URL.createObjectURL(file); setPreview(url); }} aspect="square" />
        </div>
      </div>
    </RequireAuth>
  );
}
