'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Users } from 'lucide-react';

interface EventConfig {
  name?: string;
  logoUrl?: string;
}

interface MobileNavProps {
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

export function MobileNav({ eventConfig }: MobileNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden p-2 rounded-lg hover:bg-brand-surface transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6 text-brand-text" />
      </button>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-brand-bg/95 backdrop-blur-md lg:hidden">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between h-16 px-4 border-b border-brand-border">
              <BrandMark logoUrl={eventConfig?.logoUrl} eventName={eventConfig?.name} />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-brand-surface transition-colors"
                aria-label="Close menu"
              >
                <X className="w-6 h-6 text-brand-text" />
              </button>
            </div>
            <nav className="flex flex-col gap-2 p-4">
              <Link
                href="/show"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-left px-5 py-3 rounded-xl text-brand-text border border-brand-border hover:border-brand-borderHover transition-colors"
              >
                Display
              </Link>
              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center px-5 py-3 rounded-xl bg-brand-primary text-brand-bg font-medium hover:bg-brand-primaryHover transition-colors"
              >
                Login
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
