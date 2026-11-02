import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeLedgerEntry,exportClaimLedger,LEDGER_VERDICTS} from '../src/lib/claim-ledger.ts';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const input = {source:'Fictional meeting notes §2',claim:'The room is confirmed.',passage:'The location has not been confirmed.',verdict:'CONTRADICTED',note:'The only source explicitly says no room has been confirmed.'};

test('manual claim register records human decisions but rejects evidence-free assertions',()=>{
  const entry=makeLedgerEntry(input,1);
  assert.equal(entry.id,'R001');
  assert.equal(entry.verdict,'CONTRADICTED');
  assert.deepEqual(LEDGER_VERDICTS,['SUPPORTED','CONTRADICTED','UNSUPPORTED']);
  assert.throws(()=>makeLedgerEntry({...input,source:'  '},1),/source label/);
  assert.throws(()=>makeLedgerEntry({...input,claim:'  '},1),/source label/);
  assert.throws(()=>makeLedgerEntry({...input,note:''},1),/review reason/);
  assert.throws(()=>makeLedgerEntry({...input,passage:''},1),/exact source passage/);
  assert.throws(()=>makeLedgerEntry({...input,verdict:'TRUE'},1),/valid review verdict/);
  assert.throws(()=>makeLedgerEntry(input,0),/row number/);
  assert.equal(makeLedgerEntry({...input,verdict:'UNSUPPORTED',passage:''},2).id,'R002');
  assert.throws(()=>makeLedgerEntry({...input,claim:'a'.repeat(2001)},3),/size limit/);
});

test('TSV export preserves rows and neutralizes spreadsheet formula injection and delimiter injection',()=>{
  const a=makeLedgerEntry({...input,
    source:'=HYPERLINK("https://example.invalid","click")',
    claim:'\t@SUM(1,2)\nnext line',
    passage:'  "+1+2"',
    note:'Review this - not an automated certification.\r\nNo approval asserted.',
  },1);
  const b=makeLedgerEntry({...input,verdict:'UNSUPPORTED',passage:'',source:' -10',claim:'no source for holiday hours'},2);
  const exportText=exportClaimLedger([a,b]);
  assert(exportText.startsWith('\uFEFFReviewID\tSourceLabel\tClaim\tExactSourcePassage\tHumanVerdict\tReviewReason\r\n'));
  const rows=exportText.slice(1).trimEnd().split('\r\n');
  assert.equal(rows.length,3,'A newline inside source data must not become a new TSV record');
  assert(rows.every(row=>row.split('\t').length===6),'All entries must preserve exactly six TSV cells');
  assert(rows[1].includes("'=HYPERLINK"), 'Spreadsheet formulas must not execute from the source label');
  assert(rows[1].includes("'@SUM(1,2)"), 'Leading tabs cannot make executable spreadsheet cells');
  assert(rows[1].includes("'\"+1+2\""), 'Quoted formula strings must be neutralized');
  assert(rows[1].includes('\\nnext line'));
  assert(rows[2].includes("'-10"));
  assert.throws(()=>exportClaimLedger([]),/at least one/);
  assert.throws(()=>exportClaimLedger(Array(31).fill(a)),/up to 30/);
});

test('HTML form is inert without JS, avoids server requests and provides genuinely independent reader workflow',()=>{
  const page=read('src/pages/tools/claim-checker.astro');
  const script=read('src/scripts/custom-claim-ledger.ts');
  const guide=read('src/content/articles/how-to-verify-ai-generated-information.md');
  for(const id of ['personal-claim-form','personal-source','personal-claim','personal-passage','personal-verdict','personal-note','personal-ledger-entries','personal-ledger-download']) {
    assert(page.includes('id="'+id+'"'),id+' must be visible on the page');
  }
  assert.match(page, /<form id="personal-claim-form" class="tool-form">[\s\S]*?<fieldset disabled/);
  assert.match(page, /This does <strong>not<\/strong> check whether your source is genuine/);
  assert.match(page, /maximum 30 reviews|Maximum 30 reviews/);
  assert(page.includes("import '../../scripts/custom-claim-ledger'"));
  assert(script.includes('form.addEventListener(\'submit\', event =>'));
  assert(script.includes('event.preventDefault()'));
  assert(script.includes('fields.disabled = false'));
  assert(script.includes('document.createElement(\'a\')'));
  assert(script.includes('document.createElement(\'li\')'));
  assert(script.includes('link.download = \'guidehollow-source-claim-ledger.tsv\''));
  assert(!/\bfetch\s*\(/.test(script), 'The personal worksheet must never transmit reviewer text');
  assert(!/\blocalStorage\b|\bsessionStorage\b/.test(script), 'No automatic persistence of private review text');
  assert(guide.includes('/tools/claim-checker/'));
  assert(guide.includes('manual claim ledger'));
});

test('honest privacy, terms, homepage and search wording describe manual export',()=>{
  const privacy=read('src/pages/privacy-policy.astro');
  const terms=read('src/pages/terms.astro');
  const search=read('src/pages/search-index.json.ts');
  const home=read('src/pages/index.astro');
  assert(privacy.includes('manual claim ledger holds user-entered sources'));
  assert(privacy.includes('exporting creates a TSV on your device'));
  assert(terms.includes('does not verify claims automatically'));
  assert(search.includes('human-reviewed claim evidence ledger'));
  assert(home.includes('export your own manually reviewed claim ledger'));
  assert(privacy.includes('downloads a public fictional answer-key CSV'));
});
