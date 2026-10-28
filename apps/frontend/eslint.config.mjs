import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDirectory = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory });

/**
 * Konfigurasi ESLint frontend.
 *
 * Memakai preset Next.js (core-web-vitals) dengan beberapa aturan diturunkan
 * ke "warn". Alasannya: codebase ini belum pernah di-lint, dan aturan seperti
 * `exhaustive-deps` pada hook yang sudah berjalan lama akan membanjiri output
 * bila langsung dijadikan error. Menjadikannya warning membuat masalah tetap
 * terlihat tanpa memerahkan CI.
 */
export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/sw.js',
      'public/workbox-*.js',
      'next-env.d.ts',
      'tsconfig.tsbuildinfo',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // Banyak dipakai pada boundary API — bukan sinyal bug.
      '@typescript-eslint/no-explicit-any': 'off',

      // Berguna, tetapi pada hook lama akan langsung membanjiri output.
      'react-hooks/exhaustive-deps': 'warn',

      // Karakter kutip dan format diserahkan ke Prettier.
      'react/no-unescaped-entities': 'off',
    },
  },
];
