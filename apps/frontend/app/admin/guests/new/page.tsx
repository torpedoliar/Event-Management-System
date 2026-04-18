"use client";
import RequireAuth from '../../../../components/RequireAuth';
import { useState } from 'react';
import { apiBase, apiFetch, parseErrorMessage } from '../../../../lib/api';
import { useRouter } from 'next/navigation';
import WebcamCapture from '../../../../components/WebcamCapture';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import Textarea from '../../../../components/ui/Textarea';
import Label from '../../../../components/ui/Label';
import Button from '../../../../components/ui/Button';

import { ArrowLeft, Camera, Loader2, Save, UserPlus } from 'lucide-react';

type GuestCategory = 'REGULAR' | 'VIP' | 'VVIP' | 'MEDIA' | 'SPONSOR' | 'SPEAKER' | 'ORGANIZER';

const CATEGORY_OPTIONS: { value: GuestCategory; label: string; color: string }[] = [
  { value: 'REGULAR', label: 'Regular', color: 'text-gray-300' },
  { value: 'VIP', label: 'VIP', color: 'text-brand-warning' },
  { value: 'VVIP', label: 'VVIP', color: 'text-brand-accent' },
  { value: 'MEDIA', label: 'Media', color: 'text-blue-300' },
  { value: 'SPONSOR', label: 'Sponsor', color: 'text-brand-success' },
  { value: 'SPEAKER', label: 'Speaker', color: 'text-rose-300' },
  { value: 'ORGANIZER', label: 'Organizer', color: 'text-cyan-300' },
];

export default function NewGuestPage() {
  const [guestId, setGuestId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tableLocation, setTableLocation] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [division, setDivision] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<GuestCategory>('REGULAR');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('guestId', guestId);
      fd.append('name', name);
      fd.append('tableLocation', tableLocation);
      if (email) fd.append('email', email);
      if (company) fd.append('company', company);
      if (department) fd.append('department', department);
      if (division) fd.append('division', division);
      if (notes) fd.append('notes', notes);
      fd.append('category', category);
      if (photo) fd.append('photo', photo);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase()}/guests`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      await res.json();
      setMessage('Tamu berhasil dibuat.');
      setTimeout(() => router.replace('/admin/guests'), 500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireAuth>
      <div className="min-h-screen p-6 md:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="secondary" size="sm" onClick={() => router.back()} className="rounded-full p-2 h-10 w-10 flex items-center justify-center">
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold text-white text-shadow-lg flex items-center gap-3">
              <UserPlus size={28} className="text-brand-primary" />
              Tambah Tamu
            </h1>
          </div>

          {error && <div className="text-sm text-brand-danger bg-brand-danger/10 p-3 rounded-lg border border-brand-danger/20">{error}</div>}
          {message && <div className="text-sm text-brand-accent bg-brand-primary/10 p-3 rounded-lg border border-brand-primary/20">{message}</div>}

          <Card variant="glass" className="p-6 md:p-8">
            <form onSubmit={submit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label className="mb-2" htmlFor="guest-id">Guest ID</Label>
                  <Input
                    id="guest-id"
                    value={guestId}
                    onChange={(e) => setGuestId(e.target.value)}
                    className="font-mono"
                    placeholder="e.g. G-1001"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="mb-2" htmlFor="name">Nama Lengkap</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama tamu..."
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="mb-2" htmlFor="email">Email (Opsional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label className="mb-2" htmlFor="tableLocation">Meja / Ruangan (Opsional)</Label>
                  <Input
                    id="tableLocation"
                    value={tableLocation}
                    onChange={(e) => setTableLocation(e.target.value)}
                    placeholder="Opsional..."
                  />
                </div>
                <div>
                  <Label className="mb-2" htmlFor="company">Perusahaan / Organisasi</Label>
                  <Input
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Opsional..."
                  />
                </div>
                <div>
                  <Label className="mb-2" htmlFor="department">Departemen (Opsional)</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Opsional..."
                  />
                </div>
                <div>
                  <Label className="mb-2" htmlFor="division">Divisi (Opsional)</Label>
                  <Input
                    id="division"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    placeholder="Opsional..."
                  />
                </div>
                <div>
                  <Label className="mb-2" htmlFor="category">Kategori</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as GuestCategory)}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-brand-secondary text-brand-surface">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label className="mb-2" htmlFor="notes">Catatan (Opsional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan tambahan tentang tamu..."
                    rows={3}
                    className="text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/10">
                <Label className="mb-1 block">Foto (opsional)</Label>
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-surface file:text-brand-text hover:file:bg-brand-surfaceMuted cursor-pointer"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null; setPhoto(f);
                          if (f) { const url = URL.createObjectURL(f); setPreview(url); } else { setPreview(null); }
                        }}
                      />
                      <span className="text-white/40 text-sm">atau</span>
                      <Button
                        type="button"
                        onClick={() => setWebcamOpen(true)}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Camera size={16} />
                        Webcam
                      </Button>
                    </div>
                  </div>

                  {preview && (
                    <div className="h-32 w-32 rounded-lg overflow-hidden border border-white/20 bg-black/20 flex-shrink-0">
                      <img src={preview} alt="preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => router.back()}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  size="md"
                  className="flex items-center gap-2 min-w-[120px] justify-center"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {saving ? 'Menyimpan...' : 'Simpan Tamu'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
        <WebcamCapture open={webcamOpen} onClose={() => setWebcamOpen(false)} onCapture={(file) => { setPhoto(file); const url = URL.createObjectURL(file); setPreview(url); }} aspect="square" />
      </div>
    </RequireAuth>
  );
}
