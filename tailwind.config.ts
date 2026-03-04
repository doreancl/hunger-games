import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--border)',
        ring: 'var(--accent)',
        background: 'var(--bg)',
        foreground: 'var(--ink)',
        primary: {
          DEFAULT: 'var(--cta-a)',
          foreground: 'var(--cta-ink)'
        },
        secondary: {
          DEFAULT: 'var(--panel-strong)',
          foreground: 'var(--ink)'
        },
        card: {
          DEFAULT: 'var(--panel)',
          foreground: 'var(--ink)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--cta-ink)'
        },
        muted: {
          DEFAULT: 'var(--panel-strong)',
          foreground: 'var(--muted)'
        }
      }
    }
  },
  plugins: []
};

export default config;
