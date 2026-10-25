import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Changes to #01's visible shell or page formats must intentionally update
// the network snapshot in the same PR. This test does not certify that other
// repositories have already migrated.
const files = [
  'src/layouts/Base.astro',
  'src/styles/global.css',
  'src/scripts/site.ts',
  'src/components/ArticleList.astro',
  'src/pages/index.astro',
  'src/pages/[category]/[slug].astro',
  'src/pages/[category]/index.astro',
  'src/pages/search.astro',
  'src/pages/404.astro',
  'src/pages/about.astro',
  'src/pages/contact.astro',
  'src/pages/editorial-policy.astro',
  'src/pages/privacy-policy.astro',
  'src/pages/terms.astro',
  'src/pages/rss.xml.ts',
  'src/pages/sitemap.xml.ts',
  'src/pages/robots.txt.ts',
  'src/pages/search-index.json.ts',
  'src/config.ts',
  'src/content.config.ts',
  'src/lib/content.ts',
  'src/lib/seo.ts',
  'src/scripts/search.ts',
  'src/components/AdSlot.astro',
  'src/pages/tags/[tag].astro',
  'src/lib/tools.ts',
  'astro.config.mjs',
  'package.json',
  'public/favicon.svg',
  'public/social.svg',
];
test('network golden-reference source is identical to current Main', () => {
  for (const path of files) {
    const reference = readFileSync('network-template/reference/' + path);
    const main = readFileSync(path);
    assert.equal(reference.equals(main), true, 'Network template drift at ' + path);
  }
});
