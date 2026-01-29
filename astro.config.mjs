// @ts-check
import 'dotenv/config';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || undefined,
  output: 'server',
  integrations: [preact()],
  adapter: node({
    mode: 'standalone'
  }),
});
