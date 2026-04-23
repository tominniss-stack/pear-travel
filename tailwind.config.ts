import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // Critical for our theme switcher
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // App Core & Editorial Theme
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        editorial: ['var(--font-editorial)', '"Georgia"', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        // Notebook Theme
        handwriting: ['var(--font-caveat)', 'cursive'],
        typewriter: ['var(--font-special-elite)', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669', // Pear Emerald
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },

        // Control Panel Design System
        panel: {
          surface: {
            DEFAULT: '#FFFFFF',
            dark: '#1C1C1E',
          },
          elevated: {
            DEFAULT: '#FFFFFF',
            dark: '#2C2C2E',
          },
          border: {
            DEFAULT: '#E5E5EA',
            dark: '#38383A',
          },
          brand: {
            DEFAULT: '#4A7C59',
            hover: '#3D6B4A',
          },
          text: {
            primary: '#1C1C1E',   // Dark charcoal for light mode body text
            secondary: '#6E6E73', // Muted grey for labels and hints
            inverse: '#FFFFFF',   // White text on dark surfaces
          }
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-right': 'slideInRight 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
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