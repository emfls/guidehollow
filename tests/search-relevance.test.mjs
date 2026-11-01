import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readableSearchText, searchEntries } from '../src/lib/search.ts';

test('rank visible title matches before summary matches before guide-body matches', () => {
  const entries = [
    { title:'Long practical guide', description:'An explanation', url:'/guides/body/', text:'A source verification method is shown with a sample.' },
    { title:'Practical overview', description:'Source verification for beginners', url:'/guides/summary/', text:'Original example.' },
    { title:'Source verification guide', description:'How to judge sources', url:'/guides/title/', text:'A reproducible process.' },
  ];
  const found = searchEntries(entries,'source verification');
  assert.deepEqual(found.map(hit => hit.entry.url),['/guides/title/','/guides/summary/','/guides/body/']);
  assert(found[0].score > found[1].score);
  assert(found[1].score > found[2].score);
  assert(found[2].preview.includes('source verification method'));
  assert.equal(searchEntries(entries,'nonexistent query').length,0);
  assert.equal(searchEntries(entries,'   ').length,0);
});

test('match all entered terms case insensitively and avoid matching raw Markdown URL text', () => {
  const body = '## CSV **validation** uses a [sample spreadsheet](https://private.example.com/secretsearch). Empty price is a blank value, not numeric zero.';
  const plain = readableSearchText(body);
  assert(plain.includes('CSV validation uses a sample spreadsheet'));
  assert(!plain.includes('**'));
  assert(!plain.includes('https://'));
  const record = [{ title:'Sales spreadsheet', description:'Verify numeric inputs', url:'/guides/csv/', text:body }];
  assert.equal(searchEntries(record,'CSV blank').length,1);
  assert.equal(searchEntries(record,'csv unrelated').length,0);
  assert.equal(searchEntries(record,'secretsearch').length,0,'URL-only references are not editorial prose matches');
  const snippet = searchEntries(record,'blank')[0].preview;
  assert(snippet.includes('blank value'));
  assert(!snippet.includes('https://'));
  assert(!snippet.includes('[sample'));
});

test('search snippets are short and guide results use safe textContent rendering', async () => {
  const text = 'Beginning. ' + 'Some context to introduce the method. '.repeat(8) +
    'We now identify an unsupported source claim in the editor-created notes. ' +
    'More explanation follows. '.repeat(12);
  const hits = searchEntries([{title:'An article',description:'How it works',url:'/guides/article/',text}], 'unsupported');
  assert.equal(hits.length,1);
  assert(hits[0].preview.includes('unsupported source claim'));
  assert(hits[0].preview.length <= 194);
  assert(hits[0].preview.startsWith('…'));
  const client = await readFile(new URL('../src/scripts/search.ts',import.meta.url),'utf8');
  const page = await readFile(new URL('../src/pages/search.astro',import.meta.url),'utf8');
  assert(client.includes("import { searchEntries, type SearchEntry }"));
  assert(client.includes('searchEntries(entries, query)'));
  assert(client.includes("preview.textContent = 'Relevant guide passage: ' + hit.preview"));
  assert(client.includes("link.textContent = hit.entry.title"));
  assert(!client.includes('innerHTML'));
  assert(page.includes('matching passages from the guides'));
  assert(page.includes('noindex'));
});
