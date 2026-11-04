import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {site} from '../src/config.ts';
import {
  sourceManifest,sitemapPaths,verifyInventory,validateIndexableHtml,
  checkCompletePublication,retryCompletePublication,
} from '../scripts/verify-public-coverage.mjs';

const tooling=['/tools/ai-prompt-builder/','/tools/ai-response-checklist/','/tools/weighted-price-checker/','/tools/claim-checker/'];
const standard=['/','/guides/','/ai-tools/','/prompts/','/troubleshooting/','/tools/',
  '/about/','/contact/','/privacy-policy/','/terms/','/editorial-policy/','/evidence/',...tooling];
const sourceTime=new Date('2026-11-04T06:00:00Z');
const expectedHtml=path=>'<!doctype html><html lang="en-US"><head>'+
  '<link rel="canonical" href="'+site.url+path+'">'+
  '<meta name="robots" content="index, follow">'+
  '<meta name="google-adsense-account" content="'+site.ads.publisherId+'">'+
  '</head><body><main id="main"><h1>Public source-backed Guide</h1></main><footer>Site contact</footer></body></html>';
const loc=path=>'<url><loc>'+site.url+path+'</loc></url>';
function makeFeed(manifest) {
  return '<rss><channel>'+manifest.articles.map(path=>
    '<item><guid isPermaLink="true">'+site.url+path+'</guid></item>').join('')+'</channel></rss>';
}
function fixtures(manifest) {
  const paths=[...new Set([...standard,...manifest.articles])];
  const data={
    '/sitemap.xml':'<urlset>'+paths.map(loc).join('')+'</urlset>',
    '/rss.xml':makeFeed(manifest),
    '/search-index.json':JSON.stringify([...manifest.articles,...tooling].map(url=>({url}))),
  };
  const assets=new Map(manifest.examples.map(x=>[x.path,x.bytes]));
  const hit=async (url)=>{
    const path=new URL(url).pathname;
    const bytes=assets.get(path);
    return {
      status:200,url,text:async()=>data[path]||expectedHtml(path),
      arrayBuffer:async()=>Uint8Array.from(bytes||Buffer.from('not an asset')).buffer,
    };
  };
  return {paths,data,assets,hit};
}
test('checked-in manifest discovers every original evidence file, including nested and binary artifacts',async()=>{
  const manifest=await sourceManifest({now:sourceTime});
  assert(manifest.articles.length>=33);
  assert(manifest.examples.length>=57);
  assert(manifest.examples.some(x=>x.path.endsWith('ai-spreadsheet-checks.xlsx')&&x.bytes.length>1000));
  assert(manifest.examples.some(x=>x.path.includes('/document-diff/')));
  assert(manifest.examples.some(x=>x.path.endsWith('space-sharing-permissions-practice.tsv')));
  assert(new Set(manifest.examples.map(x=>x.path)).size===manifest.examples.length);
  const paths=new Set(manifest.articles);
  assert(!paths.has('/search/'));
  assert(!paths.has('/404/'));
});

test('published article source, sitemap, RSS and search index must agree completely',async()=>{
  const manifest=await sourceManifest({now:sourceTime});
  const {paths,data}=fixtures(manifest);
  assert.deepEqual(verifyInventory({
    sitemap:data['/sitemap.xml'],rss:data['/rss.xml'],index:data['/search-index.json'],
  },manifest),paths);
  assert.equal(sitemapPaths(data['/sitemap.xml']).length,paths.length);
  const lost=manifest.articles.at(-1);
  assert.throws(()=>verifyInventory({
    sitemap:data['/sitemap.xml'].replace(loc(lost),''),
    rss:data['/rss.xml'],index:data['/search-index.json'],
  },manifest),/Sitemap omits published route/);
  assert.throws(()=>verifyInventory({
    sitemap:data['/sitemap.xml'],
    rss:data['/rss.xml'].replace('<item><guid isPermaLink="true">'+site.url+lost+'</guid></item>',''),
    index:data['/search-index.json'],
  },manifest),/RSS GUIDs do not match/);
  assert.throws(()=>verifyInventory({
    sitemap:data['/sitemap.xml'],rss:data['/rss.xml'],
    index:JSON.stringify(manifest.articles.slice(1).map(url=>({url}))),
  },manifest),/Public search index differs/);
  assert.throws(()=>sitemapPaths(data['/sitemap.xml']+loc('/search/')),/Noindex-only page/);
  assert.throws(()=>sitemapPaths(data['/sitemap.xml'].replace('</urlset>',loc('/guides/')+'</urlset>')),/Duplicate sitemap/);
  assert.throws(()=>sitemapPaths('<urlset>'+loc('/oops/')+'<url><loc>https://untrusted.example/</loc></url></urlset>'),/Invalid sitemap loc/);
});
test('all indexable page metadata is checked rather than just the original sixteen routes',()=>{
  const valid=expectedHtml('/guides/one/');
  assert.equal(validateIndexableHtml('/guides/one/',valid),null);
  assert.match(validateIndexableHtml('/guides/one/',valid.replace('index, follow','noindex, follow')),/noindexed/);
  assert.match(validateIndexableHtml('/guides/two/',valid),/canonical/);
  assert.match(validateIndexableHtml('/guides/one/',valid.replace(site.ads.publisherId,'ca-pub-0000000000000000')),/identity/);
  assert.match(validateIndexableHtml('/guides/one/',valid.replace('<h1>','<h2>').replace('</h1>','</h2>')),/h1/);
  assert.match(validateIndexableHtml('/guides/one/',valid.replace('<footer>','<aside>').replace('</footer>','</aside>')),/landmarks/);
});
test('the complete mocked public deployment actually checks every article and every original example byte',async()=>{
  const manifest=await sourceManifest({now:sourceTime});
  const {paths,hit,assets}=fixtures(manifest);
  const requests=[];
  const get=async (url,...args)=>{requests.push(new URL(url).pathname);return hit(url,...args)};
  const result=await checkCompletePublication({now:sourceTime,get,concurrency:4});
  assert(result.passed,JSON.stringify(result.failed));
  assert.equal(result.articlePaths,manifest.articles.length);
  assert.equal(result.indexablePaths,paths.length);
  assert.equal(result.examplePaths,assets.size);
  assert.equal(result.checked,paths.length+assets.size);
  assert.equal(requests.length,3+result.checked,'Three metadata requests plus all live content');
  for(const p of [...manifest.articles,...assets.keys()])
    assert(requests.includes(p),'Unverified public article or download '+p);
});
test('a single corrupt public TSV or missing guide fails exhaustive verification despite valid index',async()=>{
  const manifest=await sourceManifest({now:sourceTime});
  const {hit}=fixtures(manifest);
  const changed='/examples/space-sharing-permissions-practice.tsv';
  const lost=manifest.articles[0];
  const get=async url=>{
    const path=new URL(url).pathname;
    const original=await hit(url);
    if(path===changed)return {...original,arrayBuffer:async()=>new TextEncoder().encode('tampered practice data').buffer};
    if(path===lost)return {...original,status:404};
    return original;
  };
  const checked=await checkCompletePublication({get,now:sourceTime,concurrency:5});
  assert.equal(checked.passed,false);
  assert(checked.failed.some(x=>x.path===changed&&/differs/.test(x.detail)));
  assert(checked.failed.some(x=>x.path===lost&&/HTTP 404/.test(x.detail)));
});
test('a stale production sitemap fails then recovers without publishing or changing local source files',async()=>{
  const manifest=await sourceManifest({now:sourceTime});
  const {hit,data}=fixtures(manifest);
  let first=true,pauses=0;
  const get=async url=>{
    const path=new URL(url).pathname;
    if(path==='/sitemap.xml'&&first){
      first=false;
      const response=await hit(url);
      return {...response,text:async()=>data['/sitemap.xml'].replace(loc(manifest.articles[0]),'')};
    }
    return hit(url);
  };
  const result=await retryCompletePublication({
    get,now:sourceTime,attempts:2,intervalMs:0,pause:async()=>{pauses++},
  });
  assert.equal(result.passed,true);
  assert.equal(result.attempts,2);
  assert.equal(pauses,1);
});
test('deployment workflow executes both non-optional checks after Pages release',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/deploy.yml',import.meta.url),'utf8');
  assert.match(workflow,/uses: actions\/deploy-pages@v4[\s\S]*?run: node scripts\/verify-public-readiness\.mjs[\s\S]*?run: node scripts\/verify-public-coverage\.mjs/);
  assert.doesNotMatch(workflow,/continue-on-error: true/);
});
