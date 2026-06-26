import LandingNav from '@/components/landing/LandingNav';
import Hero from '@/components/landing/Hero';
import TrustStrip from '@/components/landing/TrustStrip';
import Capabilities from '@/components/landing/Capabilities';
import ProductShowcase from '@/components/landing/ProductShowcase';
import Footer from '@/components/landing/Footer';
import { apiFetch } from '@/lib/api';

interface EventConfig {
  name?: string;
  logoUrl?: string;
}

async function getEventConfig(): Promise<EventConfig | null> {
  try {
    const config = await apiFetch<EventConfig>('/config/event');
    return config;
  } catch {
    return null;
  }
}

interface Logo {
  name: string;
  url: string;
}

async function getLogos(): Promise<Logo[]> {
  // In a real implementation, this would fetch from an API
  // For now, return empty array (TrustStrip will skip if no logos)
  return [];
}

export default async function LandingPage() {
  const [eventConfig, logos] = await Promise.all([
    getEventConfig(),
    getLogos(),
  ]);

  return (
    <div className="min-h-screen bg-brand-bg">
      <LandingNav eventConfig={eventConfig} />
      <main>
        <Hero />
        <TrustStrip logos={logos} />
        <Capabilities />
        <ProductShowcase />
      </main>
      <Footer />
    </div>
  );
}
