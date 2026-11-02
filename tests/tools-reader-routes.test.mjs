import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('tool choice directs five real user jobs to four working browser tools without inventing another tool',()=>{
  const category=read('src/pages/[category]/index.astro');
  const picker=category.split('id="tool-picker-heading"')[1]?.split("category.slug === 'tools' && <section class=\"section prose\"")[0] ?? '';
  assert(picker.includes('Choose a check by what you need to finish'));
  for(const link of ['/tools/ai-prompt-builder/','/tools/ai-response-checklist/','/tools/weighted-price-checker/','/tools/claim-checker/','/tools/claim-checker/#manual-claim-ledger']) {
    assert(picker.includes('href="'+link+'"'), 'reader route must be independently discoverable: '+link);
  }
  assert(picker.includes('What remains unverified'));
  assert(picker.includes('the browser saved it'));
  assert(picker.includes('27 units')&&picker.includes('530.00')&&picker.includes('19.63'));
  assert(picker.includes('location is already confirmed'));
  assert.equal((category.match(/class="tool-card"/g)||[]).length,4,'Preserve the four independent tools');
});

test('the original source notes support the proposed three-way example precisely',()=>{
  const source=read('public/examples/claim-boundary-source-notes.txt');
  assert(source.includes('A community garden planning meeting is scheduled for Saturday at 10 a.m.'));
  assert(source.includes('The meeting location is not confirmed.'));
  assert(!source.includes('North Greenhouse'));
  const csv=read('public/examples/weighted-price-sample.csv').trim().split(/\r?\n/);
  assert.equal(csv.length,9,'Sample must be the genuine eight-row fixture');
  const cells=csv.slice(1).map(line=>line.split(','));
  const quantity=cells.reduce((sum,x)=>sum+Number(x[2]),0);
  const revenue=cells.reduce((sum,x)=>sum+Number(x[2])*Number(x[3]),0);
  assert.equal(quantity,27);
  assert.equal(revenue,530);
  assert.equal((revenue/quantity).toFixed(2),'19.63');
});

test('the manual ledger deep link actually resolves to a heading-bearing static section',()=>{
  const page=read('src/pages/tools/claim-checker.astro');
  const guide=read('src/content/articles/how-to-verify-ai-generated-information.md');
  assert(page.includes('id="manual-claim-ledger" aria-labelledby="personal-ledger-title"'));
  assert(page.includes('id="personal-ledger-title">Build a claim ledger from your own text'));
  assert(page.includes('href="#manual-claim-ledger"'));
  assert(guide.includes('href="/tools/claim-checker/#manual-claim-ledger"'));
  assert.match(guide,/updatedDate: "2026-11-03"/);
  assert(!page.includes('The original quiz is a real-world accuracy benchmark'));
});

test('reader documentation never claims independent real-world verification or a confirmed download',()=>{
  const cat=read('src/pages/[category]/index.astro');
  const page=read('src/pages/tools/claim-checker.astro');
  assert(cat.includes('neither mode independently certifies real-world claims'));
  assert(cat.includes('not a live AI model test'));
  assert(page.includes('this page cannot confirm') || page.includes('cannot confirm your browser saved it'));
});
