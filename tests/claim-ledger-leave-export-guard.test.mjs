import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeLedgerEntry,exportClaimLedger,importClaimLedgerTsv} from '../src/lib/claim-ledger.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('TSV export contains saved reviewed entries, never unsaved form fields',()=>{
  const saved=makeLedgerEntry({
    source:'Fictional source',claim:'The meeting is confirmed.',
    passage:'The location is not confirmed.',verdict:'CONTRADICTED',
    note:'The notes contradict confirmation.'
  },1);
  const draft='A new unsaved claim should not appear in the export.';
  const tsv=exportClaimLedger([saved]);
  assert.equal(importClaimLedgerTsv(tsv).length,1);
  assert(!tsv.includes(draft));
  assert(tsv.includes(saved.claim));
});

test('manual worksheet confirms unfinished Add/Edit fields before exporting saved-only rows',()=>{
  const script=read('src/scripts/custom-claim-ledger.ts');
  const begin=script.indexOf("download.addEventListener('click'");
  const end=script.indexOf("importFile.addEventListener('change'",begin);
  const handler=script.slice(begin,end);
  assert(begin>=0 && end>begin);
  assert(handler.includes('hasUnfinishedFormInput() && !window.confirm('));
  assert(handler.includes('TSV contains only saved review rows'));
  assert(handler.includes('Download cancelled. Your unfinished form and saved review rows are unchanged.'));
  assert(handler.indexOf('window.confirm(')<handler.indexOf('exportClaimLedger(entries)'));
  assert(handler.includes('return;'),'Cancel should stop before creating a Blob');
});

test('review text gets an optional native leave guard, without auto-saving or uploads',()=>{
  const script=read('src/scripts/custom-claim-ledger.ts');
  const page=read('src/pages/tools/claim-checker.astro');
  const privacy=read('src/pages/privacy-policy.astro');
  assert(script.includes('function hasReviewWork(): boolean'));
  assert(script.includes('return entries.length > 0 || hasUnfinishedFormInput();'));
  assert(script.includes("window.addEventListener('beforeunload', event => {"));
  assert(script.includes('if (!hasReviewWork()) return;'));
  assert(script.includes("event.preventDefault();\n    event.returnValue = '';"));
  assert(!/\b(?:localStorage|sessionStorage|sendBeacon)\b/.test(script));
  assert(!/\bfetch\s*\(/.test(script));
  assert(page.includes('saved rows only'));
  assert(page.includes('some browsers suppress that warning'));
  assert(privacy.includes('the browser may show a native leave warning'));
  assert(privacy.includes('not unfinished Add/Edit fields'));
});
