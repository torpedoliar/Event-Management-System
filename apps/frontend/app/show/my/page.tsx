"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiBase, toApiUrl } from '../../../lib/api';
import { CheckCircle, Users, X, MapPin, Building2, Layers, Hash, Clock, Sparkles, Radio, User, LogIn } from 'lucide-react';

// Simple JWT decode function
function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

type EventConfig = {
  id: string;
  name: string;
  date?: string | null;
  location?: string | null;
  logoUrl?: string | null;
  backgroundType: 'NONE' | 'IMAGE' | 'VIDEO';
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  overlayOpacity: number;
  checkinPopupTimeoutMs?: number;
};

type Guest = {
  id: string;
  queueNumber: number;
  guestId: string;
  name: string;
  photoUrl?: string | null;
  tableLocation: string;
  company?: string | null;
  division?: string | null;
  notes?: string | null;
  checkedIn: boolean;
  checkedInAt?: string | null;
  checkedInById?: string | null;
  checkedInByName?: string | null;
};

import { useSSE } from '../../../lib/sse-context';

export default function MyShowPage() {
  const [cfg, setCfg] = useState<EventConfig | null>(null);
  const [preview, setPreview] = useState<Partial<EventConfig> | null>(null);
  const [selected, setSelected] = useState<Guest | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [adminInfo, setAdminInfo] = useState<{ id: string; name: string } | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<Guest[]>([]);
  const { addEventListener, removeEventListener, connected } = useSSE();

  useEffect(() => {
    fetch(`${apiBase()}/config/event`).then(async (r) => setCfg(await r.json()));
  }, []);

  // Get admin info from token
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      const decoded = decodeJwt(token);
      if (decoded) {
        setAdminInfo({
          id: decoded.sub,
          name: decoded.displayName || decoded.username || 'Admin'
        });
      } else {
        setAdminInfo(null);
      }
    }
  }, []);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onConfig = (e: MessageEvent) => {
      try { const data = JSON.parse((e as any).data); setCfg(data); } catch { }
    };
    const onPreview = (e: MessageEvent) => {
      try { const data = JSON.parse((e as any).data); setPreview(data || null); } catch { }
    };
    const onCheckin = (e: MessageEvent) => {
      try {
        const g = JSON.parse((e as any).data) as Guest;
        // Only show if checked in by this admin
        if (adminInfo && g.checkedInById === adminInfo.id) {
          setSelected(g);
          setRecentCheckins(prev => [g, ...prev.filter(x => x.id !== g.id)].slice(0, 10));
        }
      } catch { }
    };
    addEventListener('config', onConfig);
    addEventListener('preview', onPreview);
    addEventListener('checkin', onCheckin);
    return () => {
      removeEventListener('config', onConfig);
      removeEventListener('preview', onPreview);
      removeEventListener('checkin', onCheckin);
    };
  }, [adminInfo]);

  useEffect(() => {
    if (!selected) return;
    const ms = cfg?.checkinPopupTimeoutMs ?? 5000;
    const t = setTimeout(() => setSelected(null), ms);
    return () => clearTimeout(t);
  }, [selected, cfg?.checkinPopupTimeoutMs]);

  const effectiveOverlay = preview?.overlayOpacity ?? cfg?.overlayOpacity ?? 0.5;
  const effectiveType = (preview?.backgroundType as EventConfig['backgroundType'] | undefined) ?? cfg?.backgroundType;
  const effectiveImage = preview?.backgroundImageUrl ?? cfg?.backgroundImageUrl;
  const effectiveVideo = preview?.backgroundVideoUrl ?? cfg?.backgroundVideoUrl;
  const overlayStyle = useMemo(() => ({
    backgroundColor: `rgba(0,0,0,${effectiveOverlay})`,
  }), [effectiveOverlay]);

  // Not logged in
  if (!adminInfo) {
    return (
      <div className="min-h-screen bg-brand-secondary flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-brand-warning/20 flex items-center justify-center">
            <LogIn size={48} className="text-brand-warning" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Login Diperlukan</h1>
          <p className="text-white/60 mb-6">Silakan login terlebih dahulu untuk menggunakan My Display</p>
          <a
            href="/admin/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent text-brand-secondary font-semibold hover:shadow-lg hover:shadow-brand-primary/20 transition-all"
          >
            <LogIn size={20} />
            Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Header */}
      <div className="relative z-10 p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {cfg?.logoUrl ? (
              <img src={toApiUrl(cfg.logoUrl)} className="h-14 md:h-20 w-auto drop-shadow-2xl" alt="logo" />
            ) : (
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-2xl">
                <Users size={32} className="text-brand-secondary" />
              </div>
            )}
            <div className="text-white">
              <div className="text-3xl md:text-5xl font-bold text-shadow-lg text-glow">{cfg?.name || 'Event'}</div>
              {(cfg?.date || cfg?.location) && (
                <div className="text-base md:text-xl text-white/80 mt-1 flex items-center gap-3 text-shadow">
                  {cfg?.date && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={16} className="text-brand-primary" />
                      {new Date(cfg.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                  {cfg?.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={16} className="text-brand-accent" />
                      {cfg.location}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Admin info and clock */}
          <div className="hidden md:flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-warning/20 backdrop-blur-md border border-brand-warning/30">
              <User size={16} className="text-brand-warning" />
              <span className="text-brand-surface text-sm font-medium">{adminInfo.name}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-surface/10 backdrop-blur-md border border-brand-surface/20">
              <Radio size={16} className={`${connected ? 'text-brand-success pulse-live' : 'text-brand-danger'}`} />
              <span className="text-brand-surface/80 text-sm font-medium uppercase tracking-widest">{connected ? 'My Display' : 'Reconnecting...'}</span>
            </div>
            <div className="text-4xl font-bold text-white/90 font-mono text-shadow-lg">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 p-6 md:p-8">
        {!selected && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Waiting state */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-brand-warning/20 backdrop-blur-md border border-brand-warning/30 flex items-center justify-center float">
                  <User size={56} className="text-brand-warning" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white/80 text-shadow-lg mb-4">
                  Check-in Anda
                </h2>
                <p className="text-xl text-white/60 text-shadow">
                  Menunggu tamu yang Anda check-in...
                </p>
              </div>
            </div>

            {/* Recent check-ins by this admin */}
            {recentCheckins.length > 0 && (
              <div className="glass-card-dark p-6 overflow-hidden">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock size={20} className="text-brand-warning" />
                  Riwayat Check-in Anda
                </h3>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {recentCheckins.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-12 h-12 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
                        {g.photoUrl ? (
                          <img src={toApiUrl(g.photoUrl)} className="w-full h-full object-cover" alt={g.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Users size={20} className="text-white/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate">{g.name}</div>
                        <div className="text-sm text-white/50 flex items-center gap-2">
                          <span className="font-mono text-brand-primarySoft/70">{g.guestId}</span>
                          <span>•</span>
                          <span>{g.tableLocation}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-brand-success font-medium">#{g.queueNumber}</div>
                        {g.checkedInAt && (
                          <div className="text-xs text-white/40">
                            {new Date(g.checkedInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Display popup for checked-in guest */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setSelected(null)} />
          
          <div className="relative w-full max-w-6xl popup-success">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-warning via-brand-primary to-brand-accent rounded-3xl blur-lg opacity-50" />
            
            <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-brand-warning/20 bg-brand-secondary/95 text-brand-surface shadow-2xl grid grid-cols-1 md:grid-cols-[380px_1fr]">
              {/* Photo Section */}
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center min-h-[280px] md:min-h-full overflow-hidden">
                {selected.photoUrl ? (
                  <>
                    <img src={toApiUrl(selected.photoUrl)} alt={selected.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-slate-900/50" />
                  </>
                ) : (
                  <div className="text-white/30 p-8 flex flex-col items-center gap-4">
                    <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center">
                      <Users size={64} className="opacity-50" />
                    </div>
                    <span className="text-lg">No Photo</span>
                  </div>
                )}
                
                <div className="absolute top-4 left-4 md:bottom-4 md:top-auto">
                  <div className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30">
                    <div className="text-xs text-white/60 uppercase tracking-wider">Queue</div>
                    <div className="text-3xl font-bold text-white">{selected.queueNumber}</div>
                  </div>
                </div>
              </div>

              {/* Info Section */}
              <div className="p-6 md:p-10 space-y-6 relative overflow-y-auto max-h-[60vh] md:max-h-[80vh]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-warning/20 flex items-center justify-center border border-brand-warning/30">
                    <CheckCircle size={28} className="text-brand-warning" />
                  </div>
                  <div>
                    <div className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-warning text-xl md:text-2xl font-bold tracking-wider">ANDA CHECK-IN</div>
                    <div className="text-brand-surface/60 text-sm">
                      {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-brand-surface/50 uppercase tracking-wider font-medium flex items-center gap-2 mb-1">
                      <Hash size={14} className="text-brand-warning" />
                      Guest ID
                    </div>
                    <div className="text-xl md:text-2xl font-mono font-semibold text-brand-primarySoft">{selected.guestId}</div>
                  </div>

                  <div>
                    <div className="text-sm text-white/50 uppercase tracking-wider font-medium mb-2">Nama</div>
                    <div className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight text-glow">
                      {selected.name}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-brand-surface/5 border border-brand-border">
                      <div className="text-sm text-brand-surface/50 uppercase tracking-wider font-medium flex items-center gap-2 mb-1">
                        <MapPin size={14} className="text-brand-accent" />
                        Meja / Ruangan
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-brand-surface">{selected.tableLocation}</div>
                    </div>

                    {selected.company && (
                      <div className="p-4 rounded-xl bg-brand-surface/5 border border-brand-border">
                        <div className="text-sm text-brand-surface/50 uppercase tracking-wider font-medium flex items-center gap-2 mb-1">
                          <Building2 size={14} className="text-brand-primarySoft" />
                          Perusahaan
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-brand-surface">{selected.company}</div>
                      </div>
                    )}
                  </div>

                  {selected.division && (
                    <div className="p-4 rounded-xl bg-brand-surface/5 border border-brand-border">
                      <div className="text-sm text-brand-surface/50 uppercase tracking-wider font-medium flex items-center gap-2 mb-1">
                        <Layers size={14} className="text-brand-info" />
                        Divisi
                      </div>
                      <div className="text-xl md:text-2xl font-bold text-brand-surface">{selected.division}</div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/10">
                  <button
                    className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-base font-medium text-white hover:bg-white/20 transition-all duration-200 hover:scale-105"
                    onClick={() => setSelected(null)}
                  >
                    <X size={20} />
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
