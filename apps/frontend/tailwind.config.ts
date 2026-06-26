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
          // Primary accent: refined heritage gold
          primary: '#D4A853',
          primaryHover: '#C49A4A',
          primarySoft: '#F5ECD7',
          primaryMuted: '#B8934A',
          primaryGlow: 'rgba(212,168,83,0.20)',
          // Neutral foundation
          bg: '#09090B',
          bgElevated: '#12121A',
          bgSubtle: '#1A1A24',
          // Surfaces
          surface: '#151520',
          surfaceMuted: '#1E1E2A',
          surfaceBright: '#272735',
          // Text
          text: '#FAFAF9',
          textMuted: '#A1A1AA',
          textDim: '#71717A',
          // Semantic
          success: '#4ADE80',
          warning: '#FBBF24',
          danger: '#F87171',
          info: '#60A5FA',
          // Borders
          border: 'rgba(255,255,255,0.06)',
          borderHover: 'rgba(255,255,255,0.12)',
          borderActive: 'rgba(212,168,83,0.40)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        heading: ['var(--font-heading)', 'serif'],
      },
      fontSize: {
        display: ['clamp(3rem, 8vw, 7rem)', { lineHeight: '0.95', letterSpacing: '-0.04em', fontWeight: '600' }],
        'display-sm': ['clamp(2.25rem, 5vw, 4rem)', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '600' }],
        'heading-1': ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'heading-2': ['clamp(1.25rem, 2vw, 1.75rem)', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-3': ['1.125rem', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['1rem', { lineHeight: '1.65' }],
        'body-sm': ['0.875rem', { lineHeight: '1.6' }],
        'body-xs': ['0.75rem', { lineHeight: '1.5' }],
        label: ['0.75rem', { lineHeight: '1.25', letterSpacing: '0.04em', fontWeight: '500' }],
      },
      borderRadius: {
        DEFAULT: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 4px 20px rgba(0,0,0,0.28)',
        panel: '0 24px 60px rgba(0,0,0,0.40)',
        gold: '0 0 40px rgba(212,168,83,0.12)',
        'gold-sm': '0 0 20px rgba(212,168,83,0.10)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        scaleIn: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        slideUp: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 2s infinite linear',
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        smooth: '300ms',
        dramatic: '800ms',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
