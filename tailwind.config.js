/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sub: '#3B82F6',      // Blue (~30%)
        accent: '#EA580C',   // Dark orange (~5%)
        pane: '#F3F4F6',     // Gray for panes
      },
    },
  },
  plugins: [],
}
