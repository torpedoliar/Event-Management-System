import type { DramaConfig } from './types';

/**
 * Tingkat "drama" animasi undian per kategori hadiah.
 *
 * HIBURAN dibuat singkat agar acara tetap berjalan cepat; UTAMA sengaja
 * diperlambat dan diberi efek layar untuk momen puncak.
 */
export const DRAMA_CONFIGS: Record<string, DramaConfig> = {
  HIBURAN: {
    spinDuration: 3000,
    tickerSpeedStart: 120,
    tickerSpeedMin: 80,
    slowdownStages: [300, 800],
    enableScreenFlash: false,
    enableDarkReveal: false,
    enableScreenShake: false,
    enableScanlines: false,
    buttonLabel: 'PUTAR UNDIAN',
    buttonExtraClass: '',
  },
  UTAMA: {
    spinDuration: 8000,
    tickerSpeedStart: 60,
    tickerSpeedMin: 40,
    slowdownStages: [100, 200, 400, 800, 2000],
    enableScreenFlash: true,
    enableDarkReveal: true,
    enableScreenShake: true,
    enableScanlines: true,
    buttonLabel: '◆ GRAND PRIZE ◆',
    buttonExtraClass: 'animate-grand-pulse ring-2 ring-brand-primary/50',
  },
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
