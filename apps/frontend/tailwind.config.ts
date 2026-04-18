import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#D4A853',      // Warm Gold
          primarySoft: '#F5ECD7',  // Pale Gold
          secondary: '#1A1A2E',    // Deep Charcoal
          accent: '#C67D5A',       // Rose Copper
          success: '#5B9A6F',      // Sage Green
          warning: '#E8A539',      // Amber
          danger: '#C0544E',       // Muted Crimson
          info: '#5B7FA5',         // Steel Blue
          surface: '#FAF7F2',      // Off-White
          surfaceMuted: '#F3EFE9', 
          border: '#3F3F56',       // Disesuaikan agar harmonis dengan charcoal
          text: '#1C1C28',         // Charcoal
          textMuted: '#6C6C77',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        soft: '0 12px 30px rgba(15,23,42,0.08)',
        card: '0 18px 45px rgba(15,23,42,0.12)',
        glass: '0 18px 45px rgba(15,23,42,0.25)',
      },
      transitionDuration: {
        fast: '150ms',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
