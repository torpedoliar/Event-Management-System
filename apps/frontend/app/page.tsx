export const dynamic = 'force-dynamic';
export const revalidate = 0;

import LandingNav from '@/components/landing/LandingNav';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Gallery from '@/components/landing/Gallery';
import Footer from '@/components/landing/Footer';
import { apiFetch } from '@/lib/api';

interface EventConfig {
  name?: string;
  logoUrl?: string;
  enableTournament?: boolean;
  enableLuckyDraw?: boolean;
}

interface LandingPageData {
  hero: {
    headline: string;
    subtext: string;
    ctaPrimary: string;
    ctaSecondary: string;
    images: { url: string; alt?: string | null; intervalMs?: number }[];
  };
  features: {
    id: string;
    title: string;
    description: string;
    sortOrder: number;
    images: { url: string; alt?: string | null; intervalMs?: number }[];
  }[];
  featureSection?: {
    title: string;
    subtext: string;
  };
  gallery: {
    title: string;
    subtext: string;
    images: { url: string; alt?: string | null; caption?: string | null }[];
  };
  toggles: {
    showHero: boolean;
    showFeatures: boolean;
    showGallery: boolean;
    showFooter: boolean;
  };
}

async function getEventConfig(): Promise<EventConfig | null> {
  try {
    return await apiFetch<EventConfig>('/config/event');
  } catch {
    return null;
  }
}

async function getLandingPageData(): Promise<LandingPageData | null> {
  try {
    return await apiFetch<LandingPageData>('/public/landing-page');
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const [eventConfig, landingData] = await Promise.all([
    getEventConfig(),
    getLandingPageData(),
  ]);

  const toggles = landingData?.toggles ?? {
    showHero: true,
    showFeatures: true,
    showGallery: true,
    showFooter: true,
  };

  return (
    <div className="min-h-[100dvh] bg-brand-bg">
      <LandingNav eventConfig={eventConfig} />
      <main>
        {toggles.showHero && (
          <Hero
            headline={landingData?.hero.headline}
            subtext={landingData?.hero.subtext}
            ctaPrimary={landingData?.hero.ctaPrimary}
            ctaSecondary={landingData?.hero.ctaSecondary}
            images={landingData?.hero.images}
            compact={toggles.showFeatures || toggles.showGallery}
          />
        )}
        {toggles.showFeatures && landingData?.features && (
          <Features
            features={landingData.features}
            title={landingData.featureSection?.title}
            subtext={landingData.featureSection?.subtext}
            compact={toggles.showHero || toggles.showGallery}
          />
        )}
        {toggles.showGallery && landingData?.gallery && (
          <Gallery
            title={landingData.gallery.title}
            subtext={landingData.gallery.subtext}
            images={landingData.gallery.images}
            compact={toggles.showHero || toggles.showFeatures}
          />
        )}
      </main>
      {toggles.showFooter && (
        <Footer eventName={eventConfig?.name} logoUrl={eventConfig?.logoUrl} />
      )}
    </div>
  );
}

