import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

const articleFolder=new URL('../src/content/articles/',import.meta.url);
// These hosts appear in our guides as primary product or standards documentation.
// The check does not claim the linked page was live-tested or every assertion verified.
const primaryHosts=new Set([
  'help.openai.com','developers.openai.com','platform.openai.com',
  'support.google.com','developers.google.com','ai.google.dev',
  'support.microsoft.com','docs.github.com','helpx.adobe.com',
  'www.nasa.gov','nasa.gov','www.atlassian.com',
  'developer.mozilla.org','json-schema.org',
  'www.anthropic.com','platform.claude.com'
]);
const normalize = address => {
  const url=new URL(address);
  return url.origin+url.pathname.replace(/\/$/,'');
};
const articles=()=>readdirSync(articleFolder).filter(name=>name.endsWith('.md')).map(name=>({
  filename:name, text:readFileSync(new URL(name,articleFolder),'utf8')
}));
const metadata = text => {
  const match=text.match(/^sources:\s*(\[.+\])$/m);
  assert(match,'All published articles must have a source register');
  return JSON.parse(match[1]);
};
const externalPrimaryLinks = text => {
  // Only inspect the actual article body, not the source metadata itself.
  // Strip fenced code; code prompts containing URLs aren't publication citations.
  const article=text.replace(/^---\n[\s\S]*?\n---\s*\n/,'').replace(/```[\s\S]*?```/g,'');
  const found=new Set();
  for (const match of article.matchAll(/https:\/\/[^\s<)\]"'\x60]+/g)) {
    const address=match[0].replace(/[.,;:!?]+$/,'');
    let url;
    try { url=new URL(address); } catch { continue; }
    if(primaryHosts.has(url.hostname)) found.add(normalize(address));
  }
  return [...found];
};
test('every explicitly linked primary-source page appears in its guide reference register',()=>{
  const files=articles();
  assert(files.length>=33,'Check all existing published guides, not a hand-picked few');
  const failures=[];
  for(const {filename,text} of files) {
    const refs=metadata(text);
    const known=new Set(refs.map(ref=>normalize(ref.url)));
    if(known.size!==refs.length) failures.push(filename+': duplicate URLs in source register');
    for(const source of externalPrimaryLinks(text))
      if(!known.has(source))failures.push(filename+': primary source omitted from References: '+source);
  }
  assert.deepEqual(failures,[],'Add the original primary citation to front matter rather than hiding it in the article body');
});

test('the source-register audit detects an actual omitted citation, not merely missing metadata',()=>{
  const article='---\nsources: [{"title":"One","url":"https://help.openai.com/en/articles/one"}]\n---\n'+
    'See [another official reference](https://developers.google.com/search/docs/crawling-indexing/block-indexing).';
  assert.deepEqual(externalPrimaryLinks(article),['https://developers.google.com/search/docs/crawling-indexing/block-indexing']);
  const refs=new Set(metadata(article).map(ref=>normalize(ref.url)));
  assert(externalPrimaryLinks(article).some(url=>!refs.has(url)));
});

test('the two corrected guides disclose current scope and preserve truthful dates',()=>{
  const bySlug = slug => readFileSync(new URL(slug+'.md',articleFolder),'utf8');
  const verify=bySlug('how-to-verify-ai-generated-information');
  const search=bySlug('how-to-use-chatgpt-search');
  assert(verify.includes('Google Search Central: Introduction to robots.txt'));
  assert(verify.includes('Google Search Central: Block Search indexing with noindex'));
  assert(verify.includes('November 2, 2026'));
  assert(search.includes('updatedDate: "2026-11-03"'));
  assert(search.includes('Space replaces Library'));
  assert(search.includes('Projects remain a separate feature'));
  assert(search.includes('did not show that a particular file was saved'));
  assert(search.includes('OpenAI Help Center: Using Library to manage files in ChatGPT'));
  assert(search.includes('OpenAI Help Center: Getting started with Space in ChatGPT'));
});
