import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('evidence index offers twenty useful links and one limitations anchor with unique targets', () => {
  const html=read('src/pages/evidence.astro');
  const nav=html.match(/<nav class="evidence-jumps"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert(nav,'Evidence library must have navigable quick links');
  assert.match(html,/aria-label="Choose an evidence exercise"/);
  const links=[...nav.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]);
  assert.equal(links.length,21,'Twenty exercise links and a limitations link');
  assert.equal(new Set(links).size,links.length,'Jump targets must be distinct');
  assert.equal(links.filter(id=>id!=='evidence-limitations').length,20);
  for(const id of links) assert(html.includes('id="'+id+'"'),id+' must target an existing heading');
  const ids=[...html.matchAll(/id="(evidence-[^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(ids.slice().sort(),links.slice().sort(),'No duplicated or unlinked exercise headings');
  assert.match(nav,/Read the evidence limits and review scope/);
  assert.match(nav,/Pick an original exercise by task/);
  const exerciseHeads=[...html.matchAll(/<h2 id="(evidence-[^"]+)">(\d+)\. /g)].map(m=>({id:m[1],index:Number(m[2])}));
  assert.equal(exerciseHeads.length,20,'Every original exercise has a numbered h2 and a distinct anchor');
  assert.deepEqual(exerciseHeads.map(x=>x.index),Array.from({length:20},(_,i)=>i+1),'Sections must follow the quick-link order');
  assert.deepEqual(exerciseHeads.map(x=>x.id),links.filter(x=>x!=='evidence-limitations'),'The visible navigation follows all exercises in reading order');
  assert(!html.includes('<h3>Privacy permission drill: classify before revealing the answer</h3>'),'The permissions drill may no longer be hidden under an unrelated SEO example');
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
