import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://favelahacker.com.br',
  integrations: [
    mdx(),
    sitemap({ filter: (page) => !page.includes('/api/') && !page.includes('/rss.xml') }),
    tailwind(),
  ],
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
});
