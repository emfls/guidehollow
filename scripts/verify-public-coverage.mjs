#!/usr/bin/env node
/** Read-only postdeploy check of every published HTML page and original evidence file. */
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,relative,sep,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {appendFileSync} from 'node:fs';
import {site} from '../src/config.ts';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const TOOLS=['/tools/ai-prompt-builder/','/tools/ai-response-checklist/','/tools/weighted-price-checker/','/tools/claim-checker/'];
const REQUIRED=['/','/guides/','/ai-tools/','/prompts/','/troubleshooting/','/tools/','/about/','/contact/','/privacy-policy/','/terms/','/editorial-policy/','/evidence/',...TOOLS];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function walk(dir) {
  const entries=await readdir(dir,{withFileTypes:true});
  return (await Promise.all(entries.map(async entry=>entry.isDirectory()?walk(join(dir,entry.name)):[join(dir,entry.name)]))).flat();
}
function articleField(source,key) {
  const fm=source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if(!fm)throw new Error('Article lacks frontmatter');
  const raw=fm.match(new RegExp('^'+key+':\\s*(.*?)\\s*$','m'))?.[1];
  if(raw===undefined)throw new Error('Article lacks '+key);
  return raw.replace(/^["']|["']$/g,'');
}
export async function sourceManifest({root=ROOT,now=new Date()}={}) {
  const sourceFiles=(await walk(join(root,'src/content/articles'))).filter(p=>p.endsWith('.md'));
  const articles=[];
  for(const file of sourceFiles) {
    const source=await readFile(file,'utf8');
    const draft=articleField(source,'draft'),date=Date.parse(articleField(source,'publishedDate'));
    if(!['true','false'].includes(draft)||!Number.isFinite(date))throw new Error('Invalid published metadata: '+relative(root,file));
    if(draft==='true'||date>now.getTime())continue;
    const category=articleField(source,'category'),slug=articleField(source,'slug');
    if(!['guides','ai-tools','prompts','troubleshooting'].includes(category)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      throw new Error('Invalid article URL: '+relative(root,file));
    articles.push('/'+category+'/'+slug+'/');
  }
  articles.sort();
  if(!articles.length||new Set(articles).size!==articles.length)throw new Error('Source articles missing or duplicated');
  const dir=join(root,'public/examples');
  const examples=await Promise.all((await walk(dir)).map(async file=>({
    path:'/examples/'+relative(dir,file).split(sep).join('/'),
    bytes:await readFile(file),
  })));
  examples.sort((a,b)=>a.path.localeCompare(b.path));
  if(!examples.length)throw new Error('Original example files missing');
  return {articles,examples};
}
export function sitemapPaths(xml) {
  if(!/<urlset\b/.test(xml))throw new Error('Sitemap is not an XML urlset');
  const values=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,'&'));
  if(!values.length)throw new Error('Sitemap has no loc elements');
  const paths=values.map(value=>{
    const url=new URL(value);
    if(url.origin!==site.url||url.search||url.hash||!url.pathname.endsWith('/'))
      throw new Error('Invalid sitemap loc '+value);
    return url.pathname;
  });
  if(new Set(paths).size!==paths.length)throw new Error('Duplicate sitemap URLs');
  if(paths.some(p=>p==='/search/'||p==='/404/'||p.startsWith('/tags/')))
    throw new Error('Noindex-only page wrongly included in sitemap');
  return paths;
}
export function verifyInventory({sitemap,rss,index},manifest) {
  const paths=sitemapPaths(sitemap),set=new Set(paths);
  for(const path of [...REQUIRED,...manifest.articles])
    if(!set.has(path))throw new Error('Sitemap omits published route '+path);
  if(!/<rss\b/.test(rss))throw new Error('RSS feed not present');
  const rssPaths=[...rss.matchAll(/<guid isPermaLink="true">([^<]+)<\/guid>/g)].map(m=>{
    const url=new URL(m[1]);if(url.origin!==site.url||url.hash||url.search)throw new Error('Invalid feed URL '+m[1]);
    return url.pathname;
  });
  if(new Set(rssPaths).size!==rssPaths.length||
     JSON.stringify(rssPaths.sort())!==JSON.stringify(manifest.articles))
    throw new Error('RSS GUIDs do not match every published source article');
  let records;try{records=JSON.parse(index);}catch{throw new Error('Public search index is not JSON');}
  if(!Array.isArray(records)||records.some(r=>typeof r?.url!=='string'))
    throw new Error('Public search index records missing');
  const links=records.map(r=>r.url),expected=[...manifest.articles,...TOOLS].sort();
  if(new Set(links).size!==links.length||JSON.stringify(links.sort())!==JSON.stringify(expected))
    throw new Error('Public search index differs from published articles and four tools');
  if(links.some(path=>!set.has(path)))throw new Error('Search entry omitted from sitemap');
  return paths;
}
export function validateIndexableHtml(path,html) {
  if(!/<html\b[^>]*lang="en-US"/.test(html)||!/<main\b[^>]*id="main"/.test(html)||!/<footer\b/.test(html))
    return 'Missing reader HTML landmarks';
  if(!html.includes('rel="canonical" href="'+site.url+path+'"'))return 'Incorrect canonical';
  if(!html.includes('name="robots" content="index, follow"'))return 'Indexable sitemap route unexpectedly noindexed';
  if(!html.includes('name="google-adsense-account" content="'+site.ads.publisherId+'"'))
    return 'AdSense publisher identity meta missing';
  if(!/<h1(?:\s|>)/.test(html))return 'Page lacks an h1';
  if(!site.ads.servingEnabled&&html.includes('pagead2.googlesyndication.com'))
    return 'Ad script present despite disabled serving';
  return null;
}
function checkUrl(requested,response) {
  const actual=new URL(response.url||new URL(requested,site.url));
  if(actual.origin!==site.url||actual.pathname!==requested||actual.hash||actual.search)
    throw new Error('Unexpected redirect to '+actual.href);
  if(response.status!==200)throw new Error('HTTP '+response.status+' (expected 200)');
}
async function request(get,path) {
  return get(new URL(path,site.url).href,{
    redirect:'follow',signal:AbortSignal.timeout(9000),
    headers:{accept:'text/html,text/plain,application/xml,application/json,*/*'},
  });
}
async function boundedMap(items,limit,fn) {
  const out=new Array(items.length);let next=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(next<items.length){const i=next++;out[i]=await fn(items[i]);}
  }));
  return out;
}
async function checkOne(get,item) {
  try {
    const response=await request(get,item.path);
    checkUrl(item.path,response);
    if(item.bytes) {
      const got=Buffer.from(await response.arrayBuffer());
      if(got.length!==item.bytes.length||hash(got)!==hash(item.bytes))
        throw new Error('Downloaded evidence differs from checked-in original ('+got.length+' bytes)');
    } else {
      const error=validateIndexableHtml(item.path,await response.text());
      if(error)throw new Error(error);
    }
    return {path:item.path,passed:true,detail:'OK'};
  } catch(error) {
    return {path:item.path,passed:false,detail:error instanceof Error?error.message:String(error)};
  }
}
async function fetchMetadata(get,path) {
  const response=await request(get,path);checkUrl(path,response);
  return response.text();
}
export async function checkCompletePublication({get=fetch,root=ROOT,now=new Date(),concurrency=6}={}) {
  if(!Number.isInteger(concurrency)||concurrency<1||concurrency>12)throw new Error('Invalid concurrency');
  const manifest=await sourceManifest({root,now});
  const [sitemap,rss,index]=await Promise.all(['/sitemap.xml','/rss.xml','/search-index.json'].map(p=>fetchMetadata(get,p)));
  const paths=verifyInventory({sitemap,rss,index},manifest);
  const items=[...paths.map(path=>({path})),...manifest.examples];
  const results=await boundedMap(items,concurrency,item=>checkOne(get,item));
  return {passed:results.every(r=>r.passed),articlePaths:manifest.articles.length,
    indexablePaths:paths.length,examplePaths:manifest.examples.length,checked:results.length,
    failed:results.filter(r=>!r.passed)};
}
export async function retryCompletePublication({get=fetch,root=ROOT,attempts=4,now=new Date(),pause=async ms=>new Promise(r=>setTimeout(r,ms)),intervalMs=15000}={}) {
  if(!Number.isSafeInteger(attempts)||attempts<1||attempts>10)throw new Error('Invalid attempts');
  let result={passed:false,articlePaths:0,indexablePaths:0,examplePaths:0,checked:0,failed:[]};
  for(let round=1;round<=attempts;round++){
    try{result=await checkCompletePublication({get,root,now});}
    catch(error){result={...result,passed:false,failed:[{path:'publication inventory',detail:error instanceof Error?error.message:String(error)}]};}
    if(result.passed)return {...result,attempts:round};
    if(round<attempts)await pause(intervalMs);
  }
  return {...result,attempts};
}
export async function main() {
  const r=await retryCompletePublication();
  const lines=['## GuideHollow full public publication and evidence audit','',
    r.passed?'PASS: all indexable reader pages and original downloads match checked-in sources.':
      'FAIL: publication inventory, page metadata or evidence downloads differ from checked-in sources.',
    'Published articles: '+r.articlePaths,
    'Indexable sitemap HTML routes: '+r.indexablePaths,
    'Original evidence downloads: '+r.examplePaths,
    'Verified page and download paths: '+r.checked+'/'+(r.indexablePaths+r.examplePaths),
    'Attempts: '+r.attempts,
    ...r.failed.map(f=>'- FAILED: '+f.path+' — '+f.detail),''];
  const summary=lines.join('\n');
  process.stdout.write(summary);
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
  if(!r.passed)process.exitCode=1;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await main();
