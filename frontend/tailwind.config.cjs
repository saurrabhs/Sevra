/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#070A0F',
          900: '#0B1020',
          850: '#0F1730'
        }
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(96,165,250,0.15), 0 12px 40px rgba(0,0,0,0.55)',
      }
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
