/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        // App design system: values come from CSS variables so light/dark themes switch at runtime
        ui: {
          bg: 'rgb(var(--ui-bg) / <alpha-value>)',
          panel: 'rgb(var(--ui-panel) / <alpha-value>)',
          raised: 'rgb(var(--ui-raised) / <alpha-value>)',
          sunken: 'rgb(var(--ui-sunken) / <alpha-value>)',
          border: 'rgb(var(--ui-border) / <alpha-value>)',
          text: 'rgb(var(--ui-text) / <alpha-value>)',
          muted: 'rgb(var(--ui-muted) / <alpha-value>)',
          subtle: 'rgb(var(--ui-subtle) / <alpha-value>)',
          accent: 'rgb(var(--ui-accent) / <alpha-value>)',
          'accent-soft': 'rgb(var(--ui-accent-soft) / <alpha-value>)',
          'accent-text': 'rgb(var(--ui-accent-text) / <alpha-value>)',
          danger: 'rgb(var(--ui-danger) / <alpha-value>)',
          success: 'rgb(var(--ui-success) / <alpha-value>)',
          warning: 'rgb(var(--ui-warning) / <alpha-value>)',
          bubble: 'rgb(var(--ui-bubble) / <alpha-value>)',
        },
        ink: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f472b6',
          400: '#ec4899',
          500: '#db2777',
          600: '#be185d',
          700: '#9d174d',
          800: '#831843',
          900: '#500724',
          950: '#2b0312',
        },
        accent: {
          DEFAULT: '#F43F5E',
          light: '#FB7185',
          dark: '#E11D48',
        },
        surface: {
          DEFAULT: '#141620',
          raised: '#1A1D2A',
          overlay: '#222636',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-dot': 'pulseDot 2s infinite',
        'message-in': 'messageIn 0.25s ease-out',
        'pop-in': 'popIn 0.16s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.2)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'translateY(4px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        messageIn: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
