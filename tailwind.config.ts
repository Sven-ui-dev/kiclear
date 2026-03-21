import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:     { DEFAULT: '#0A0F1E', card: '#111827', card2: '#161D2F' },
        brand:  { green: '#00E5A0', 'green-dim': '#00B87D', amber: '#FFB800', red: '#FF4757' },
        navy:   { DEFAULT: '#0F2137', mid: '#1B3A5C' },
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
