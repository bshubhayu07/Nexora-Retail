/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        edgeDark: '#0B0F17',
        panelDark: '#151C28',
      }
    },
  },
  plugins: [],
}
