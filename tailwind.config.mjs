/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f3f8',
          100: '#d9e0ed',
          200: '#b3c1db',
          300: '#8da2c9',
          400: '#6783b7',
          500: '#4164a5',
          600: '#345084',
          700: '#273c63',
          800: '#1a2842',
          900: '#0d1421',
        },
        ivory: {
          50: '#fefdfb',
          100: '#fdf9f3',
          200: '#faf3e7',
          300: '#f5e9d4',
          400: '#eddcc0',
        },
        accent: {
          red: '#c53030',
          amber: '#d69e2e',
          green: '#2f855a',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif JP"', '"游明朝"', '"YuMincho"', 'serif'],
        sans: ['"Noto Sans JP"', '"游ゴシック"', '"YuGothic"', 'sans-serif'],
        mono: ['"Source Code Pro"', 'monospace'],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.navy.800'),
            '--tw-prose-headings': theme('colors.navy.900'),
            lineHeight: '1.9',
            fontSize: '1rem',
            h2: { marginTop: '2em', marginBottom: '0.75em' },
            h3: { marginTop: '1.5em', marginBottom: '0.5em' },
            p: { marginBottom: '1.25em' },
            a: {
              color: theme('colors.navy.600'),
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            },
          },
        },
        dark: {
          css: {
            '--tw-prose-body': theme('colors.ivory.200'),
            '--tw-prose-headings': theme('colors.ivory.50'),
            a: { color: theme('colors.navy.300') },
          },
        },
      }),
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      maxWidth: {
        article: '42rem',
        wide: '72rem',
      },
    },
  },
  plugins: [],
};
