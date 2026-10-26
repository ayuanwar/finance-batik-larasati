import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-main': 'var(--color-bg-main)',
        'bg-canvas': 'var(--color-bg-canvas)',
        'bg-card': 'var(--color-bg-card)',
        'bg-card-subtle': 'var(--color-bg-card-subtle)',
        'text-main': 'var(--color-text-main)',
        'text-muted': 'var(--color-text-muted)',
        'border-accent': 'var(--color-border-accent)',
        'gold-accent': 'var(--color-gold)',
      },
    },
  },
  plugins: [],
};

export default config;
