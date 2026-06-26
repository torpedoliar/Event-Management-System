"use client";
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { apiBase, toApiUrl } from '../lib/api';
import { useSSE } from '../lib/sse-context';

type EventConfig = {
  backgroundType: 'NONE' | 'IMAGE' | 'VIDEO';
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  overlayOpacity: number;
  logoUrl?: string | null;
};

export default function ThemeBackground() {
  const pathname = usePathname();
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

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<Partial<EventConfig> | null>;
      setOverride(ev.detail || null);
    };
    window.addEventListener('theme:preview', handler as any);
    return () => window.removeEventListener('theme:preview', handler as any);
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`${apiBase()}/config/event`);
        if (r.ok) setCfg(await r.json());
      } catch { }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const overlayOpacity = override?.overlayOpacity ?? cfg?.overlayOpacity ?? 0;
  const effectiveType = (override?.backgroundType as EventConfig['backgroundType'] | undefined) ?? cfg?.backgroundType;
  const effectiveImage = override?.backgroundImageUrl ?? cfg?.backgroundImageUrl;
  const effectiveVideo = override?.backgroundVideoUrl ?? cfg?.backgroundVideoUrl;

  const overlayStyle = useMemo(() => ({
    background: `linear-gradient(to bottom, rgba(9,9,11,${overlayOpacity}), rgba(9,9,11,${Math.min(overlayOpacity * 1.1, 1)}))`
  }), [overlayOpacity]);

  const hasTopNav = !(pathname?.startsWith('/show') || pathname === '/admin/login');
  const posClass = hasTopNav ? "top-[64px]" : "top-0";

  return (
    <div aria-hidden className="pointer-events-none">
      {(!effectiveType || effectiveType === 'NONE') && (
        <>
          <div className={`fixed inset-x-0 bottom-0 z-0 bg-brand-bg ${posClass}`} />
          <div className={`fixed inset-x-0 bottom-0 z-0 overflow-hidden opacity-70 ${posClass}`}>
            <div className="absolute -top-[20%] -right-[10%] w-[55%] h-[55%] bg-brand-primary/12 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '10s' }} />
            <div className="absolute top-[35%] -left-[10%] w-[45%] h-[45%] bg-brand-primary/8 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '14s' }} />
            <div className="absolute bottom-[0%] right-[20%] w-[35%] h-[35%] bg-brand-primary/6 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '18s' }} />
          </div>
          <div className={`fixed inset-x-0 bottom-0 z-0 opacity-[0.015] ${posClass}`} style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        </>
      )}

      {effectiveType === 'IMAGE' && effectiveImage && (
        <div className={`fixed inset-x-0 bottom-0 z-0 bg-no-repeat bg-cover bg-center ${posClass}`} style={{ backgroundImage: `url(${toApiUrl(effectiveImage)})` }} />
      )}
      {effectiveType === 'VIDEO' && effectiveVideo && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video className={`fixed inset-x-0 bottom-0 z-0 w-full h-full object-cover ${posClass}`} src={toApiUrl(effectiveVideo)} muted loop autoPlay playsInline />
      )}
      {(effectiveType === 'IMAGE' || effectiveType === 'VIDEO') && (
        <div className={`fixed inset-x-0 bottom-0 z-0 ${posClass}`} style={overlayStyle} />
      )}
    </div>
  );
}
