'use client';

import { motion, useReducedMotion } from 'motion/react';
import ImageCarousel from './ImageCarousel';

interface FeatureImage {
  url: string;
  alt?: string | null;
  intervalMs?: number;
}

interface Feature {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  images: FeatureImage[];
}

interface FeaturesProps {
  features: Feature[];
}

function FeatureItem({ feature, index }: { feature: Feature; index: number }) {
  const reduce = useReducedMotion();
  const isReversed = index % 2 === 1;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center ${
        isReversed ? 'lg:direction-rtl' : ''
      }`}
    >
      <div className={isReversed ? 'lg:order-2' : ''}>
        <h3 className="text-heading-lg font-heading text-brand-text mb-4">
          {feature.title}
        </h3>
        <p className="text-body text-brand-textMuted max-w-[60ch]">
          {feature.description}
        </p>
      </div>
      <div className={isReversed ? 'lg:order-1' : ''}>
        {feature.images.length > 0 ? (
          <ImageCarousel images={feature.images} />
        ) : (
          <div className="aspect-[4/3] rounded-2xl shadow-panel overflow-hidden bg-brand-surface border border-brand-border flex items-center justify-center">
            <span className="text-body-sm text-brand-textDim">Feature image</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function FeatureCentered({ feature }: { feature: Feature }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl mx-auto text-center"
    >
      <h3 className="text-heading-lg font-heading text-brand-text mb-4">
        {feature.title}
      </h3>
      <p className="text-body text-brand-textMuted max-w-[60ch] mx-auto mb-8">
        {feature.description}
      </p>
      {feature.images.length > 0 && (
        <div className="max-w-2xl mx-auto">
          <ImageCarousel images={feature.images} />
        </div>
      )}
    </motion.div>
  );
}

export default function Features({ features }: FeaturesProps) {
  if (features.length === 0) return null;

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        {features.map((feature, index) =>
          index < 2 ? (
            <FeatureItem key={feature.id} feature={feature} index={index} />
          ) : (
            <FeatureCentered key={feature.id} feature={feature} />
          ),
        )}
      </div>
    </section>
  );
}
