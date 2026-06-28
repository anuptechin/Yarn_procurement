/** @type {import('tailwindcss').Config} */

// Every colour resolves to a CSS variable (an "R G B" triplet) so the whole
// palette swaps with [data-theme]. Values live in src/index.css.
// `white` / `black` stay literal on purpose (text-white & bg-white/10 overlays).
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: v('ink'),
        paper: v('paper'),
        line: v('line'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        indigo: {
          50: v('indigo-50'), 100: v('indigo-100'), 200: v('indigo-200'), 300: v('indigo-300'),
          400: v('indigo-400'), 500: v('indigo-500'), 600: v('indigo-600'),
          700: v('indigo-700'), 800: v('indigo-800'), 900: v('indigo-900'),
        },
        marigold: {
          50: v('marigold-50'), 100: v('marigold-100'), 300: v('marigold-300'),
          400: v('marigold-400'), 500: v('marigold-500'), 600: v('marigold-600'), 700: v('marigold-700'),
        },
        sage: { 50: v('sage-50'), 500: v('sage-500'), 600: v('sage-600'), 700: v('sage-700') },
        clay: { 50: v('clay-50'), 500: v('clay-500'), 600: v('clay-600') },
        slate: {
          50: v('slate-50'), 100: v('slate-100'), 200: v('slate-200'), 300: v('slate-300'),
          400: v('slate-400'), 500: v('slate-500'), 600: v('slate-600'),
          700: v('slate-700'), 800: v('slate-800'), 900: v('slate-900'),
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        cond: ['"Space Grotesk"', 'Manrope', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--c-shadow) / 0.05), 0 4px 16px rgb(var(--c-shadow) / 0.08)',
        pop: '0 8px 30px rgb(var(--c-shadow) / 0.18)',
      },
      borderRadius: { xl2: '14px' },
      backgroundImage: {
        'app-gradient': 'var(--grad-app)',
        'sidebar-gradient': 'var(--grad-sidebar)',
      },
    },
  },
  plugins: [],
};
