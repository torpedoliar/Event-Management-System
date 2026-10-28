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
  compact?: boolean;
}

export default function Hero({
  headline = 'Check-in tamu, undian, dan souvenir dalam satu sistem.',
  subtext = 'Dirancang untuk acara yang berjalan cepat: kiosk yang tetap bekerja saat jaringan putus, panggung undian yang berkesan, dan data yang bisa dipercaya saat acara berlangsung.',
  ctaPrimary = 'Lihat layar panggung',
  ctaSecondary = 'Masuk admin',
  images = [],
  compact = false,
}: HeroProps) {
  const reduce = useReducedMotion();

  return (
    <section className={`land-hero ${compact ? 'pt-24 pb-10' : 'pt-28 pb-16 min-h-[100dvh]'}`}>
      <div className="land-hero-inner">
        <div className="land-hero-grid">
          <motion.div
            className="land-hero-copy"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="land-hero-title">{headline}</h1>
            <p className="land-hero-sub">{subtext}</p>

            <div className="land-hero-actions">
              <Link href="/show" className="land-btn is-primary">
                {ctaPrimary}
              </Link>
              <Link href="/admin/login" className="land-btn is-quiet">
                {ctaSecondary}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            {images.length > 0 ? (
              <div className="land-hero-media">
                <ImageCarousel images={images} priority />
              </div>
            ) : (
              <div className="land-hero-media land-hero-placeholder">
                Pratinjau layar panggung
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
