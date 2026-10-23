import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { site } from '../src/config.ts';
const root = path.resolve('dist');
async function walk(dir) { return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(entry => entry.isDirectory() ? walk(path.join(dir,entry.name)) : path.join(dir,entry.name)))).flat(); }
const files = await walk(root);
const htmlFiles = files.filter(file => file.endsWith('.html'));
const titles = new Set();
let internalLinks = 0;
const sitemap = await readFile(path.join(root,'sitemap.xml'),'utf8');
const search = JSON.parse(await readFile(path.join(root,'search-index.json'),'utf8'));
const publicArticles = search.filter(entry => !entry.url.startsWith('/tools/'));
const articlePaths = [];
assert.equal(search.length-publicArticles.length,2,'Both tools must be searchable');
assert.equal(new Set(search.map(entry => entry.url)).size,search.length,'Duplicate public article paths');
assert(!sitemap.includes('/404') && !sitemap.includes('/search/'),'Noindex pages must be excluded');
assert.equal((await readdir(root)).includes('ads.txt'),Boolean(site.ads.publisherId),'ads.txt must match publisher configuration');
if(site.ads.publisherId) assert.equal((await readFile(path.join(root,'ads.txt'),'utf8')).trim(),`google.com, ${site.ads.publisherId.replace('ca-','')}, DIRECT, f08c47fec0942fa0`);
for (const file of htmlFiles) {
  const html = await readFile(file,'utf8');
  const relative = path.relative(root,file);
  const pagePath = relative === 'index.html' ? '/' : relative.replace(/index\.html$/,'').replaceAll(path.sep,'/');
  const current = new URL(pagePath,'https://guidehollow.com/');
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,`${relative}: exactly one h1`);
  assert(html.includes('lang="en-US"'),`${relative}: language`);
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  assert(title && !titles.has(title),`${relative}: unique title`); titles.add(title);
  assert(/<meta name="description" content="[^"]+"/.test(html),`${relative}: description`);
  const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
  if (relative === '404.html') assert(canonical?.startsWith('https://guidehollow.com/404'), '404 canonical must use public domain');
  else assert.equal(canonical,current.href,`${relative}: canonical must match public domain and route`);
  assert.equal(html.includes('pagead2.googlesyndication.com'),site.ads.servingEnabled && site.ads.consentReady,`${relative}: ad requests must match consent and serving gates`);
  assert(!html.includes('ca-pub-0000'),`${relative}: no fabricated publisher ID`);
  const jsonld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  assert(jsonld.length,`${relative}: structured data`);
  jsonld.forEach(match => { const data = JSON.parse(match[1]); assert.equal(data['@context'],'https://schema.org'); if(data['@graph'].some(item => item['@type']==='BlogPosting')) articlePaths.push(current.pathname); });
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const raw = match[1].replaceAll('&amp;','&');
    if (/^(?:mailto:|tel:|data:|javascript:)/.test(raw)) continue;
    const url = new URL(raw,current);
    if (url.origin !== current.origin) continue;
    assert(!url.pathname.startsWith('/guidehollow/'),`${relative}: unwanted repository base path`);
    const decoded = decodeURIComponent(url.pathname);
    const target = path.join(root,decoded.endsWith('/') ? `${decoded}index.html` : decoded);
    assert(await stat(target).catch(()=>null),`${relative}: broken internal link ${raw}`);
    if (url.hash && url.hash !== '#top') {
      const targetHtml = target === file ? html : await readFile(target,'utf8');
      const id = decodeURIComponent(url.hash.slice(1));
      assert(targetHtml.includes(`id="${id}"`),`${relative}: broken anchor ${raw}`);
    }
    internalLinks++;
  }
  if (relative === '404.html' || relative === 'search/index.html') assert(html.includes('noindex, follow'),`${relative}: noindex required`);
}
assert.deepEqual(articlePaths.sort(),publicArticles.map(entry=>entry.url).sort(),'Search must include exactly the rendered public articles');
for (const entry of publicArticles) {
  assert(entry.text.split(/\s+/).length >= 550,`${entry.url}: insufficient substantive content`);
  const html = await readFile(path.join(root,entry.url,'index.html'),'utf8');
  assert(html.includes('Official sources') && html.includes('Related reading') && html.includes('On this page'),`${entry.url}: article navigation and sources`);
}
for (const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const url = new URL(match[1]); assert.equal(url.origin,'https://guidehollow.com');
  assert(await stat(path.join(root,url.pathname,'index.html')).catch(()=>null),`Sitemap route missing: ${url.pathname}`);
}
assert((await readFile(path.join(root,'robots.txt'),'utf8')).includes('https://guidehollow.com/sitemap.xml'));
assert.equal(((await readFile(path.join(root,'rss.xml'),'utf8')).match(/<item>/g)||[]).length,publicArticles.length);
console.log(`Verified ${htmlFiles.length} HTML pages, ${internalLinks} internal links/assets, ${publicArticles.length} articles, 2 tools, metadata, JSON-LD, feeds, sitemap, and advertising gates.`);
