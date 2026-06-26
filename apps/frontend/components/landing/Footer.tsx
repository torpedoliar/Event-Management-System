import Link from 'next/link';
import { Users } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="py-12 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Left: Brand mark (small) */}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center">
              <Users className="w-3 h-3 text-brand-primary" />
            </div>
            <span className="text-body-sm font-heading text-brand-text">
              Event Management
            </span>
          </div>

          {/* Center: Links */}
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
            <Link
              href="/about"
              className="text-body-sm text-brand-textMuted hover:text-brand-text transition-colors"
            >
              About
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
