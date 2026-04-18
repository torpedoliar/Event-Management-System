"use client";
import { useState, useEffect } from 'react';
import { apiBase, toApiUrl, parseErrorMessage } from '../../../lib/api';
import { useRouter } from 'next/navigation';
import Input from '../../../components/ui/Input';
import Label from '../../../components/ui/Label';
import Button from '../../../components/ui/Button';
import Link from 'next/link';
import { LogIn, Users, Loader2, Shield, Eye, EyeOff } from 'lucide-react';

type EventConfig = {
  name?: string;
  logoUrl?: string | null;
  backgroundType?: 'NONE' | 'IMAGE' | 'VIDEO';
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  overlayOpacity?: number;
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

  const bgType = eventCfg?.backgroundType;
  const bgImage = eventCfg?.backgroundImageUrl;
  const bgVideo = eventCfg?.backgroundVideoUrl;
  const overlayOpacity = eventCfg?.overlayOpacity ?? 0.6;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Dynamic Background */}
      {bgType === 'IMAGE' && bgImage && (
        <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${toApiUrl(bgImage)})` }} />
      )}
      {bgType === 'VIDEO' && bgVideo && (
        <video className="absolute inset-0 w-full h-full object-cover" src={toApiUrl(bgVideo)} muted loop autoPlay playsInline />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-secondary/90 via-[#1e1a30]/60 to-brand-secondary/90" style={{ opacity: overlayOpacity + 0.3 }} />

      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[50%] h-[50%] bg-brand-primary/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[50%] -right-[10%] w-[40%] h-[40%] bg-brand-accent/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-[20%] left-[30%] w-[35%] h-[35%] bg-brand-primarySoft/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand Header */}
        <div className="text-center mb-8">
          {eventCfg?.logoUrl ? (
            <img src={toApiUrl(eventCfg.logoUrl)} alt="Logo" className="h-16 mx-auto mb-4 drop-shadow-2xl" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center mx-auto mb-4 shadow-2xl">
              <Users size={40} className="text-brand-secondary" />
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-brand-surface text-shadow-lg mb-2 tracking-wide">
            {eventCfg?.name || 'Event Management System'}
          </h1>
          <p className="text-brand-surface/60 text-sm uppercase tracking-widest">Admin Panel</p>
        </div>

        {/* Login Card */}
        <div className="gradient-border">
          <form
            onSubmit={submit}
            className="glass-card-dark p-8 space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 mb-2">
                <Shield size={24} className="text-brand-primary" />
              </div>
              <h2 className="text-xl font-semibold text-brand-surface">Admin Login</h2>
              <p className="text-sm text-brand-surface/60">Masuk untuk mengelola event dan tamu</p>
            </div>

            {error && (
              <div className="bg-brand-danger/10 border border-brand-danger/30 rounded-xl p-4 text-center">
                <p className="text-sm text-brand-danger">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-brand-surface/80">Username</Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="Masukkan username"
                    className="pl-4 pr-4 py-3 bg-brand-surface/5 border-brand-border focus:border-brand-primary/50 rounded-xl text-brand-surface"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-brand-surface/80">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Masukkan password"
                    className="pl-4 pr-12 py-3 bg-brand-surface/5 border-brand-border focus:border-brand-primary/50 rounded-xl text-brand-surface"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-surface/40 hover:text-brand-surface/70 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent text-brand-secondary hover:opacity-90 shadow-lg hover:shadow-brand-primary/20 transition-all duration-300 hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Login
                </>
              )}
            </Button>

            <div className="pt-4 border-t border-brand-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-surface/50">Guest Registration System</span>
                <Link
                  href="/about"
                  className="text-brand-primary hover:text-brand-primarySoft transition-colors flex items-center gap-1"
                >
                  About
                </Link>
              </div>
            </div>
          </form>
        </div>

        {/* Quick Links */}
        <div className="mt-6 text-center">
          <Link
            href="/checkin"
            className="text-brand-surface/50 hover:text-brand-surface text-sm transition-colors"
          >
            ← Kembali ke halaman Check-in
          </Link>
        </div>
      </div>
    </div>
  );
}
