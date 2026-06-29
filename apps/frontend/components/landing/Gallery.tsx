'use client';

import { motion, useReducedMotion } from 'motion/react';

interface GalleryImage {
  url: string;
  alt?: string | null;
  caption?: string | null;
}

interface GalleryProps {
  title?: string;
  subtext?: string;
  images: GalleryImage[];
}

export default function Gallery({
  title = 'Past Events',
  subtext = 'Moments from events we have powered.',
  images,
}: GalleryProps) {
  const reduce = useReducedMotion();

  if (images.length === 0) return null;

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-heading-xl font-heading text-brand-text mb-4">
            {title}
          </h2>
          <p className="text-body text-brand-textMuted max-w-[60ch] mx-auto">
            {subtext}
          </p>
        </motion.div>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          {images.map((image, index) => (
            <motion.div
              key={index}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="break-inside-avoid group"
            >
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={image.url}
                  alt={image.alt || ''}
                  className={`w-full object-cover transition-transform duration-300 ${
                    reduce ? '' : 'group-hover:scale-[1.02]'
                  }`}
                  style={{ aspectRatio: index % 3 === 0 ? '4/3' : index % 3 === 1 ? '1/1' : '3/4' }}
                  loading="lazy"
                />
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-sm text-white">{image.caption}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
