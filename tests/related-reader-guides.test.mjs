import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relatedArticles } from '../src/lib/related.ts';

const item = (id,category,tags,date='2026-10-30') => ({
  id, data: { title:id, category, tags, publishedDate:new Date(date+'T00:00:00Z') }
});

test('related reading shows shared-topic guides before same-category fallbacks', () => {
  const page=item('source','guides',['spreadsheet','verification']);
  const posts=[
    item('off-topic-new','troubleshooting',['privacy'],'2026-11-02'),
    item('cross-category-shared','prompts',['verification'],'2026-11-01'),
    item('same-category-shared','guides',['verification'],'2026-10-01'),
    item('same-category-fallback','guides',['json'],'2026-11-01'),
    item('source','guides',['spreadsheet','verification']),
  ];
  assert.deepEqual(relatedArticles(page,posts).map(p=>p.id),[
    'same-category-shared','cross-category-shared','same-category-fallback'
  ]);
});

test('related reading never invents three irrelevant links or repeats itself', () => {
  const page=item('only','guides',['unique']);
  const unrelated=[item('privacy','troubleshooting',['privacy']),item('template','prompts',['template'])];
  assert.deepEqual(relatedArticles(page,unrelated),[]);
  const matches=[item('a','guides',['unique']),item('b','guides',['unique']),item('c','guides',['unique'])];
  assert.deepEqual(relatedArticles(page,matches,2).map(p=>p.id),['a','b']);
  assert.deepEqual(relatedArticles(page,matches,0),[]);
});

test('article template links to its real evidence library and uses topic-aware recommendations', () => {
  const markup=readFileSync(new URL('../src/pages/[category]/[slug].astro',import.meta.url),'utf8');
  assert.match(markup,/relatedArticles\(post, allPosts\)/);
  assert.match(markup,/related\.length > 0/);
  assert.match(markup,/visit our <a href="\/evidence\/">Evidence Library<\/a>/);
  assert.doesNotMatch(markup,/See this guide for which examples were constructed/);
});
