/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          // warm near-black surfaces
          900: '#0a0a0a',
          800: '#121110',
          700: '#1a1817',
          600: '#23201e',
          500: '#2d2926',
        },
        bone: {
          // warm cream text
          50: '#f5ede1',
          100: '#ece1d0',
          200: '#d4c8b3',
          300: '#a89d89',
          400: '#7a7164',
        },
        // warm gold accent
        gold: {
          50: '#fbf2dc',
          100: '#f1e1b3',
          200: '#e7cd86',
          300: '#dcb760',
          400: '#d4a24c', // primary accent
          500: '#c08a32',
          600: '#9c6d24',
          700: '#6e4c19',
        },
        warn: {
          500: '#ff5a5a',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'ui-serif', 'Georgia', 'serif'],
        serif: ['"Cormorant Garamond"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      boxShadow: {
        'gold-glow': '0 0 32px -6px rgba(212, 162, 76, 0.55)',
        'gold-glow-sm': '0 0 18px -4px rgba(212, 162, 76, 0.45)',
      },
    },
  },
  plugins: [],
};
