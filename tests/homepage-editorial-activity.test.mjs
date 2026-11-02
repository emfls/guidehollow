import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { activityIsRevision, latestArticleActivity } from '../src/lib/editorial-activity.ts';

function article(title, published, updated, slug=title.toLowerCase().replaceAll(/\W+/g,'-'), category='guides') {
  return {data:{title,slug,category,publishedDate:new Date(published),updatedDate:new Date(updated)}};
}

test('a material correction to an older guide ranks above a newer unmodified article', () => {
  const older=article('Safe API key handling','2026-10-20','2026-11-02');
  const newer=article('New introduction','2026-11-01','2026-11-01');
  const earliest=article('Introduction','2026-09-01','2026-09-01');
  const posts=[newer,earliest,older];
  const result=latestArticleActivity(posts);
  assert.deepEqual(result,[older,newer,earliest]);
  assert.deepEqual(posts,[newer,earliest,older],'Do not change the existing publication-order source list');
  assert.equal(older.data.publishedDate.toISOString(),'2026-10-20T00:00:00.000Z');
  assert.equal(older.data.updatedDate.toISOString(),'2026-11-02T00:00:00.000Z');
  assert.equal(activityIsRevision(older),true);
  assert.equal(activityIsRevision(newer),false);
});

test('ties sort by original publication date then title and stable slug', () => {
  const older=article('B','2026-10-01','2026-11-02','b');
  const newer=article('Z','2026-11-01','2026-11-02','z');
  const titleA=article('A','2026-10-01','2026-11-02','a');
  assert.deepEqual(latestArticleActivity([older,newer,titleA]),[newer,titleA,older]);
  assert.equal(latestArticleActivity([]).length,0);
  assert.equal(activityIsRevision(article('Same day','2026-11-02','2026-11-02')),false);
  const a=article('Accidentally Pasted an API Key','2026-10-31','2026-11-02','api-key-pasted','troubleshooting');
  const b=article('ChatGPT Projects','2026-10-31','2026-11-02','chatgpt-projects','ai-tools');
  assert.deepEqual(latestArticleActivity([a,b]),[b,a], 'Same-day revisions must use canonical URL ordering, not article title order');
});

test('homepage recent articles visibly distinguish Updated vs Published with real machine-readable dates', () => {
  const homepage=readFileSync(new URL('../src/pages/index.astro',import.meta.url),'utf8');
  const component=readFileSync(new URL('../src/components/ArticleList.astro',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
  assert.match(homepage,/const latest = latestArticleActivity\(posts\)\.slice\(0, 5\)/);
  assert.match(homepage,/Recently published or revised\./);
  assert.match(homepage,/<ArticleList posts=\{latest\} showActivityDates \/>/);
  assert.match(homepage,/Dates distinguish new guides from updates to earlier ones/);
  assert.match(component,/activityIsRevision\(post\) \? 'Updated' : 'Published'/);
  assert.match(component,/<time datetime=\{/);
  assert.match(component,/displayDate\(activityIsRevision\(post\)/);
  assert.match(css,/\.article-row \.article-activity-date\{/);
  assert.match(css,/\.editorial-activity-note\{/);
});
