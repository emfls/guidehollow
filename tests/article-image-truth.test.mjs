import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('published article schema only uses real in-article diagrams, not a sitewide marketing card',()=>{
  const article=read('src/pages/[category]/[slug].astro');
  assert.doesNotMatch(article,/image:\s*[^,]*social\.png/,'Generic branding is not a representative illustration of every article');
  assert(article.includes('...(visual ? { image: new URL(visual.src, site.url).href } : {})'));
  assert(article.includes('<img src={visual.src} alt={visual.alt}'),'Schema image must correspond to visible article content');
  assert(article.includes("'what-is-generative-ai':"));
  assert(article.includes("'extract-meeting-action-items-with-ai':"));
  assert.equal((article.match(/src: '\/visuals\//g)||[]).length,2,'Only two original illustrated topics are supplied');
  for(const file of ['first-ai-task-source-check.svg','meeting-notes-approval-boundary.svg']){
    const svg=read('public/visuals/'+file);
    assert.match(svg,/<svg\b/);
    assert(svg.length>600,file+' should contain a meaningful original vector drawing');
  }
});

test('article OG and Twitter cards no longer impersonate unrelated generic illustrations',()=>{
  const layout=read('src/layouts/Base.astro');
  assert(layout.includes("const isArticle = schema?.['@type'] === 'BlogPosting'"));
  assert(layout.includes("isArticle ? undefined : site.url + '/social.png'"));
  assert(layout.includes('{shareImage && <meta property="og:image" content={shareImage} />}'));
  assert(layout.includes('{shareImage && <meta name="twitter:image" content={shareImage} />}'));
  assert(layout.includes("content={shareImage ? 'summary_large_image' : 'summary'}"));
  assert(layout.includes('content={pageTitle}'),'Article previews retain real article titles');
  assert(layout.includes('content={description}'),'Article previews retain real article descriptions');
  assert.doesNotMatch(layout,/<meta property="og:image" content=\{.+social\.png/,'No blanket brand artwork on every page');
});

test('production verifier checks visible image agreement and absence of bogus article social image',()=>{
  const verifier=read('scripts/verify-build.mjs');
  assert(verifier.includes('assert.notEqual(article.image, site.url'));
  assert(verifier.includes('article schema image file must exist'));
  assert(verifier.includes('schema image must be visible within the article'));
  assert(verifier.includes('article social preview should not advertise a generic brand image'));
  assert(verifier.includes('Homepage may keep a clearly branded social preview'));
});
