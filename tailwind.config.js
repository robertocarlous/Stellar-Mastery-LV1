/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        stellar: {
          dark: '#0c0e1a',
          navy: '#161b33',
          purple: '#7b3fe4',
          cyan: '#00d4ff',
        },
      },
    },
  },
  plugins: [],
};
