import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewerPaths, validatePage, checkLiveSite, retrySmokeCheck} from '../scripts/verify-public-readiness.mjs';
import {site} from '../src/config.ts';

const base=site.url;
const pathUrl = path => new URL(path, base).href;
const validHtml = path => '<!doctype html><html lang="en-US"><head><link rel="canonical" href="' + pathUrl(path) +
  '"><meta name="google-adsense-account" content="' + site.ads.publisherId +
  '"><meta name="robots" content="index, follow"></head><body><main id="main">GuideHollow</main><footer>Contact</footer>' +
  (path === '/contact/' ? '<a href="mailto:'+site.contactEmail+'">Private email</a>' : '') +
  (path === '/evidence/' ? '<a href="/examples/document-diff/old-v1.txt">Evidence</a>' : '') +
  (path === '/tools/weighted-price-checker/' ? '<textarea id="weighted-price-csv"></textarea>' : '') + '</body></html>';
const content = path => {
  if(path==='/robots.txt')return 'User-agent: *\nAllow: /\n\nSitemap: '+base+'/sitemap.xml';
  if(path==='/ads.txt')return 'google.com, '+site.ads.publisherId.replace('ca-','')+', DIRECT, f08c47fec0942fa0';
  if(path==='/sitemap.xml')return '<urlset><loc>'+base+'/</loc><loc>'+base+'/guides/</loc><loc>'+base+'/guides/compare-two-documents-ai-without-missing-changes/</loc></urlset>';
  if(path==='/rss.xml')return '<rss><item>one published guide</item></rss>';
  if(path==='/examples/document-diff/old-v1.txt')return 'S1 | Scope | sample\nS6 | Kit check | sample';
  if(path==='/examples/prompt-injection-boundary-cases.tsv')return 'CaseID\tAuthorizedTask\tSourceType\tExcerpt\nT10\tlast';
  return validHtml(path);
};
const reply=(url,override={})=>{
  const path=new URL(url).pathname;
  return {status:path.includes('smoke_missing')?404:200,url,text:async()=>content(path),...override};
};

test('all review routes and public technical files are independently checked',async()=>{
  const seen=[];
  const get=async url=>{seen.push(new URL(url).pathname);return reply(url)};
  const result=await checkLiveSite({get});
  assert.equal(result.length,reviewerPaths.length);
  assert(result.every(r=>r.passed), JSON.stringify(result.filter(r=>!r.passed)));
  assert.deepEqual(seen,reviewerPaths);
  assert(reviewerPaths.includes('/ads.txt')&&reviewerPaths.includes('/robots.txt')&&reviewerPaths.includes('/privacy-policy/'));
});

test('publisher identity, indexability, contact, sitemap and missing page cannot silently fail',()=>{
  for(const path of ['/','/contact/','/evidence/']) {
    assert.equal(validatePage(path,content(path),200,base,pathUrl(path)),null);
    assert.match(validatePage(path,content(path).replace('content="index, follow"','content="noindex, follow"'),200,base,pathUrl(path)),/noindexed/);
  }
  assert.match(validatePage('/',content('/').replace(site.ads.publisherId,'ca-pub-0000000000000000'),200,base,pathUrl('/')),/AdSense/);
  assert.match(validatePage('/contact/',content('/contact/').replace('mailto:'+site.contactEmail,'mailto:other@example.com'),200,base,pathUrl('/contact/')),/contact/);
  assert.match(validatePage('/sitemap.xml','<urlset></urlset>',200,base,pathUrl('/sitemap.xml')),/missing/);
  assert.match(validatePage('/ads.txt','incorrect',200,base,pathUrl('/ads.txt')),/incorrect/);
  assert.match(validatePage('/robots.txt','Disallow: /',200,base,pathUrl('/robots.txt')),/allow crawling/);
  assert.match(validatePage('/',content('/'),200,base,'https://other.example/'),/unexpected redirect/);
  assert.match(validatePage('/',content('/'),404,base,pathUrl('/')),/HTTP 200/);
  assert.match(validatePage('/__guidehollow_public_smoke_missing_page__/',content('/'),200,base,pathUrl('/__guidehollow_public_smoke_missing_page__/')),/HTTP 404/);
});

test('retries failed routes but never changes or publishes a page',async()=>{
  const calls=new Map();
  const get=async url=>{
    const p=new URL(url).pathname;
    calls.set(p,(calls.get(p)||0)+1);
    return reply(url, p==='/evidence/' && calls.get(p)===1 ? {status:503} : {});
  };
  let pauses=0;
  const result=await retrySmokeCheck({get,attempts:2,intervalMs:0,pause:async()=>{pauses++}});
  assert.equal(result.passed,true);
  assert.equal(result.rounds,2);
  assert.equal(pauses,1);
  assert.equal(calls.get('/evidence/'),2);
  assert.equal(calls.get('/'),1);
});

test('uncorrected failures remain visible without changing deployment workflow semantics',async()=>{
  const alwaysDown=async url=>reply(url,new URL(url).pathname==='/ads.txt'?{status:503}:{});
  const result=await retrySmokeCheck({get:alwaysDown,attempts:2,intervalMs:0,pause:async()=>{}});
  assert.equal(result.passed,false);
  assert.deepEqual(result.failedPaths,['/ads.txt']);
  const workflow=readFileSync(new URL('../.github/workflows/deploy.yml',import.meta.url),'utf8');
  assert.match(workflow,/Check AdSense reviewer pages, ownership and public evidence/);
  assert.doesNotMatch(workflow,/continue-on-error: true/,'Postdeploy checks must not be marked successful when the public site is broken');
  assert.match(workflow,/run: node scripts\/verify-public-coverage\.mjs/);
  assert.match(workflow,/run: node scripts\/verify-public-readiness\.mjs/);
  assert.match(workflow,/Deploy to GitHub Pages[\s\S]*?uses: actions\/deploy-pages@v4/);
  assert(!workflow.includes('workflow_dispatch:\n    inputs:\n      publish'));
});
