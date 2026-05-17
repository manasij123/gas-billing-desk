/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: { print: { raw: 'print' } },
      colors: {
        brand: {
          blue: '#1e293b',       // Professional Navy Sidebar
          emerald: '#059669',
          gold: '#c9a84c',
          purple: '#7c3aed',     // Modern Purple accent
          red: '#dc2626',        // Alert Red
          green: '#16a34a',      // Standard Green
          white: '#ffffff',
        },
        gold: {
          DEFAULT: '#c9a84c',
          muted: 'rgba(201, 168, 76, 0.15)',
          border: 'rgba(201, 168, 76, 0.55)',
        },
      },
    },
  },
  plugins: [],
};
