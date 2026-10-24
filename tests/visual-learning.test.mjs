import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../src/pages/[category]/[slug].astro', import.meta.url),'utf8');
const asset=readFileSync(new URL('../public/visuals/meeting-notes-approval-boundary.svg',import.meta.url),'utf8');

test('meeting diagram is meaningful and accessible',()=>{
  assert.match(page,/extract-meeting-action-items-with-ai/);
  assert.match(page,/article-visual/);
  assert.match(page,/<img src=\{visual.src\} alt=\{visual.alt\}/);
  assert.match(page,/<figcaption>/);
  assert.match(asset,/<title id="title">/);
  assert.match(asset,/<desc id="desc">/);
  assert.match(asset,/Approved meeting notes/);
  assert.ok(asset.length < 25_000);
});

test('reference notes never imply a fixed review date for every future article',()=>{
  assert.doesNotMatch(page,/References checked October 23, 2026/);
});
