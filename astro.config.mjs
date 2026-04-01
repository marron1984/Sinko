import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sinko.jp',
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'ja', locales: { ja: 'ja-JP' } },
    }),
  ],
  output: 'static',
  build: { format: 'directory' },
  vite: {
    plugins: [tailwindcss()],
    build: { cssMinify: true },
  },
});
