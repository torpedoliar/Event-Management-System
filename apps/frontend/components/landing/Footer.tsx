import Link from 'next/link';
import { Users } from 'lucide-react';

interface FooterProps {
  eventName?: string;
  logoUrl?: string;
}

export default function Footer({ eventName, logoUrl }: FooterProps) {
  return (
    <footer className="py-12 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={eventName || 'Event logo'} className="h-6 w-auto object-contain" />
            ) : (
              <div className="w-6 h-6 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center">
                <Users className="w-3 h-3 text-brand-primary" />
              </div>
            )}
            <span className="text-body-sm font-heading text-brand-text">
              {eventName || 'Event Management'}
            </span>
          </div>

          <nav className="flex items-center gap-8">
            <Link
              href="/show"
              className="text-body-sm text-brand-textMuted hover:text-brand-text transition-colors"
            >
              Display
            </Link>
            <Link
              href="/admin/login"
              className="text-body-sm text-brand-textMuted hover:text-brand-text transition-colors"
            >
              Login
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
