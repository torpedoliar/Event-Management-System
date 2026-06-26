"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiBase, toApiUrl } from '@/lib/api';
import { CheckCircle, Users, X, MapPin, Building2, Layers, Hash, Clock, Radio } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';

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

import { useSSE } from '@/lib/sse-context';

export default function ShowPage() {
  const [cfg, setCfg] = useState<EventConfig | null>(null);
  const [preview, setPreview] = useState<Partial<EventConfig> | null>(null);
  const [selected, setSelected] = useState<Guest | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { addEventListener, removeEventListener, connected } = useSSE();

  useEffect(() => {
    fetch(`${apiBase()}/config/event`).then(async (r) => setCfg(await r.json()));
  }, []);

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
      try { const g = JSON.parse((e as any).data); setSelected(g); } catch { }
    };
    const onEventChange = () => {
      fetch(`${apiBase()}/config/event`).then(async (r) => { const data = await r.json(); setCfg(data); }).catch(() => { });
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
  }, [addEventListener, removeEventListener]);

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

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      {/* Background */}
      {effectiveType === 'IMAGE' && effectiveImage && (
        <img src={toApiUrl(effectiveImage)} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      {effectiveType === 'VIDEO' && effectiveVideo && (
        <video src={toApiUrl(effectiveVideo)} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0" style={overlayStyle} />

      {/* Header */}
      <div className="relative z-10 p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {cfg?.logoUrl ? (
              <img src={toApiUrl(cfg.logoUrl)} className="h-14 md:h-20 w-auto" alt="logo" />
            ) : (
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-brand-primary/10 border border-brand-border flex items-center justify-center">
                <Users size={32} className="text-brand-primary" />
              </div>
            )}
            <div>
              <div className="text-2xl md:text-4xl font-semibold text-brand-text">{cfg?.name || 'Event'}</div>
              {(cfg?.date || cfg?.location) && (
                <div className="text-sm md:text-base text-brand-textMuted mt-0.5 flex flex-wrap items-center gap-2">
                  {cfg?.date && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-brand-primary" />
                      {new Date(cfg.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                  {cfg?.date && cfg?.location && <span>•</span>}
                  {cfg?.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} />
                      {cfg.location}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:flex flex-col items-end gap-2">
            <StatusBadge status={connected ? 'success' : 'danger'} pulse={connected}>
              {connected ? 'Live Display' : 'Reconnecting...'}
            </StatusBadge>
            <div className="text-3xl font-semibold text-brand-primary font-mono">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Waiting state */}
      {!selected && (
        <div className="relative z-10 flex-1 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-brand-surface/50 border border-brand-border flex items-center justify-center">
              <Users size={40} className="text-brand-textMuted" />
            </div>
            <h2 className="text-2xl md:text-4xl font-semibold text-brand-text mb-2 gradient-text">Selamat Datang</h2>
            <p className="text-base md:text-lg text-brand-textMuted">Menunggu tamu check-in...</p>
          </div>
        </div>
      )}

      {/* Check-in card */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/80" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-brand-surface/80 backdrop-blur-xl border border-white/10 shadow-gold grid grid-cols-1 md:grid-cols-[360px_1fr]">
            <div className="relative bg-white/5 flex items-center justify-center min-h-[280px] md:min-h-full overflow-hidden">
              {selected.photoUrl ? (
                <>
                  <img src={toApiUrl(selected.photoUrl)} alt={selected.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/50" />
                </>
              ) : (
                <div className="text-brand-textDim p-8 flex flex-col items-center gap-3">
                  <Users size={48} />
                  <span>Tidak ada foto</span>
                </div>
              )}
              <div className="absolute top-4 left-4 md:bottom-4 md:top-auto">
                <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-primarySoft text-brand-bg border border-brand-primary/30">
                  <div className="text-xs uppercase tracking-wider opacity-80">Antrian</div>
                  <div className="text-2xl font-semibold">{selected.queueNumber}</div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-10 space-y-6 relative overflow-y-auto max-h-[60vh] md:max-h-[80vh]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-success/10 border border-brand-success/30 flex items-center justify-center">
                  <CheckCircle size={22} className="text-brand-success" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-brand-success">Check-in berhasil</div>
                  <div className="text-sm text-brand-textMuted">
                    {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="text-sm text-brand-textMuted uppercase tracking-wider flex items-center gap-2 mb-1">
                    <Hash size={14} className="text-brand-primary" />
                    ID Tamu
                  </div>
                  <div className="text-xl md:text-2xl font-mono text-brand-text">{selected.guestId}</div>
                </div>

                <div>
                  <div className="text-sm text-brand-textMuted uppercase tracking-wider mb-1">Nama</div>
                  <div className="text-3xl md:text-5xl font-heading font-semibold text-brand-text leading-tight text-glow-gold">{selected.name}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 surface">
                    <div className="text-sm text-brand-textMuted uppercase tracking-wider flex items-center gap-2 mb-1">
                      <MapPin size={14} />
                      Meja / Ruangan
                    </div>
                    <div className="text-xl md:text-2xl font-semibold text-brand-text">{selected.tableLocation}</div>
                  </div>
                  {selected.company && (
                    <div className="p-4 surface">
                      <div className="text-sm text-brand-textMuted uppercase tracking-wider flex items-center gap-2 mb-1">
                        <Building2 size={14} />
                        Perusahaan
                      </div>
                      <div className="text-xl md:text-2xl font-semibold text-brand-text">{selected.company}</div>
                    </div>
                  )}
                </div>

                {selected.division && (
                  <div className="p-4 surface">
                    <div className="text-sm text-brand-textMuted uppercase tracking-wider flex items-center gap-2 mb-1">
                      <Layers size={14} />
                      Divisi
                    </div>
                    <div className="text-xl md:text-2xl font-semibold text-brand-text">{selected.division}</div>
                  </div>
                )}

                {selected.notes && (
                  <div className="p-4 bg-brand-warning/10 border border-brand-warning/20 rounded-xl">
                    <div className="text-sm text-brand-warning uppercase tracking-wider mb-1">Catatan</div>
                    <div className="text-base text-brand-warning italic">"{selected.notes}"</div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-brand-border">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  <X size={18} />
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
