"use client";
import { useEffect, useMemo, useState } from 'react';
import { apiBase, toApiUrl } from '../lib/api';

type EventConfig = {
  backgroundType: 'NONE' | 'IMAGE' | 'VIDEO';
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  overlayOpacity: number;
  logoUrl?: string | null;
};

import { useSSE } from '../lib/sse-context';

export default function ThemeBackground() {
  const [cfg, setCfg] = useState<EventConfig | null>(null);
  const [override, setOverride] = useState<Partial<EventConfig> | null>(null);
  const { addEventListener, removeEventListener } = useSSE();

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${apiBase()}/config/event`);
        if (r.ok) setCfg(await r.json());
      } catch { }
    })();

    const onConfig = (e: MessageEvent) => {
      try { const data = JSON.parse((e as any).data); setCfg(data); } catch { }
    };
    const onPreview = (e: MessageEvent) => {
      try { const data = JSON.parse((e as any).data); setOverride(data || null); } catch { }
    };

    addEventListener('config', onConfig);
    addEventListener('preview', onPreview);

    return () => {
      removeEventListener('config', onConfig);
      removeEventListener('preview', onPreview);
    };
  }, [addEventListener, removeEventListener]);

  // Live preview override (e.g., from settings page)
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<Partial<EventConfig> | null>;
      setOverride(ev.detail || null);
    };
    window.addEventListener('theme:preview', handler as any);
    return () => window.removeEventListener('theme:preview', handler as any);
  }, []);

  const overlayOpacity = override?.overlayOpacity ?? cfg?.overlayOpacity ?? 0;
  const effectiveType = (override?.backgroundType as EventConfig['backgroundType'] | undefined) ?? cfg?.backgroundType;
  const effectiveImage = override?.backgroundImageUrl ?? cfg?.backgroundImageUrl;
  const effectiveVideo = override?.backgroundVideoUrl ?? cfg?.backgroundVideoUrl;
  const overlayStyle = useMemo(() => ({
    backgroundColor: `rgba(0,0,0,${overlayOpacity})`
  }), [overlayOpacity]);

  return (
    <div aria-hidden className="pointer-events-none">
      {/* Fallback & Decorative Orbs for luxury feel */}
      {(!effectiveType || effectiveType === 'NONE') && (
        <>
          <div className="fixed inset-0 z-0 bg-brand-secondary" />
          <div className="fixed inset-0 z-0 overflow-hidden opacity-60">
            <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-brand-primary/15 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] bg-brand-accent/15 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '10s' }} />
            <div className="absolute bottom-[0%] left-[30%] w-[40%] h-[40%] bg-brand-info/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
          </div>
        </>
      )}

      {effectiveType === 'IMAGE' && effectiveImage && (
        <div className="fixed inset-0 z-0 bg-top bg-cover" style={{ backgroundImage: `url(${toApiUrl(effectiveImage)})` }} />
      )}
      {effectiveType === 'VIDEO' && effectiveVideo && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video className="fixed inset-0 z-0 w-full h-full object-cover object-top" src={toApiUrl(effectiveVideo)} muted loop autoPlay playsInline />
      )}
      {(effectiveType === 'IMAGE' || effectiveType === 'VIDEO') && (
        <div className="fixed inset-0 z-0 bg-brand-secondary" style={overlayStyle} />
      )}
    </div>
  );
}
