"use client";
import { useState, useEffect } from 'react';
import { apiBase, toApiUrl, parseErrorMessage } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { LogIn, Users, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import { useSSE } from '@/lib/sse-context';

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
  const { connect } = useSSE();

  useEffect(() => {
    // Redirect to dashboard if already logged in
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      router.replace('/admin/dashboard');
      return;
    }

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
      connect();
      router.replace('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login gagal. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4 py-12 relative">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          {eventCfg?.logoUrl ? (
            <img src={toApiUrl(eventCfg.logoUrl)} alt="Logo" className="h-16 mx-auto mb-5" />
          ) : (
            <div className="relative inline-flex mb-5">
              <div className="absolute inset-0 bg-brand-primary/20 rounded-2xl blur-xl" />
              <div className="relative w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center">
                <Users size={28} className="text-brand-primary" />
              </div>
            </div>
          )}
          <h1 className="text-display-sm text-brand-text mb-2 font-heading">
            {eventCfg?.name || 'Event Management'}
          </h1>
          <p className="text-brand-textMuted">Admin Panel</p>
        </div>

        <div className="bg-brand-surface/90 backdrop-blur-xl border border-brand-border rounded-2xl p-6 md:p-8 shadow-panel">
          <div className="text-center mb-8">
            <h2 className="text-heading-2 text-brand-text mb-1">Admin Login</h2>
            <p className="text-body-sm text-brand-textMuted">Masuk untuk mengelola event dan tamu</p>
          </div>

          {error && (
            <Alert variant="error" className="mb-6 animate-[shake_0.5s]">
              {error}
            </Alert>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
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
              <Label htmlFor="password">Password</Label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-textDim hover:text-brand-text transition-colors"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {!loading && <LogIn size={20} />}
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-8 pt-5 border-t border-brand-border flex items-center justify-between text-sm">
            <Link href="/checkin" className="inline-flex items-center gap-1.5 text-brand-textDim hover:text-brand-text transition-colors">
              <ArrowLeft size={14} />
              Kembali ke Check-in
            </Link>
            <Link href="/about" className="text-brand-primary hover:text-brand-primarySoft transition-colors">
              About
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-body-xs text-brand-textDim">
          Guest Registration System · Version 1.3.0
        </p>
      </div>
    </main>
  );
}
