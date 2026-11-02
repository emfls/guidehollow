#!/usr/bin/env node
/**
 * Read-only production smoke test for AdSense reviewer entry points.
 * It never requests ads, changes content, triggers publication, or logs user data.
 * A successful Pages deployment alone is not proof these URLs are publicly readable.
 */
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { site } from '../src/config.ts';

export const reviewerPaths = Object.freeze([
  '/', '/guides/', '/about/', '/contact/', '/privacy-policy/',
  '/editorial-policy/', '/evidence/', '/tools/weighted-price-checker/',
  '/guides/compare-two-documents-ai-without-missing-changes/',
  '/robots.txt', '/sitemap.xml', '/ads.txt', '/rss.xml',
  '/examples/document-diff/old-v1.txt',
  '/examples/prompt-injection-boundary-cases.tsv',
  '/__guidehollow_public_smoke_missing_page__/',
]);
const missingPath = '/__guidehollow_public_smoke_missing_page__/';

export function validatePage(path, body, status, origin, finalUrl) {
  const expected = new URL(path, origin);
  if (new URL(finalUrl).origin !== expected.origin)
    return 'unexpected redirect to another origin: ' + finalUrl;
  if (path === missingPath) return status === 404 ? null : 'unknown route must return HTTP 404, got ' + status;
  if (status !== 200) return 'expected HTTP 200, got ' + status;
  if (path.endsWith('.txt') && path === '/robots.txt') {
    if (!/User-agent:\s*\*/i.test(body) || !/Allow:\s*\//i.test(body) || !body.includes('Sitemap: ' + site.url + '/sitemap.xml'))
      return 'robots.txt must allow crawling and name the canonical sitemap';
    return null;
  }
  if (path === '/ads.txt') {
    const expectedLine = 'google.com, ' + site.ads.publisherId.replace('ca-','') + ', DIRECT, f08c47fec0942fa0';
    return body.trim() === expectedLine ? null : 'ads.txt publisher entry is incorrect';
  }
  if (path === '/sitemap.xml') {
    if (!body.includes('<urlset') || !body.includes('<loc>' + site.url + '/</loc>') ||
        !body.includes('<loc>' + site.url + '/guides/</loc>') ||
        !body.includes('<loc>' + site.url + '/guides/compare-two-documents-ai-without-missing-changes/</loc>'))
      return 'sitemap is missing expected indexable reader routes';
    return null;
  }
  if (path === '/rss.xml')
    return /<rss\b/.test(body) && /<item>/.test(body) ? null : 'RSS must contain published article items';
  if (path === '/examples/document-diff/old-v1.txt')
    return body.includes('S1 | Scope |') && body.includes('S6 | Kit check |') ? null : 'original comparison fixture missing';
  if (path === '/examples/prompt-injection-boundary-cases.tsv')
    return body.includes('CaseID\tAuthorizedTask\tSourceType\tExcerpt') && body.includes('T10\t') ? null : 'public security fixture is incomplete';
  if (!/<html\b[^>]*lang="en-US"/.test(body) || !/<main\b[^>]*id="main"/.test(body) || !/<footer\b/.test(body))
    return 'incomplete HTML page or missing reader landmarks';
  if (!body.includes('rel="canonical" href="' + expected.href + '"'))
    return 'wrong or absent canonical URL';
  if (!body.includes('name="google-adsense-account" content="' + site.ads.publisherId + '"'))
    return 'missing or incorrect AdSense ownership meta tag';
  if (!body.includes('content="index, follow"'))
    return 'reader-facing page unexpectedly noindexed';
  if (path === '/contact/' && !body.includes('mailto:' + site.contactEmail))
    return 'private contact address missing';
  if (path === '/evidence/' && !body.includes('/examples/document-diff/old-v1.txt'))
    return 'evidence page is missing the public original document';
  if (path === '/tools/weighted-price-checker/' && !body.includes('id="weighted-price-csv"'))
    return 'main browser workbench is missing';
  return null;
}

export async function checkLiveSite({origin=site.url, get=fetch, paths=reviewerPaths} = {}) {
  if (origin !== site.url) throw new Error('Only the configured public site may be smoke-tested');
  const results = await Promise.all(paths.map(async path => {
    const url = new URL(path, origin).href;
    try {
      const response = await get(url, {redirect:'follow',signal:AbortSignal.timeout(9000),headers:{accept:'text/html, text/plain, application/xml'}});
      const body = await response.text();
      const problem = validatePage(path, body, response.status, origin, response.url || url);
      return {path,passed:!problem,detail:problem||'OK ('+response.status+')'};
    } catch (error) {
      return {path,passed:false,detail:'network or response error: '+(error?.message || String(error))};
    }
  }));
  return results;
}

export async function retrySmokeCheck({get=fetch, attempts=4, pause=async ms => new Promise(done=>setTimeout(done,ms)), intervalMs=15000} = {}) {
  if (!Number.isSafeInteger(attempts) || attempts < 1 || attempts > 10) throw new Error('invalid retry count');
  let pending = [...reviewerPaths];
  let succeeded = [];
  let lastFailures = [];
  for (let round=1;round<=attempts;round++) {
    const outcomes = await checkLiveSite({get,paths:pending});
    succeeded.push(...outcomes.filter(item=>item.passed));
    lastFailures = outcomes.filter(item=>!item.passed);
    pending = lastFailures.map(item=>item.path);
    if (!pending.length) return {passed:true,rounds:round,results:succeeded};
    if (round<attempts) await pause(intervalMs);
  }
  return {passed:false,rounds:attempts,results:succeeded,failedPaths:pending,failures:lastFailures};
}

export async function main() {
  const result = await retrySmokeCheck();
  const summary = [
    '## GuideHollow public AdSense-readiness smoke check',
    '',
    result.passed ? 'PASS: all reviewer entry points are reachable and consistent.' :
      'WARNING: one or more public reader routes failed the external smoke check. Pages deployment is not automatically rolled back.',
    'Successful routes: '+result.results.length+'/'+reviewerPaths.length,
    'Attempts: '+result.rounds,
    '',
    ...(result.failures||[]).map(item=>'- FAILED: '+item.path+' — '+item.detail),
  ].join('\n') + '\n';
  process.stdout.write(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  if (!result.passed) process.exitCode=1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  await main();
