/* #import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://example.com',
  integrations: [mdx(), sitemap(), tailwind()],
  output: 'server', // Enable server-side rendering
});
*/

import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare'; // <-- Add this line

export default defineConfig({
  site: 'https://favelahacker.com.br',
  integrations: [mdx(), sitemap(), tailwind()],
  output: 'server', // Enable server-side rendering
  adapter: cloudflare(), // <-- Add this line
});
