/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F5F1',
        deeper: '#EFEAE1',
        ink: '#12110F',
        soft: '#3C3833',
        muted: '#7A736A',
        line: '#E3DCD1',
        champagne: '#B08D4F',
        champagneSoft: '#EFE3CD',
        moss: '#4F5A48',
        clay: '#A4705B',
        slate: '#4B5563',
      },
      fontFamily: {
        serif: ['Newsreader', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        lift: '0 18px 40px -24px rgba(18, 17, 15, 0.35)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};
