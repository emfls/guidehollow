import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('evidence index offers ten useful links and one limitations anchor with unique targets', () => {
  const html=read('src/pages/evidence.astro');
  const nav=html.match(/<nav class="evidence-jumps"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert(nav,'Evidence library must have navigable quick links');
  assert.match(html,/aria-label="Choose an evidence exercise"/);
  const links=[...nav.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]);
  assert.equal(links.length,11,'Ten exercise links and a limitations link');
  assert.equal(new Set(links).size,links.length,'Jump targets must be distinct');
  assert.equal(links.filter(id=>id!=='evidence-limitations').length,10);
  for(const id of links) assert(html.includes('id="'+id+'"'),id+' must target an existing heading');
  const ids=[...html.matchAll(/id="(evidence-[^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(ids.sort(),links.sort(),'No duplicated or unlinked exercise headings');
  assert.match(nav,/Read the evidence limits and review scope/);
  assert.match(nav,/Pick an original exercise by task/);
});

test('Back to top works without scripts and all fragment links are verified during build', () => {
  const layout=read('src/layouts/Base.astro');
  assert.match(layout,/<body id="top">/);
  assert.match(layout,/href="#top" data-top/);
  const verify=read('scripts/verify-build.mjs');
  assert.match(verify,/if \(url\.hash\) \{/);
  assert.doesNotMatch(verify,/url\.hash !== '#top'/);
  assert(verify.includes('targetHtml.includes('));
});

test('evidence exercise navigation stays mobile-readable and needs no JavaScript', () => {
  const css=read('src/styles/global.css');
  assert.match(css,/\.evidence-jumps ol\{list-style:none;display:grid;/);
  assert.match(css,/@media\(max-width:650px\)\{\.evidence-jumps ol\{grid-template-columns:1fr\}\}/);
  assert.doesNotMatch(read('src/pages/evidence.astro'),/onclick=/);
});
