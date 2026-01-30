// @ts-check
import 'dotenv/config';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';

// https://astro.build/config
const publicSiteUrl = (process.env.PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
if (process.env.NODE_ENV === 'production' && !publicSiteUrl) {
  console.warn('[astro.config] PUBLIC_SITE_URL is missing/empty in production build. Origin checks may fail behind a proxy.');
}
export default defineConfig({
  site: publicSiteUrl || undefined,
  output: 'server',
  integrations: [preact()],
  adapter: node({
    mode: 'standalone'
  }),
});
