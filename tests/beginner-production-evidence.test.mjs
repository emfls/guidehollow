import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewerPaths,validatePage} from '../scripts/verify-public-readiness.mjs';
import {site} from '../src/config.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const guide=read('src/content/articles/what-is-generative-ai.md');

test('the introductory article replaces duplicated 22-case content with evidence from a real production check',()=>{
  assert(guide.includes('updatedDate: "2026-11-03"'));
  assert(guide.includes('A real example: a fluent claim versus a production check'));
  assert(guide.includes('22:52 UTC'));
  assert(guide.includes('16 of 16 designated URL checks'));
  assert(guide.includes('16 selected URL checks'));
  assert(guide.includes('actual GitHub Actions run and deploy job logs'));
  assert(guide.includes('https://github.com/emfls/guidehollow/actions/runs/41540809663'));
  assert(!guide.includes('## An original 22-claim source check: generation is not verification'));
  assert(guide.includes('22-case supported/contradicted/unknown source quiz'));
  assert(guide.includes('editor-written example of an acceptable answer'));
  assert(guide.includes('Location: [TO CONFIRM]'));
});

test('published production evidence is precisely scoped to checker code, including the intentional 404',()=>{
  assert.equal(reviewerPaths.length,16);
  assert.equal(reviewerPaths.filter(p=>p==='/__guidehollow_public_smoke_missing_page__/').length,1);
  assert(reviewerPaths.includes('/robots.txt'));
  assert(reviewerPaths.includes('/sitemap.xml'));
  assert(reviewerPaths.includes('/contact/'));
  assert.equal(validatePage('/__guidehollow_public_smoke_missing_page__/','',404,site.url,site.url+'/__guidehollow_public_smoke_missing_page__/'),null);
  assert.match(validatePage('/__guidehollow_public_smoke_missing_page__/','',200,site.url,site.url+'/__guidehollow_public_smoke_missing_page__/'),/must return HTTP 404/);
  assert(guide.includes('not every URL'));
  assert(guide.includes('not establish AdSense approval'));
  assert(guide.includes('does not measure an AI model'));
  assert(guide.includes('interactive controls'));
});

test('about and editorial-policy pages disclose both the origin and limits of actual first-party work',()=>{
  const about=read('src/pages/about.astro');
  const policy=read('src/pages/editorial-policy.astro');
  for(const content of [about,policy]) {
    assert(content.includes('https://github.com/emfls/guidehollow/actions/runs/41540809663'));
    assert(content.includes('scripts/verify-public-readiness.mjs'));
    assert(content.includes('/guides/what-is-generative-ai/'));
    assert(content.includes('AdSense'));
  }
  assert(policy.includes('Updated November 3, 2026'));
  assert(about.includes('Four free browser tools for drafting'));
  assert(about.includes('not a visitor study'));
  assert(policy.includes('One path was deliberately nonexistent'));
});

test('the public evidence link is included in the article reference register and historical model results are not invented',()=>{
  const register=JSON.parse(guide.match(/^sources: (\[.*\])$/m)?.[1]||'[]');
  assert(register.some(x=>x.url==='https://github.com/emfls/guidehollow/actions/runs/41540809663'));
  assert(guide.includes("The run's success was observed in deployment logs"));
  assert(guide.includes('It does not measure an AI model'));
});
