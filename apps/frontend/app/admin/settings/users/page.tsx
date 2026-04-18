"use client";

import RequireAuth from '../../../../components/RequireAuth';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import Button from '../../../../components/ui/Button';
import Label from '../../../../components/ui/Label';
import Link from 'next/link';
import { 
  ArrowLeft, Users, UserPlus, Pencil, Trash2, Save, X, 
  Loader2, Check, Shield, Eye, EyeOff, UserCog, Radio 
} from 'lucide-react';
import { useSSE } from '../../../../lib/sse-context';

type AdminUser = {
  id: string;
  username: string;
  displayName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function UsersManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { connected } = useSSE();

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    isActive: true,
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<AdminUser[]>('/users');
      setUsers(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.username || !formData.password) {
      setError('Username dan password wajib diisi');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await apiFetch('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          displayName: formData.displayName || formData.username,
        }),
      });
      setShowAddForm(false);
      setFormData({ username: '', password: '', displayName: '', isActive: true });
      fetchUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to add user');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      setSaving(true);
      setError(null);
      const updateData: any = {
        displayName: formData.displayName,
        isActive: formData.isActive,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      await apiFetch(`/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      setEditingId(null);
      setFormData({ username: '', password: '', displayName: '', isActive: true });
      fetchUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Hapus user "${username}"?`)) return;
    try {
      setError(null);
      await apiFetch(`/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to delete user');
    }
  };

  const startEdit = (user: AdminUser) => {
    setEditingId(user.id);
    setFormData({
      username: user.username,
      password: '',
      displayName: user.displayName || '',
      isActive: user.isActive,
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ username: '', password: '', displayName: '', isActive: true });
  };

  return (
    <RequireAuth>
      <div className="min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/settings/event"
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 border border-white/10"
              >
                <ArrowLeft size={20} />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-lg">
                  <UserCog size={24} className="text-brand-secondary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-brand-surface">User Management</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Radio size={12} className={`${connected ? 'text-brand-success pulse-live' : 'text-brand-danger'}`} />
                    <span className="text-sm text-brand-surface/60">Kelola akun admin</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ username: '', password: '', displayName: '', isActive: true }); }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent px-5 py-2.5 text-sm font-semibold text-brand-secondary shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
            >
              <UserPlus size={18} />
              Tambah User
            </button>
          </div>

          {error && (
            <div className="bg-brand-danger/10 border border-brand-danger/30 rounded-xl p-4 text-brand-danger text-sm">
              {error}
            </div>
          )}

          {/* Add User Form */}
          {showAddForm && (
            <Card variant="glass" className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <UserPlus size={20} className="text-brand-primary" />
                Tambah User Baru
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/80">Username</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="username"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-white/80">Display Name</Label>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Nama tampilan (opsional)"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-white/80">Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-brand-success to-brand-success/80 text-brand-secondary font-medium disabled:opacity-50"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Simpan
                </button>
              </div>
            </Card>
          )}

          {/* Users List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={40} className="animate-spin text-brand-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <Card key={user.id} variant="glass" className="p-4">
                  {editingId === user.id ? (
                    // Edit mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-white/80">Username</Label>
                          <Input
                            value={formData.username}
                            disabled
                            className="mt-1 opacity-60"
                          />
                        </div>
                        <div>
                          <Label className="text-white/80">Display Name</Label>
                          <Input
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            placeholder="Nama tampilan"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-white/80">Password Baru (kosongkan jika tidak diubah)</Label>
                          <div className="relative mt-1">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              placeholder="Password baru"
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pt-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.isActive}
                              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                              className="w-5 h-5 rounded border-white/30 bg-white/10 text-blue-500"
                            />
                            <span className="text-white/80">Aktif</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 transition-colors"
                        >
                          <X size={18} />
                        </button>
                        <button
                          onClick={() => handleUpdate(user.id)}
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-brand-success to-brand-success/80 text-brand-secondary font-medium disabled:opacity-50"
                        >
                          {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                          Update
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${user.isActive ? 'bg-brand-success/20' : 'bg-brand-danger/20'}`}>
                          <Shield size={24} className={user.isActive ? 'text-brand-success' : 'text-brand-danger'} />
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            {user.displayName || user.username}
                            {!user.isActive && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-danger/20 text-brand-danger border border-brand-danger/30">
                                Nonaktif
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-white/50">@{user.username}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(user)}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.username)}
                          className="p-2 rounded-lg bg-brand-danger/10 hover:bg-brand-danger/20 text-brand-danger hover:opacity-80 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}

              {users.length === 0 && (
                <div className="text-center py-12 text-white/50">
                  <Users size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Belum ada user</p>
                </div>
              )}
            </div>
          )}

          {/* Info Card */}
          <Card variant="glass" className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-brand-primary/20">
                <Shield size={20} className="text-brand-primary" />
              </div>
              <div className="text-sm text-white/60">
                <p className="font-medium text-white/80 mb-1">Tentang User Management</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Display Name</strong> akan ditampilkan saat melakukan check-in tamu</li>
                  <li>User yang <strong>Nonaktif</strong> tidak dapat login ke sistem</li>
                  <li>Data check-in akan mencatat user yang melakukan check-in</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </RequireAuth>
  );
}
