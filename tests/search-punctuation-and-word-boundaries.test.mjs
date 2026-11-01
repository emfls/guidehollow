import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readableSearchText, searchEntries, searchTerms } from '../src/lib/search.ts';

const entries=[
  {
    title:'Accidentally Pasted an API Key into ChatGPT? A Safe Response Checklist',
    description:'Credential-exposure containment',
    url:'/troubleshooting/api-key/',
    text:'The owner should revoke the API key, check usage and record what is unknown.',
  },
  {
    title:'AI PDF Summary Missing Tables or Pages? Check OCR Before You Trust It',
    description:'A PDF scanning and OCR check',
    url:'/troubleshooting/pdf-ocr/',
    text:'Compare a selectable-text PDF with an image-only scan.',
  },
  {
    title:'How to Write a Good Email',
    description:'A template for common email tasks',
    url:'/guides/email/',
    text:'Write an email and revise it for the reader.',
  },
  {
    title:'Resolve a Claim With Evidence',
    description:'Review proof and unsupported claims',
    url:'/guides/claim/',
    text:'The claim can be supported, contradicted or unverified.',
  },
  {
    title:'AI Spreadsheet Validation',
    description:'Review the CSV/JSON export and spreadsheet output',
    url:'/guides/csv-json/',
    text:'Check CSV and JSON formats independently.',
  },
  {
    title:'Prompting Strategies',
    description:'Prompt examples and useful methods',
    url:'/guides/prompts/',
    text:'Practice good prompt design with original data.',
  },
];

test('punctuation-separated technical queries find appropriate first-party guides', () => {
  assert.deepEqual(searchTerms('PDF/OCR'), ['pdf','ocr']);
  assert.deepEqual(searchTerms('API-key'), ['api','key']);
  assert.deepEqual(searchTerms('CSV/JSON'), ['csv','json']);
  assert.deepEqual(searchTerms('ＡＰＩ／ｋｅｙ'), ['api','key']);
  assert.deepEqual(searchEntries(entries,'PDF/OCR').map(x=>x.entry.url), ['/troubleshooting/pdf-ocr/']);
  assert.deepEqual(searchEntries(entries,'API-key').map(x=>x.entry.url), ['/troubleshooting/api-key/']);
  assert.deepEqual(searchEntries(entries,'CSV/JSON').map(x=>x.entry.url), ['/guides/csv-json/']);
  assert.deepEqual(searchEntries(entries,'API / key').map(x=>x.entry.url), ['/troubleshooting/api-key/']);
});

test('short AI term matches only the whole word, not email or claim', () => {
  const found=searchEntries(entries,'AI').map(x=>x.entry.url);
  assert(found.includes('/troubleshooting/pdf-ocr/'));
  assert(found.includes('/guides/csv-json/'));
  assert(!found.includes('/guides/email/'));
  assert(!found.includes('/guides/claim/'));
  assert.deepEqual(searchEntries(entries,'email').map(x=>x.entry.url),['/guides/email/']);
  assert.deepEqual(searchEntries(entries,'claim').map(x=>x.entry.url),['/guides/claim/']);
});

test('prefix search is supported for meaningful technical terms without changing original exact term order', () => {
  assert.deepEqual(searchEntries(entries,'prompt').map(x=>x.entry.url), ['/guides/prompts/']);
  assert.deepEqual(searchEntries(entries,'PDF/unknown').map(x=>x.entry.url), []);
  assert.deepEqual(searchEntries(entries,'+++/').map(x=>x.entry.url), []);
  assert.deepEqual(searchTerms(' s '), []);
  assert.equal(searchEntries(entries,'PDF/OCR')[0].preview.includes('PDF'),true);
});

test('relevance phrase bonuses cannot be earned from an unrelated substring', () => {
  const rows=[
    {title:'Email templates',description:'A note',url:'/guides/email/',text:'AI for writing'},
    {title:'AI note templates',description:'A note',url:'/guides/ai/',text:'Email for readers'},
  ];
  const found=searchEntries(rows,'AI');
  assert.equal(found[0].entry.url,'/guides/ai/');
  assert(found[0].score > found[1].score);
  const raw='Check [PDF sources](https://bad.example/ocr-only-secret) against the real PDF.';
  const extracted=readableSearchText(raw);
  assert(!extracted.includes('ocr-only-secret'));
  assert.equal(searchEntries([{title:'Check sources',description:'Reference',url:'/guides/check/',text:raw}], 'secret').length,0);
});

test('search page offers task-focused, URL-encoded technical query examples without new tracking', () => {
  const page=readFileSync(new URL('../src/pages/search.astro',import.meta.url),'utf8');
  assert(page.includes('/search/?q=PDF%2FOCR'));
  assert(page.includes('/search/?q=API-key'));
  assert(page.includes('/search/?q=CSV%2FJSON'));
  const client=readFileSync(new URL('../src/scripts/search.ts',import.meta.url),'utf8');
  assert(client.includes('searchEntries(entries, query)'));
  assert(client.includes('preview.textContent ='));
  assert(!client.includes('innerHTML'));
});
