import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchEntries,searchTerms} from '../src/lib/search.ts';

const guide=readFileSync(new URL('../src/content/articles/chatgpt-file-upload-problems.md',import.meta.url),'utf8');
const attr=key=>guide.match(new RegExp('^'+key+': "([^"]+)"','m'))?.[1]||'';
const body=guide.replace(/^---\n[\s\S]*?\n---\s*\n/,'');
const entry={title:attr('title'),description:attr('description'),url:'/troubleshooting/chatgpt-file-upload-problems/',text:body};

test('a real published upload guide is found by the reader question that was previously lost to my',()=>{
  assert(entry.title.includes('ChatGPT File Upload Problems'));
  assert(!/\bmy\b/i.test(entry.title+' '+entry.description+' '+entry.text),'The guide should not need to contain the visitor-specific filler word');
  assert.deepEqual(searchTerms("Why can't I upload my files?"),['upload','files']);
  const hits=searchEntries([entry],"Why can't I upload my files?");
  assert.equal(hits.length,1);
  assert.equal(hits[0].entry.url,entry.url);
  assert(hits[0].score>0);
});

test('question grammar and ordinary inflections do not suppress topical matches',()=>{
  const cases=[
    {query:'How can I upload my files?',expected:['upload','files']},
    {query:'Where are my uploaded files?',expected:['uploaded','files']},
    {query:'Do uploads work?',expected:['uploads','work']},
    {query:'How do I compare policies?',expected:['compare','policies']},
  ];
  for(const row of cases)assert.deepEqual(searchTerms(row.query),row.expected,row.query);
  const rows=[
    {title:'Upload files safely',description:'A documented procedure',url:'/guides/upload/',text:'Check the source.'},
    {title:'Compare policy rules',description:'Inspect reference material',url:'/guides/policy/',text:'Write down the exact condition.'},
  ];
  assert.equal(searchEntries(rows,'Where are my uploaded files?')[0]?.entry.url,'/guides/upload/');
  assert.equal(searchEntries(rows,'How do I compare policies?')[0]?.entry.url,'/guides/policy/');
});

test('technical queries remain strict, preventing unrelated substring matches',()=>{
  assert.deepEqual(searchTerms('PDF/OCR'),['pdf','ocr']);
  assert.deepEqual(searchTerms('API-key'),['api','key']);
  assert.deepEqual(searchTerms('CSV/JSON'),['csv','json']);
  assert.deepEqual(searchTerms('How can I check PDF/OCR?'),['check','pdf','ocr']);
  assert.deepEqual(searchTerms('what is the'),[]);
  assert.deepEqual(searchTerms(' s '),[]);
  const entries=[
    {title:'Email writing',description:'Draft an email',url:'/a/',text:'A message for readers'},
    {title:'AI model basics',description:'Model input',url:'/b/',text:'A short explanation'},
    {title:'PDF extraction',description:'Check image scanning',url:'/c/',text:'A PDF with selectable text'},
  ];
  assert.deepEqual(searchEntries(entries,'AI').map(hit=>hit.entry.url),['/b/']);
  assert.deepEqual(searchEntries(entries,'PDF/OCR'),[]);
  assert.deepEqual(searchEntries(entries,'AI/unknown'),[]);
  assert.deepEqual(searchEntries(entries,'what is the'),[]);
});

test('the actual search UI documents full questions and technical AND matching',()=>{
  const page=readFileSync(new URL('../src/pages/search.astro',import.meta.url),'utf8');
  const client=readFileSync(new URL('../src/scripts/search.ts',import.meta.url),'utf8');
  assert(page.includes('words such as “why”, “can”, and “my” are ignored'));
  assert(page.includes('meaningful topic words must still match'));
  assert(page.includes('PDF%2FOCR'));
  assert(client.includes("link.textContent = hit.entry.title"));
  assert(!client.includes('innerHTML'));
});
