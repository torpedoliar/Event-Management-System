'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface CarouselImage {
  url: string;
  alt?: string | null;
  intervalMs?: number;
}

interface ImageCarouselProps {
  images: CarouselImage[];
  aspectRatio?: string;
  priority?: boolean;
  className?: string;
}

export default function ImageCarousel({
  images,
  aspectRatio = 'aspect-[4/3]',
  priority = false,
  className = '',
}: ImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reduce = useReducedMotion();

  const currentImage = images[index];
  const interval = currentImage?.intervalMs ?? 5000;

  useEffect(() => {
    if (reduce || images.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, Math.max(interval, 3000));
    return () => clearInterval(timer);
  }, [images.length, interval, reduce, isPaused]);

  if (images.length === 0) {
    return (
      <div className={`${aspectRatio} rounded-2xl shadow-panel overflow-hidden bg-brand-surface border border-brand-border flex items-center justify-center ${className}`}>
        <span className="text-body-sm text-brand-textDim">No images</span>
      </div>
    );
  }

  return (
    <div
      className={`relative ${aspectRatio} rounded-2xl shadow-panel overflow-hidden ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={index}
          src={currentImage.url}
          alt={currentImage.alt || ''}
          className="w-full h-full object-cover"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.3 }}
          loading={priority ? 'eager' : 'lazy'}
        />
      </AnimatePresence>

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === index ? 'bg-white w-6' : 'bg-white/50'
              }`}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
