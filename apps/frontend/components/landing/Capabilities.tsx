'use client';

import { motion, useReducedMotion } from 'motion/react';

interface CapabilitiesProps {
  screenshots?: {
    checkin?: string;
    display?: string;
    guestManagement?: string;
    souvenirTracking?: string;
    analytics?: string;
  };
}

function CapabilityVisual({ image, label }: { image?: string; label: string }) {
  return (
    <div className="aspect-[4/3] rounded-xl shadow-soft overflow-hidden bg-brand-surface border border-brand-border">
      {image ? (
        <img src={image} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-body-sm text-brand-textDim">{label}</span>
        </div>
      )}
    </div>
  );
}

export default function Capabilities({ screenshots }: CapabilitiesProps) {
  const reduce = useReducedMotion();

  return (
    <>
      {/* Capability 1: Check-in (Left copy, Right visual) */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-heading-2 font-heading text-brand-text mb-4">
                Check-in that actually works
              </h2>
              <p className="text-body text-brand-textMuted max-w-[65ch]">
                QR scanning, manual search, duplicate prevention. Offline-capable stations that do not crash when the network does.
              </p>
            </motion.div>

            {/* Right: Visual */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <CapabilityVisual image={screenshots?.checkin} label="Check-in interface" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Capability 2: Display (Left visual, Right copy) */}
      <section className="py-24 border-t border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Visual */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <CapabilityVisual image={screenshots?.display} label="Display screen" />
            </motion.div>

            {/* Right: Copy */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-heading-2 font-heading text-brand-text mb-4">
                Display that commands attention
              </h2>
              <p className="text-body text-brand-textMuted max-w-[65ch]">
                Real-time animations, queue numbers, event branding. Multi-screen support for venues of any size.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Capability 3: Operations (Full-width centered with bento grid) */}
      <section className="py-24 border-t border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Headline (centered) */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-16"
          >
            <h2 className="text-heading-1 font-heading text-brand-text mb-4">
              Built for operations, not marketing
            </h2>
            <p className="text-body text-brand-textMuted max-w-[65ch] mx-auto">
              Guest management, souvenir tracking, prize draws, and analytics. Everything you need to run a serious event.
            </p>
          </motion.div>

          {/* Bento grid (3 cells) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cell 1: Guest management */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="aspect-[4/3] rounded-xl bg-brand-surface border border-brand-border overflow-hidden"
            >
              {screenshots?.guestManagement ? (
                <img src={screenshots.guestManagement} alt="Guest management" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-body-sm text-brand-textDim">Guest management</span>
                </div>
              )}
            </motion.div>

            {/* Cell 2: Souvenir tracking */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="aspect-[4/3] rounded-xl bg-brand-surface border border-brand-border overflow-hidden"
            >
              {screenshots?.souvenirTracking ? (
                <img src={screenshots.souvenirTracking} alt="Souvenir tracking" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-body-sm text-brand-textDim">Souvenir tracking</span>
                </div>
              )}
            </motion.div>

            {/* Cell 3: Analytics */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="aspect-[4/3] rounded-xl bg-brand-surface border border-brand-border overflow-hidden"
            >
              {screenshots?.analytics ? (
                <img src={screenshots.analytics} alt="Analytics" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-body-sm text-brand-textDim">Analytics</span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
