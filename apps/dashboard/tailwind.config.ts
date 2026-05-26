import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#141416', // Deepest background (sidebars)
        surface: '#1c1c1e', // Main content background
        card: '#242426', // Engagement cards
        primary: '#765EEA', // Purple accent
        muted: '#8e8e93', // Muted text
        border: '#333336', // Subtle borders
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
