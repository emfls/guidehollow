import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = file => readFile(new URL('../' + file,import.meta.url),'utf8');

test('both reader-facing browser utilities give a self-contained example and failure case', async () => {
  const [builder,review,source,html] = await Promise.all([
    read('src/pages/tools/ai-prompt-builder.astro'),
    read('src/pages/tools/ai-response-checklist.astro'),
    read('public/examples/claim-boundary-source-notes.txt'),
    read('src/pages/[category]/index.astro'),
  ]);
  assert(builder.includes('How to use each field without inventing facts'));
  assert(builder.includes('Worked exercise: keep an unknown location unknown'));
  assert(builder.includes('A small failure-injection test'));
  assert(builder.includes('/examples/claim-boundary-source-notes.txt'));
  assert(builder.includes('not an answer produced'));
  assert(builder.includes('try the') || builder.includes('Try a fictional example'));
  assert(review.includes('Walk through a source-check before checking any boxes'));
  assert(review.includes('original, reproducible teaching example'));
  assert(review.includes('Six checked boxes mean only'));
  assert(review.includes('3 × $8 + 2 × $6 = $36'));
  assert(review.includes('North Greenhouse'));
  assert(review.includes('/tools/claim-checker/'));
  assert(source.includes('Saturday at 10 a.m.'));
  assert(source.includes('The meeting location is not confirmed.'));
  assert(source.includes('3 bags cost $8 each and 2 trays cost $6 each.'));
  assert(!source.includes('North Greenhouse'));
  assert.equal(3 * 8 + 2 * 6, 36);
  assert(html.includes('AI Prompt Builder'));
});
