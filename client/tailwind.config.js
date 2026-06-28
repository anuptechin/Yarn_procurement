/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Indigo-dye — structural / brand
        ink: '#15203B',
        indigo: {
          50: '#EEF1F8',
          100: '#DDE3F1',
          200: '#BAC6E0',
          400: '#5E74A6',
          600: '#2A3F6B',
          700: '#22335B',
          800: '#1A2848',
          900: '#131E38',
        },
        // Marigold / turmeric — the single accent (recommended / award)
        marigold: {
          50: '#FBF4E4',
          100: '#F3E4C4',
          300: '#E2BE73',
          500: '#C8932A',
          600: '#A9791E',
          700: '#866015',
        },
        sage: { 50: '#E8F3EC', 500: '#2F7D5B', 600: '#256647', 700: '#1C4E37' },
        clay: { 50: '#F8EAE5', 500: '#B5462E', 600: '#963825' },
        paper: '#F4F5F8',
        line: '#E4E7EE',
      },
      fontFamily: {
        // FF Good (Adobe Typekit) is the portal typeface; bundled fonts are offline fallbacks.
        display: ['"ff-good-web-pro"', '"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"ff-good-web-pro"', 'Inter', 'system-ui', 'sans-serif'],
        cond: ['"ff-good-web-pro-condensed"', '"ff-good-web-pro"', 'Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(21,32,59,0.04), 0 4px 16px rgba(21,32,59,0.06)',
        pop: '0 8px 30px rgba(21,32,59,0.14)',
      },
      borderRadius: {
        xl2: '14px',
      },
    },
  },
  plugins: [],
};
