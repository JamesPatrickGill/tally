import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://jamespatrickgill.github.io',
  base: '/tally',
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap()],
  build: {
    assets: 'assets'
  }
});
