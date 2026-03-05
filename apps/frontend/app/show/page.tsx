"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiBase, toApiUrl, parseErrorMessage } from '../../lib/api';
import { CheckCircle, Users, X, MapPin, Building2, Layers, Hash, Clock, Sparkles, Radio } from 'lucide-react';

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
};

import { useSSE } from '../../lib/sse-context';

export default function ShowPage() {
  const [cfg, setCfg] = useState<EventConfig | null>(null);
  const [preview, setPreview] = useState<Partial<EventConfig> | null>(null);
  const [guestId, setGuestId] = useState('');
  const [name, setName] = useState('');
  const [results, setResults] = useState<Guest[]>([]);
  const [selected, setSelected] = useState<Guest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { addEventListener, removeEventListener, connected } = useSSE();

  useEffect(() => {
    fetch(`${apiBase()}/config/event`).then(async (r) => setCfg(await r.json()));
  }, []);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Keep latest timeout in a ref for use inside SSE handler
  const timeoutMsRef = useRef<number>(5000);
  useEffect(() => { timeoutMsRef.current = cfg?.checkinPopupTimeoutMs ?? 5000; }, [cfg?.checkinPopupTimeoutMs]);

  useEffect(() => {
    const onConfig = (e: MessageEvent) => {
      try { const data = JSON.parse((e as any).data); setCfg(data); } catch { }
    };
    const onPreview = (e: MessageEvent) => {
      try { const data = JSON.parse((e as any).data); setPreview(data || null); } catch { }
    };
    const onCheckin = (e: MessageEvent) => {
      try {
        const g = JSON.parse((e as any).data);
        setSelected(g);
      } catch { }
    };
    const onEventChange = () => {
      // Reload config when active event changes
      fetch(`${apiBase()}/config/event`).then(async (r) => {
        const data = await r.json();
        setCfg(data);
      }).catch(() => { });
      setSelected(null);
    };
    addEventListener('config', onConfig);
    addEventListener('preview', onPreview);
    addEventListener('checkin', onCheckin);
    addEventListener('event_change', onEventChange);
    return () => {
      removeEventListener('config', onConfig);
      removeEventListener('preview', onPreview);
      removeEventListener('checkin', onCheckin);
      removeEventListener('event_change', onEventChange);
    };
  }, []);

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

  const doSearch = async () => {
    setError(null);
    setSelected(null);
    const params = new URLSearchParams();
    if (guestId) params.set('guestId', guestId);
    if (name) params.set('name', name);
    if (!guestId && !name) return;
    const res = await fetch(`${apiBase()}/public/guests/search?${params.toString()}`);
    if (!res.ok) {
      const errorText = await res.text();
      setError(parseErrorMessage(errorText));
      return;
    }
    const data = await res.json();
    setResults(data);
    setSelected(data[0] ?? null);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background */}
      {effectiveType === 'IMAGE' && effectiveImage && (
        <div className="absolute inset-0 bg-center bg-cover transition-all duration-1000" style={{ backgroundImage: `url(${toApiUrl(effectiveImage)})` }} />
      )}
      {effectiveType === 'VIDEO' && effectiveVideo && (
        <video className="absolute inset-0 w-full h-full object-cover" src={toApiUrl(effectiveVideo)} muted loop autoPlay playsInline />
      )}
      <div className="absolute inset-0 transition-all duration-500" style={overlayStyle} />

      {/* Header brand */}
      <div className="relative z-10 p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {cfg?.logoUrl ? (
              <img src={toApiUrl(cfg.logoUrl)} className="h-14 md:h-20 w-auto drop-shadow-2xl" alt="logo" />
            ) : (
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl">
                <Users size={32} className="text-white" />
              </div>
            )}
            <div className="text-white">
              <div className="text-3xl md:text-5xl font-bold text-shadow-lg text-glow">{cfg?.name || 'Event'}</div>
              {(cfg?.date || cfg?.location) && (
                <div className="text-base md:text-xl text-white/80 mt-1 flex items-center gap-3 text-shadow">
                  {cfg?.date && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={16} className="text-blue-400" />
                      {new Date(cfg.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                  {cfg?.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={16} className="text-pink-400" />
                      {cfg.location}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Live status and clock */}
          <div className="hidden md:flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
              <Radio size={16} className={`${connected ? 'text-emerald-400 pulse-live' : 'text-red-400'}`} />
              <span className="text-white/80 text-sm font-medium">{connected ? 'Live Display' : 'Reconnecting...'}</span>
            </div>
            <div className="text-4xl font-bold text-white/90 font-mono text-shadow-lg">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Waiting state - show when no guest selected */}
      {!selected && (
        <div className="relative z-10 flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center float">
              <Sparkles size={56} className="text-white/60" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white/80 text-shadow-lg mb-4">
              Selamat Datang
            </h2>
            <p className="text-xl text-white/60 text-shadow">
              Menunggu tamu check-in...
            </p>
          </div>
        </div>
      )}

      {/* Display card (driven by realtime check-in events) */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setSelected(null)} />

          {/* Card */}
          <div className="relative w-full max-w-6xl popup-success">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 rounded-3xl blur-lg opacity-50" />

            <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/20 bg-slate-900/95 text-white shadow-2xl grid grid-cols-1 md:grid-cols-[380px_1fr]">
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

                {/* Queue Badge */}
                <div className="absolute top-4 left-4 md:bottom-4 md:top-auto">
                  <div className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30">
                    <div className="text-xs text-white/60 uppercase tracking-wider">Queue</div>
                    <div className="text-3xl font-bold text-white">{selected.queueNumber}</div>
                  </div>
                </div>
              </div>

              {/* Info Section */}
              <div className="p-6 md:p-10 space-y-6 relative overflow-y-auto max-h-[60vh] md:max-h-[80vh]">
                {/* Success Header */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle size={28} className="text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-emerald-400 text-xl md:text-2xl font-bold">CHECK-IN BERHASIL</div>
                    <div className="text-white/60 text-sm">
                      {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Guest Info */}
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-white/50 uppercase tracking-wider font-medium flex items-center gap-2 mb-1">
                      <Hash size={14} />
                      Guest ID
                    </div>
                    <div className="text-xl md:text-2xl font-mono font-semibold text-blue-300">{selected.guestId}</div>
                  </div>

                  <div>
                    <div className="text-sm text-white/50 uppercase tracking-wider font-medium mb-2">Nama</div>
                    <div className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight text-glow">
                      {selected.name}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-sm text-white/50 uppercase tracking-wider font-medium flex items-center gap-2 mb-1">
                        <MapPin size={14} className="text-pink-400" />
                        Meja / Ruangan
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-white">{selected.tableLocation}</div>
                    </div>

                    {selected.company && (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-sm text-white/50 uppercase tracking-wider font-medium flex items-center gap-2 mb-1">
                          <Building2 size={14} className="text-blue-400" />
                          Perusahaan
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-white">{selected.company}</div>
                      </div>
                    )}
                  </div>

                  {selected.division && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-sm text-white/50 uppercase tracking-wider font-medium flex items-center gap-2 mb-1">
                        <Layers size={14} className="text-purple-400" />
                        Divisi
                      </div>
                      <div className="text-xl md:text-2xl font-bold text-white">{selected.division}</div>
                    </div>
                  )}

                  {selected.notes && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="text-sm text-amber-300/80 uppercase tracking-wider font-medium mb-2">Catatan</div>
                      <div className="text-lg text-amber-100 italic">"{selected.notes}"</div>
                    </div>
                  )}
                </div>

                {/* Close Button */}
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
