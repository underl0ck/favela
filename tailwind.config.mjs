/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        terminal: {
          green: 'var(--terminal-green)',
          dark: 'var(--terminal-dark-green)',
          bg: 'var(--terminal-bg)',
          text: 'var(--terminal-text)',
        },
      },
      fontFamily: {
        mono: ['Fira Code', 'monospace'],
      },
      animation: {
        'terminal-blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
};