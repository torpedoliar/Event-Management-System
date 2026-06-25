"use client";
import { useState, useEffect } from 'react';
import { apiBase, toApiUrl, parseErrorMessage } from '../../../lib/api';
import { useRouter } from 'next/navigation';
import Input from '../../../components/ui/Input';
import Label from '../../../components/ui/Label';
import Button from '../../../components/ui/Button';
import Link from 'next/link';
import { LogIn, Users, Loader2, Eye, EyeOff } from 'lucide-react';

type EventConfig = {
  name?: string;
  logoUrl?: string | null;
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventCfg, setEventCfg] = useState<EventConfig | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`${apiBase()}/config/event`)
      .then(r => r.json())
      .then(data => setEventCfg(data))
      .catch(() => { });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      router.replace('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login gagal. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {eventCfg?.logoUrl ? (
            <img src={toApiUrl(eventCfg.logoUrl)} alt="Logo" className="h-16 mx-auto mb-4" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-border flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-brand-primary" />
            </div>
          )}
          <h1 className="text-2xl md:text-3xl font-semibold text-brand-text mb-1">
            {eventCfg?.name || 'Event Management System'}
          </h1>
          <p className="text-brand-textMuted text-sm">Admin Panel</p>
        </div>

        <div className="relative overflow-hidden bg-brand-surface/80 backdrop-blur-xl border border-white/10 rounded-xl p-6 md:p-8">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-primary via-brand-accent to-brand-vivid" />
          <form onSubmit={submit} className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-brand-text">Admin Login</h2>
              <p className="text-sm text-brand-textMuted">Masuk untuk mengelola event dan tamu</p>
            </div>

            {error && (
              <div className="bg-brand-danger/10 border border-brand-danger/30 rounded-xl p-4 text-center animate-[shake_0.5s]">
                <p className="text-sm text-brand-danger">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-brand-text">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="Masukkan username"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-brand-text">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Masukkan password"
                    className="pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-textMuted hover:text-brand-text transition-colors"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full hover:shadow-[0_0_20px_rgba(212,168,83,0.3)] transition-shadow" loading={loading}>
              {!loading && <LogIn size={20} />}
              {loading ? 'Logging in...' : 'Login'}
            </Button>

            <div className="pt-4 border-t border-brand-border flex items-center justify-between text-sm">
              <span className="text-brand-textMuted">Guest Registration System</span>
              <Link href="/about" className="text-brand-primary hover:text-brand-primarySoft transition-colors">
                About
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link href="/checkin" className="text-brand-textMuted hover:text-brand-text text-sm transition-colors">
            Kembali ke halaman Check-in
          </Link>
        </div>
      </div>
    </div>
  );
}
