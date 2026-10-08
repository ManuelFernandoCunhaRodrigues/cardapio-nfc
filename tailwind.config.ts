import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17110D',
        brand: '#E65F2A',
        cream: '#FAF7EF',
        sand: '#F0E9D8',
        'sand-dark': '#EDDFC1',
        border: '#E0D6BC',
        'surface-inner': '#F5F0E5',
        'border-inner': '#E8E0CF',
        positive: '#B84C1F',
        danger: '#B35B37',
        amber: '#F9A436',
        muted: '#6B5F4A',
        body: '#3D3527',
        placeholder: '#8B7E67',
      },
      borderRadius: { card: '1.25rem', product: '1rem' },
      boxShadow: {
        card: '0 2px 8px rgba(23, 17, 13, 0.06)',
        brand: '0 4px 12px rgba(230, 95, 42, 0.35)',
      },
      fontFamily: { display: ['var(--font-poppins)'], sans: ['var(--font-nunito)'] },
    },
  },
  plugins: [],
};

export default config;
