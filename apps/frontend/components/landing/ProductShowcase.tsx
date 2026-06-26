'use client';

import { motion, useReducedMotion } from 'motion/react';

interface ProductShowcaseProps {
  dashboardImage?: string;
}

export default function ProductShowcase({ dashboardImage }: ProductShowcaseProps) {
  const reduce = useReducedMotion();

  return (
    <section className="py-32 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Copy (centered) */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-display-sm font-heading text-brand-text mb-4">
            One system. Every event.
          </h2>
          <p className="text-body text-brand-textMuted max-w-[65ch] mx-auto">
            Corporate events, weddings, exhibitions, seminars. Configurable for any venue.
          </p>
        </motion.div>

        {/* Product image */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto"
        >
          <div className="aspect-[16/9] rounded-2xl shadow-panel overflow-hidden bg-brand-surface border border-brand-border">
            {dashboardImage ? (
              <img
                src={dashboardImage}
                alt="Dashboard overview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-body-sm text-brand-textDim">Dashboard overview</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
