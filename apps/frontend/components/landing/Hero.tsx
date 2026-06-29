'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import ImageCarousel from './ImageCarousel';

interface HeroImage {
  url: string;
  alt?: string | null;
  intervalMs?: number;
}

interface HeroProps {
  headline?: string;
  subtext?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
  images?: HeroImage[];
}

export default function Hero({
  headline = 'Enterprise event management, without the noise.',
  subtext = 'Check-in, display, and analytics in one system. Built for operations teams.',
  ctaPrimary = 'Open Display',
  ctaSecondary = 'Admin Login',
  images = [],
}: HeroProps) {
  const reduce = useReducedMotion();

  return (
    <section className="min-h-[100dvh] pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 lg:gap-16 items-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            <h1 className="text-display-sm font-heading text-brand-text line-clamp-2">
              {headline}
            </h1>

            <p className="text-body text-brand-textMuted max-w-[65ch]">
              {subtext}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/show"
                className="inline-flex items-center justify-center bg-brand-primary text-brand-bg px-6 py-3 rounded-xl font-medium
                           hover:bg-brand-primaryHover transition-colors duration-fast
                           focus-visible:ring-2 focus-visible:ring-brand-primary/50"
              >
                {ctaPrimary}
              </Link>
              <Link
                href="/admin/login"
                className="inline-flex items-center justify-center text-brand-text border border-brand-border px-6 py-3 rounded-xl font-medium
                           hover:border-brand-borderHover transition-colors duration-fast
                           focus-visible:ring-2 focus-visible:ring-brand-primary/50"
              >
                {ctaSecondary}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {images.length > 0 ? (
              <ImageCarousel images={images} priority />
            ) : (
              <div className="aspect-[4/3] rounded-2xl shadow-panel overflow-hidden bg-brand-surface border border-brand-border flex items-center justify-center">
                <span className="text-body-sm text-brand-textDim">Product preview</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
