/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sub: 'rgb(var(--color-sub) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        pane: 'rgb(var(--color-pane) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
