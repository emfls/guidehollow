import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchTerms,searchEntries} from '../src/lib/search.ts';

const source=slug=>readFileSync(new URL('../src/content/articles/'+slug+'.md',import.meta.url),'utf8');
function article(slug,category){
  const markdown=source(slug);
  const field=name=>markdown.match(new RegExp('^'+name+': "([^"]+)"','m'))?.[1]??'';
  return {
    title:field('title'),description:field('description'),
    url:'/'+category+'/'+slug+'/',
    text:markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\s*\n/,''),
  };
}

test('normalizes only documented common names, including fullwidth and punctuation variants',()=>{
  assert.deepEqual(searchTerms('Chat GPT'),['chatgpt']);
  assert.deepEqual(searchTerms('Chat-GPT'),['chatgpt']);
  assert.deepEqual(searchTerms('CHAT/GPT'),['chatgpt']);
  assert.deepEqual(searchTerms('Ｃｈａｔ　ＧＰＴ'),['chatgpt']);
  assert.deepEqual(searchTerms('Open AI'),['openai']);
  assert.deepEqual(searchTerms('Open-AI'),['openai']);
  assert.deepEqual(searchTerms('Notebook LM'),['notebooklm']);
  assert.deepEqual(searchTerms('notebook-lm'),['notebooklm']);
  assert.deepEqual(searchTerms('e-mail'),['email']);
  assert.deepEqual(searchTerms('E MAIL'),['email']);
  assert.deepEqual(searchTerms('How can I use Chat GPT?'),['use','chatgpt']);
  assert.deepEqual(searchTerms('ChatGPT API-key'),['chatgpt','api','key']);
});

test('real published articles are reachable by ordinary alternative spellings',()=>{
  const items=[
    article('getting-started-with-chatgpt','ai-tools'),
    article('notebooklm-source-checked-study-guide','ai-tools'),
    article('how-to-draft-emails-with-ai','guides'),
  ];
  for(const [query,path] of [
    ['Chat GPT','/ai-tools/getting-started-with-chatgpt/'],
    ['Notebook LM','/ai-tools/notebooklm-source-checked-study-guide/'],
    ['e-mail','/guides/how-to-draft-emails-with-ai/'],
  ]){
    const hits=searchEntries(items,query);
    assert(hits.some(hit=>hit.entry.url===path),
      'Expected real guide for alternative spelling '+query+'; got '+hits.map(hit=>hit.entry.url));
  }
  const gettingStarted=items[0];
  const titleTokens=gettingStarted.title.toLocaleLowerCase('en-US').match(/[\p{L}\p{N}]+/gu);
  assert(titleTokens.includes('chatgpt'));
  assert(!titleTokens.includes('gpt'),'The documented issue is split vs combined spelling, not lack of a guide');
});

test('the normalization never weakens technical AND requirements or produces unrelated substring hits',()=>{
  assert.deepEqual(searchTerms('PDF/OCR'),['pdf','ocr']);
  assert.deepEqual(searchTerms('API-key'),['api','key']);
  assert.deepEqual(searchTerms('CSV/JSON'),['csv','json']);
  assert.deepEqual(searchTerms('Chat GPT / OCR'),['chatgpt','ocr']);
  const rows=[
    {title:'AI email notes',description:'Draft messages',text:'Email writing advice',url:'/guides/email/'},
    {title:'ChatGPT file notes',description:'ChatGPT documents',text:'File inspection',url:'/ai-tools/chatgpt/'},
    {title:'OCR workflow',description:'PDF scanning',text:'OCR and PDFs',url:'/guides/ocr/'},
    {title:'OpenAI sources',description:'Official OpenAI documents',text:'OpenAI help',url:'/guides/openai/'},
  ];
  assert.deepEqual(searchEntries(rows,'Chat GPT').map(r=>r.entry.url),['/ai-tools/chatgpt/']);
  assert.deepEqual(searchEntries(rows,'Chat GPT OCR'),[]);
  assert.deepEqual(searchEntries(rows,'PDF/OCR').map(r=>r.entry.url),['/guides/ocr/']);
  assert.deepEqual(searchEntries(rows,'API/key'),[]);
  assert.deepEqual(searchEntries(rows,'AI').map(r=>r.entry.url),['/guides/email/']);
  assert.deepEqual(searchEntries(rows,'Open AI').map(r=>r.entry.url),['/guides/openai/']);
  assert.deepEqual(searchTerms('what is the'),[]);
});

test('visible site search examples explain known names without implying broad fuzzy matching',()=>{
  const ui=readFileSync(new URL('../src/pages/search.astro',import.meta.url),'utf8');
  assert(ui.includes('/search/?q=Chat+GPT'));
  assert(ui.includes('/search/?q=Notebook+LM'));
  assert(ui.includes('Common name spellings like “Chat GPT”, “Open AI”, “Notebook LM”, and “e-mail”'));
  assert(ui.includes('Hyphens and slashes still separate technical terms'));
  assert(ui.includes('/search/?q=PDF%2FOCR'));
  assert(ui.includes('/search/?q=CSV%2FJSON'));
  const client=readFileSync(new URL('../src/scripts/search.ts',import.meta.url),'utf8');
  assert(client.includes("link.textContent = hit.entry.title"));
  assert(!client.includes('innerHTML'));
});
