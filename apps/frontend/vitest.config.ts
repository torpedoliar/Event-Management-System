import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Konfigurasi tes frontend.
 *
 * Dua jenis tes:
 *   1. Logika murni (parsing QR, aturan pencarian).
 *   2. Komponen hasil ekstraksi — memakai jsdom + React Testing Library,
 *      sebagai jaring pengaman saat memecah halaman monolitik.
 */
export default defineConfig({
  esbuild: {
    // tsconfig memakai `jsx: preserve` untuk Next.js; esbuild perlu diarahkan
    // ke transform otomatis agar komponen dapat dirender di tes.
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.spec.ts', '**/*.spec.tsx'],
    exclude: ['node_modules/**', '.next/**', 'public/**'],
  },
});
