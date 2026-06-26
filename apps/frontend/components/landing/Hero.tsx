'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';

interface HeroProps {
  productImage?: string;
}

export default function Hero({ productImage }: HeroProps) {
  const reduce = useReducedMotion();

  return (
    <section className="min-h-[100dvh] pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {/* Headline */}
            <h1 className="text-display-sm font-heading text-brand-text">
              Enterprise event management, without the noise.
            </h1>

            {/* Subtext */}
            <p className="text-body text-brand-textMuted max-w-[65ch]">
              Check-in, display, and analytics in one system. Built for operations teams.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/show"
                className="inline-flex items-center justify-center bg-brand-primary text-brand-bg px-6 py-3 rounded-xl font-medium
                           hover:bg-brand-primaryHover transition-colors duration-fast
                           focus-visible:ring-2 focus-visible:ring-brand-primary/50"
              >
                Open Display
              </Link>
              <Link
                href="/admin/login"
                className="inline-flex items-center justify-center text-brand-text border border-brand-border px-6 py-3 rounded-xl font-medium
                           hover:border-brand-borderHover transition-colors duration-fast
                           focus-visible:ring-2 focus-visible:ring-brand-primary/50"
              >
                Admin Login
              </Link>
            </div>
          </motion.div>

          {/* Right: Product Preview */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl shadow-panel overflow-hidden">
                {productImage ? (
                  <img
                    src={productImage}
                    alt="Event management dashboard"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-brand-surface border border-brand-border flex items-center justify-center">
                    <span className="text-body-sm text-brand-textDim">Product preview</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
