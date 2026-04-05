import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        saffron: { DEFAULT: '#E8A020', 50: '#FDF5E6', 500: '#E8A020', 600: '#C8881A' },
        'deep-green': { DEFAULT: '#1A6B3C', 500: '#1A6B3C', 600: '#155A32' },
      },
      fontFamily: { sans: ['Vazirmatn', 'Inter', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config
