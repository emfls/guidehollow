import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import labelTaskCheckboxes from './scripts/label-task-checkboxes.mjs';
export default defineConfig({
  site: 'https://guidehollow.com',
  base: '/',
  output: 'static',
  trailingSlash: 'always',
  markdown: { processor: satteri({ hastPlugins: [labelTaskCheckboxes] }), shikiConfig: { theme: 'css-variables' } },
});
