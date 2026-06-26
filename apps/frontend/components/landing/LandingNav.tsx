import Link from 'next/link';
import { Users } from 'lucide-react';
import { MobileNav } from './MobileNav';

interface EventConfig {
  name?: string;
  logoUrl?: string;
}

interface LandingNavProps {
  eventConfig?: EventConfig | null;
}

function BrandMark({ logoUrl, eventName }: { logoUrl?: string; eventName?: string }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={eventName || 'Event logo'}
        className="h-8 w-auto object-contain"
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center">
        <Users className="w-4 h-4 text-brand-primary" />
      </div>
      <span className="text-body font-heading text-brand-text hidden sm:inline">
        {eventName || 'Event Management'}
      </span>
    </div>
  );
}

export default function LandingNav({ eventConfig }: LandingNavProps) {
  return (
    <>
      <header className="sticky top-0 z-40 bg-brand-bg/80 backdrop-blur-md border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand mark */}
            <Link href="/" className="flex items-center">
              <BrandMark logoUrl={eventConfig?.logoUrl} eventName={eventConfig?.name} />
            </Link>

            {/* Desktop: Navigation buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/show"
                className="text-brand-text border border-brand-border px-5 py-2.5 rounded-xl font-medium
                           hover:border-brand-borderHover transition-colors duration-fast
                           focus-visible:ring-2 focus-visible:ring-brand-primary/50"
              >
                Display
              </Link>
              <Link
                href="/admin/login"
                className="bg-brand-primary text-brand-bg px-5 py-2.5 rounded-xl font-medium
                           hover:bg-brand-primaryHover transition-colors duration-fast
                           focus-visible:ring-2 focus-visible:ring-brand-primary/50"
              >
                Login
              </Link>
            </div>

            {/* Mobile: Hamburger */}
            <MobileNav eventConfig={eventConfig} />
          </div>
        </div>
      </header>
    </>
  );
}
