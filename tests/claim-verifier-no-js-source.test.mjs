import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseClaimCases, scoreClaimCases, PRACTICE_IDS } from '../src/lib/claim-audit.ts';

const read = file => readFileSync(new URL('../' + file,import.meta.url),'utf8');

test('claim verifier contains complete readable public notes rather than a JavaScript-only loading placeholder',()=>{
  const html=read('src/pages/tools/claim-checker.astro');
  const raw=read('public/examples/claim-boundary-source-notes.txt');
  assert(html.includes("readFileSync('public/examples/claim-boundary-source-notes.txt','utf8')"));
  assert(html.includes('<pre class="claim-audit-source" id="claim-source-notes" tabindex="0">{originalSourceNotes}</pre>'));
  assert(!html.includes('Loading the original fictional notes.'));
  assert(html.includes('The original source notes above remain readable without JavaScript.'));
  assert(html.includes('automatic feedback')||html.includes('Automatic questions and scoring'));
  assert(html.includes('The interactive questions and reference verdicts still use the'));
  assert(raw.includes('[GARDEN]'));
  assert(raw.includes('[RELEASE]'));
  assert(raw.includes('[EVENT]'));
});

test('interactive verifier downloads the grading CSV only; source stays visible even when it fails',()=>{
  const script=read('src/scripts/claim-checker.ts');
  assert(script.includes("fetch('/examples/claim-boundary-audit.csv',{cache:'no-cache'})"));
  assert(!script.includes("fetch('/examples/claim-boundary-source-notes.txt'"));
  assert(!script.includes("sourcePanel.textContent ="));
  assert(!script.includes("notesResponse"));
  assert(script.includes('The original source notes above are still readable.'));
  assert(script.includes("if (!rowsResponse.ok)"));
  assert(script.includes('parseClaimCases(await rowsResponse.text())'));
  assert(script.includes("form.addEventListener('submit', evaluate)"));
  const cases=parseClaimCases(read('public/examples/claim-boundary-audit.csv'));
  const selected=cases.filter(row=>PRACTICE_IDS.includes(row.id));
  assert.equal(selected.length,5);
  const answers={G04:'SUPPORTED',G06:'CONTRADICTED',G09:'SUPPORTED',R02:'CONTRADICTED',E06:'SUPPORTED'};
  const outcome=scoreClaimCases(selected,answers);
  assert.equal(outcome.matched,4);
  assert.equal(outcome.total,5);
});

test('privacy and terms descriptions accurately reflect static source and one downloaded answer key',()=>{
  const privacy=read('src/pages/privacy-policy.astro');
  const terms=read('src/pages/terms.astro');
  const verifier=read('scripts/verify-build.mjs');
  assert(privacy.includes('includes the original fictional teaching notes directly in its static page'));
  assert(privacy.includes('downloads a public fictional answer-key CSV'));
  assert(terms.includes('displays its published fictional source notes directly in the page'));
  assert(terms.includes('downloads the public answer-key CSV'));
  assert(!privacy.includes('downloads two public fictional teaching files'));
  assert(verifier.includes('const embeddedClaimNotes'));
  assert(verifier.includes('Original fictional claim notes must be present in static HTML'));
  assert(verifier.includes('The meeting location is not confirmed.'));
});
