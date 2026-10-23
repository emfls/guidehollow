import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://guidehollow.com',
  base: '/',
  output: 'static',
  trailingSlash: 'always',
  markdown: { shikiConfig: { theme: 'css-variables' } },
});
