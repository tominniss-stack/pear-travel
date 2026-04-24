import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    'bg-panel-surface',
    'bg-panel-surface-dark',
    'bg-panel-elevated',
    'bg-panel-elevated-dark',
    'bg-panel-border',
    'border-panel-border',
    'border-panel-border-dark',
    'text-panel-text-primary',
    'text-panel-text-secondary',
    'text-panel-text-inverse',
    'hover:bg-panel-border',
    'hover:bg-panel-border-dark',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0f7f3',
          100: '#dceee4',
          200: '#bbdecb',
          300: '#8fc6a9',
          400: '#5fa882',
          500: '#3d8f65',  // Primary Pear Green
          600: '#2d7350',  // Action Green
          700: '#245f42',
          800: '#1e4d36',
          900: '#1a3f2d',
          950: '#0d2018',
        },
        panel: {
          surface: {
            DEFAULT: '#FFFFFF',
            dark:    '#1C1C1E',
          },
          elevated: {
            DEFAULT: '#FFFFFF',
            dark:    '#2C2C2E',
          },
          border: {
            DEFAULT: '#E5E5EA',
            dark:    '#38383A',
          },
          text: {
            primary:   '#1C1C1E',
            secondary: '#6E6E73',
            inverse:   '#FFFFFF',
          },
        },
      },
      animation: {
        'fade-in':          'fadeIn 0.4s ease-in-out',
        'slide-up':         'slideUp 0.4s ease-out',
        'slide-right':      'slideInRight 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in-backdrop': 'fadeInBackdrop 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeInBackdrop: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};

export default config;