/** @type {import('tailwindcss').Config} */

// PaisaPath design tokens. `purple` is the brand "iris" and `teal` is the growth "mint",
// so every existing purple/teal usage picks up the brand palette.
const iris = {
  50: '#F3F1FF', 100: '#E7E3FF', 200: '#D0C8FF', 300: '#B0A2FF', 400: '#8D78FF',
  500: '#6D55FA', 600: '#5B3FEA', 700: '#4A30C9', 800: '#3C28A1', 900: '#2F2380', 950: '#1C1550',
};
const mint = {
  50: '#EBFCF6', 100: '#CFF7E8', 200: '#A2EDD4', 300: '#67DDBB', 400: '#2EC79E',
  500: '#12AD86', 600: '#087A60', 700: '#0B6F59', 800: '#0D5848', 900: '#0D493D', 950: '#032A23',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        purple: iris,
        teal: mint,
        saffron: {
          50: '#FFF8EB', 100: '#FFEBC6', 200: '#FFD688', 300: '#FFBC4A', 400: '#FFA620',
          500: '#F98A07', 600: '#DD6602', 700: '#B74606', 800: '#94360C', 900: '#7A2D0D',
        },
        ink: { 700: '#2A3060', 800: '#1A1F45', 900: '#0E1230', 950: '#080A1E' },
        canvas: '#F7F7FB',
        warm: { 50: '#F7F7FB', 100: '#EFEFF6' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Noto Sans Devanagari"', '"Noto Sans Telugu"', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Noto Sans Devanagari"', '"Noto Sans Telugu"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(14,18,48,0.04), 0 10px 30px -14px rgba(14,18,48,0.18)',
        lift: '0 2px 4px rgba(14,18,48,0.06), 0 18px 40px -16px rgba(14,18,48,0.28)',
        glow: '0 12px 32px -12px rgba(109,85,250,0.6)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        bob: 'bob 3.2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
}
