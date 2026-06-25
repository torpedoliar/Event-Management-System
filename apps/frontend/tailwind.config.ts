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
          // Primary (gold heritage)
          primary: '#D4A853',
          primarySoft: '#F5ECD7',
          primaryGlow: 'rgba(212,168,83,0.25)',
          // Secondary & accent
          secondary: '#16162A',
          accent: '#E86A92',
          accentSoft: '#F9A8C4',
          // Vivid
          vivid: '#7C5CFC',
          vividSoft: '#B4A0FF',
          // Backgrounds
          bg: '#0B0B11',
          bgElevated: '#141420',
          bgSubtle: '#1C1C2E',
          // Surfaces
          surface: '#1E1E32',
          surfaceMuted: '#252540',
          surfaceBright: '#2A2A48',
          // Text
          text: '#F0EDF8',
          textMuted: '#9896B0',
          textDim: '#6B6888',
          // Semantic
          success: '#4ADE80',
          warning: '#FBBF24',
          danger: '#F87171',
          info: '#60A5FA',
          // Borders
          border: 'rgba(240,237,248,0.08)',
          borderHover: 'rgba(240,237,248,0.16)',
          borderActive: 'rgba(212,168,83,0.40)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        heading: ['var(--font-heading)', 'serif'],
      },
      borderRadius: {
        DEFAULT: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(0,0,0,0.24)',
        panel: '0 16px 40px rgba(0,0,0,0.32)',
        gold: '0 0 40px rgba(212,168,83,0.15)',
        accent: '0 0 40px rgba(232,106,146,0.15)',
        festive: '0 0 60px rgba(212,168,83,0.1), 0 0 30px rgba(232,106,146,0.1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        scaleIn: 'scaleIn 0.2s ease-out',
      },
      transitionDuration: {
        fast: '150ms',
        dramatic: '800ms',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        dramatic: 'cubic-bezier(0.87, 0, 0.13, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
