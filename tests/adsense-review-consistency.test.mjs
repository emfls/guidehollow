import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('reader-facing trust and navigation agree on the four current tools', async () => {
  const [search,terms,privacy,contact,config,tools,sourceTool] = await Promise.all([
    read('src/pages/search.astro'),
    read('src/pages/terms.astro'),
    read('src/pages/privacy-policy.astro'),
    read('src/pages/contact.astro'),
    read('src/config.ts'),
    read('src/pages/[category]/index.astro'),
    read('src/pages/tools/claim-checker.astro'),
  ]);
  assert.match(search, /four free browser tools/i);
  for (const name of ['Prompt Builder','Response Quality Checklist','Weighted Average Audit Workbench','Source Claim Verifier']) {
    assert(terms.includes(name), 'Terms must describe '+name);
  }
  assert(privacy.includes('four browser-only tools'));
  assert(privacy.includes('Source Claim Verifier'));
  assert(contact.includes('site.contactEmail'), 'Maintain a directly usable email contact');
  assert.match(config, /contactEmail:\s*'[^']+@[^']+'/);
  assert.match(config, /servingEnabled:\s*false/);
  assert.match(config, /consentReady:\s*false/);
  assert(tools.includes('/tools/claim-checker/'));
  assert(sourceTool.includes('/examples/claim-boundary-audit.csv'));
});

test('the copy control must never copy an empty string from a plain-text evidence panel', async () => {
  const script = await read('src/scripts/site.ts');
  assert(script.includes("const code = pre.querySelector('code')"));
  assert(script.includes('if (!code) return;'));
  assert(script.includes("copyText(code.textContent ?? '', button)"));
  assert(!script.includes("pre.querySelector('code')?.textContent ?? ''"));
});
