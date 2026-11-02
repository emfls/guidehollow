import {verifyApprovedVisuals} from './verify-approved-visuals.mjs';
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
assert.equal(search.length-publicArticles.length,4,'All four tools must be searchable');
assert.equal(new Set(search.map(entry => entry.url)).size,search.length,'Duplicate public article paths');
assert(!sitemap.includes('/404') && !sitemap.includes('/search/') && !sitemap.includes('/tags/'),'Noindex pages and navigation-only tag archives must be excluded');
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
  const publisherMeta = html.match(/name="google-adsense-account" content="([^"]+)"/)?.[1];
  assert.equal(publisherMeta,site.ads.publisherId || undefined,`${relative}: verification must match the configured publisher`);
  const noindex = html.includes('content="noindex, follow"');
  const listed = sitemap.includes(`<loc>${current.href}</loc>`);
  assert.equal(listed,!noindex,`${relative}: sitemap and robots indexing policy must agree`);
  if(relative.startsWith('tags/')) {
    const count = (html.match(/class="article-row"/g)||[]).length;
    assert(count >= 3,`${relative}: archive must provide at least three independent articles`);
    assert(noindex,`${relative}: navigation-only tag archives must be noindex`);
  }
  const jsonld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  assert(jsonld.length,`${relative}: structured data`);
  jsonld.forEach(match => {
    const data = JSON.parse(match[1]); assert.equal(data['@context'],'https://schema.org');
    const article = data['@graph'].find(item => item['@type']==='BlogPosting');
    if(article) {
      articlePaths.push(current.pathname);
      const expectedHeadline = article.headline.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll("'",'&#39;').replaceAll('"','&quot;');
      assert.equal(html.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1],expectedHeadline,`${relative}: article headline matches visible h1`);
      assert.equal(article.author.name,'GuideHollow Editorial',`${relative}: honest attribution`);
      assert(html.includes(`datetime="${article.datePublished}"`) && html.includes(`datetime="${article.dateModified}"`),`${relative}: schema dates match displayed dates`);
      assert.equal(article.mainEntityOfPage,current.href);
      // Google recommends article imagery be representative of the page.
      // Do not claim the sitewide brand card as the article's own image.
      assert.notEqual(article.image, site.url + '/social.png', `${relative}: a generic brand card is not article imagery`);
      assert(!html.includes('<meta property="og:image"'), `${relative}: article social preview should not advertise a generic brand image`);
      assert(!html.includes('<meta name="twitter:image"'), `${relative}: article Twitter preview should not advertise a generic brand image`);
      assert(html.includes('<meta name="twitter:card" content="summary"'), `${relative}: text-only articles need an honest summary card`);
      if (article.image) {
        const image = new URL(article.image);
        assert.equal(image.origin,site.url,`${relative}: article image must be local original evidence`);
        assert(!image.pathname.includes('social'),`${relative}: do not use generic social artwork`);
        assert(files.includes(path.join(root,image.pathname)),`${relative}: article schema image file must exist`);
        assert(html.includes(`src="${image.pathname}"`),`${relative}: schema image must be visible within the article`);
      }
    }
  });
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const raw = match[1].replaceAll('&amp;','&');
    if (/^(?:mailto:|tel:|data:|javascript:)/.test(raw)) continue;
    const url = new URL(raw,current);
    if (url.origin !== current.origin) continue;
    assert(!url.pathname.startsWith('/guidehollow/'),`${relative}: unwanted repository base path`);
    const decoded = decodeURIComponent(url.pathname);
    const target = path.join(root,decoded.endsWith('/') ? `${decoded}index.html` : decoded);
    assert(await stat(target).catch(()=>null),`${relative}: broken internal link ${raw}`);
    if (url.hash) {
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
  assert(html.includes('References and source documents') && html.includes('Related reading') && html.includes('On this page'),`${entry.url}: article navigation and sources`);
}
for (const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const url = new URL(match[1]); assert.equal(url.origin,'https://guidehollow.com');
  assert(await stat(path.join(root,url.pathname,'index.html')).catch(()=>null),`Sitemap route missing: ${url.pathname}`);
}
assert((await readFile(path.join(root,'robots.txt'),'utf8')).includes('https://guidehollow.com/sitemap.xml'));
const homepage = await readFile(path.join(root,'index.html'),'utf8');
assert(homepage.includes('<meta property="og:image" content="https://guidehollow.com/social.png"'), 'Homepage may keep a clearly branded social preview');
assert(homepage.includes('<meta name="twitter:card" content="summary_large_image"'), 'Homepage image card remains visible');
// Cross-check feed modification dates against visible article metadata, JSON-LD
// and the sitemap. An unchanged URL/GUID must not conceal a more recent update.
const feed = await readFile(path.join(root,'rss.xml'),'utf8');
assert(feed.includes('xmlns:dcterms="http://purl.org/dc/terms/"'),'RSS must declare the modification-date namespace');
const feedItems = [...feed.matchAll(/<item>(.*?)<\/item>/gs)].map(match => match[1]);
assert.equal(feedItems.length, publicArticles.length, 'RSS must include every published article exactly once');
for (const entry of publicArticles) {
  const fullUrl = site.url + entry.url;
  const matching = feedItems.filter(item => item.includes(`<guid isPermaLink="true">${fullUrl}</guid>`));
  assert.equal(matching.length, 1, `${entry.url}: stable RSS identifier must appear exactly once`);
  const item = matching[0];
  assert(item.includes(`<link>${fullUrl}</link>`), `${entry.url}: feed URL and stable GUID must agree`);
  const page = await readFile(path.join(root,entry.url,'index.html'),'utf8');
  const schema = JSON.parse(page.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1] ?? '{}');
  const article = schema['@graph']?.find(value => value['@type'] === 'BlogPosting');
  assert(article, `${entry.url}: published article JSON-LD must exist`);
  const published = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
  const modified = item.match(/<dcterms:modified>(.*?)<\/dcterms:modified>/)?.[1];
  assert.equal(new Date(published).toISOString(), article.datePublished, `${entry.url}: RSS original published date must match page metadata`);
  assert.equal(modified, article.dateModified, `${entry.url}: RSS modification date must match page metadata`);
  assert(sitemap.includes(`<loc>${fullUrl}</loc><lastmod>${modified.slice(0,10)}</lastmod>`),`${entry.url}: sitemap lastmod must match real article update`);
}
// The search index is in publication order. Compare the actual RSS item order.
const rssUpdateDates = feedItems.map(item => new Date(item.match(/<dcterms:modified>(.*?)<\/dcterms:modified>/)?.[1]).getTime());
assert(rssUpdateDates.every(Number.isFinite),'Every feed item needs a valid update date');
assert(rssUpdateDates.every((date,index) => index === 0 || rssUpdateDates[index-1] >= date), 'RSS must show the most recently updated articles first');

// Homepage's recent-reading list must show the exact same genuine activity
// as the RSS feed, without changing underlying publication or update metadata.
const homeHtml = await readFile(path.join(root,'index.html'),'utf8');
const activitySection = homeHtml.match(/<section[^>]*aria-labelledby="recent-activity-title"[^>]*>([\s\S]*?)<\/section>/)?.[1];
assert(activitySection, 'Homepage needs a clearly labeled recent editorial activity section');
const homepageLatest = [...activitySection.matchAll(/<h3><a href="(\/(?:guides|ai-tools|prompts|troubleshooting)\/[^"]+)"[^>]*>/g)].map(match => match[1]);
const rssLatest = feedItems.slice(0,5).map(item => {
  const link = item.match(/<link>(.*?)<\/link>/)?.[1];
  assert(link, 'RSS feed item must contain a canonical article URL');
  return new URL(link).pathname;
});
assert.deepEqual(homepageLatest,rssLatest,'Homepage must show the five most recently revised or published articles as ordered in RSS');
const recentDates = [...activitySection.matchAll(/<time datetime="([^"]+)"/g)].map(match=>match[1]);
assert.equal(recentDates.length,5,'Recent homepage articles must show explicit published or revised dates');
recentDates.forEach((date,index)=>{
  const rssModified = rssUpdateDates[index];
  assert.equal(new Date(date).getTime(),rssModified,'Visible homepage activity time must match article revision time');
});

// The claim-verifier source notes must remain readable from the generated
// static HTML, including when scripts or the grading CSV request fail.
const publicClaimNotes = await readFile(path.join(root,'examples/claim-boundary-source-notes.txt'),'utf8');
const claimVerifierHtml = await readFile(path.join(root,'tools/claim-checker/index.html'),'utf8');
const embeddedClaimNotes = claimVerifierHtml.match(/<pre[^>]*id="claim-source-notes"[^>]*>([\\s\\S]*?)<\\/pre>/)?.[1];
assert(embeddedClaimNotes,'Original fictional claim notes must be present in static HTML without any fetch');
assert(!embeddedClaimNotes.includes('Loading the original fictional notes'),'Do not leave a script-dependent loading placeholder');
for (const sourceFact of [
  'FICTIONAL TEACHING DATA',
  'The meeting location is not confirmed.',
  'Offline mode is a proposal and has not been approved.',
  'The room was suggested but has not been reserved.',
]) {
  assert(publicClaimNotes.includes(sourceFact),'Published original notes missing source fact');
  assert(embeddedClaimNotes.includes(sourceFact),'Build did not include the exact source fact in the readable no-JavaScript panel');
}
assert(claimVerifierHtml.includes('The original source notes above remain readable without JavaScript'),'No-JavaScript reader guidance missing');

console.log(`Verified ${htmlFiles.length} HTML pages, ${internalLinks} internal links/assets, ${publicArticles.length} articles, 4 tools, metadata, JSON-LD, feeds, sitemap, and advertising gates.`);

const approvedVisualCount = await verifyApprovedVisuals();
console.log('Verified ' + approvedVisualCount + ' approved Notion figure(s) against SVG bytes and generated HTML.');
