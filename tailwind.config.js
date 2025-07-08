/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'dark-bg': '#131313',
        'light-gray': '#E2E2E2',
        'design-green': '#3FDC11',
        'design-yellow': '#FFFF00',
        'design-purple': '#7672DC',
        'design-gray': '#D9D9D9',
      }
    },
  },
  plugins: [],
} 