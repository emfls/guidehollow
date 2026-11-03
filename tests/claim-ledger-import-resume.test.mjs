import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeLedgerEntry,exportClaimLedger,importClaimLedgerTsv} from '../src/lib/claim-ledger.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const base={
  source:'Fictional notes §3',claim:'The meeting is confirmed.',
  passage:'The meeting location is not confirmed.',
  verdict:'CONTRADICTED',note:'The source explicitly marks the location as unconfirmed.',
};

test('an exported review register can be resumed without changing stable IDs or verdicts',()=>{
  const rows=[
    makeLedgerEntry(base,1),
    makeLedgerEntry({...base,claim:'The unknown venue is North Greenhouse.',passage:'',verdict:'UNSUPPORTED',note:'No named venue is established.'},5),
  ];
  assert.deepEqual(importClaimLedgerTsv(exportClaimLedger(rows)),rows);
  assert.deepEqual(rows.map(x=>x.id),['R001','R005']);
});

test('formula guards and multiline source text round-trip without losing escaped characters',()=>{
  const rows=[
    makeLedgerEntry({...base,source:'=HYPERLINK("https://invalid.example","bad")',
      claim:"'=NOW()",passage:'Quoted note: "proposed"\tPhase 1\\n literal.\nSecond line.',
      note:'  +2+2 starts here.\nRow two.  '},1),
    makeLedgerEntry({...base,source:'-2',claim:'@SUM(1,2)',note:'Backslash \\ and new line\nhere'},2),
  ];
  const exported=exportClaimLedger(rows);
  assert(exported.includes("'=HYPERLINK"));
  assert(exported.includes("''=NOW()"));
  assert(exported.includes("'@SUM(1,2)"));
  const parsed=importClaimLedgerTsv(exported);
  assert.deepEqual(parsed,rows);
  assert.equal(exportClaimLedger(parsed),exported,'Import/export may not accumulate apostrophe guards');
  const lines=exported.slice(1).trimEnd().split('\r\n');
  assert.equal(lines.length,3);
  assert(lines.every(row=>row.split('\t').length===6));
});

test('invalid file content is rejected before replacing any saved review',()=>{
  const good=exportClaimLedger([makeLedgerEntry(base,1)]);
  for(const invalid of [
    '', 'RandomHeader\tWrong\tFile\nx',
    good.replace('ReviewReason','Reason'),
    good.replace('R001','R000'),
    good.replace('R001','R0001'),
    good.replace('CONTRADICTED','YES'),
    good.replace('The meeting is confirmed.',''),
    good.replace('Fictional notes §3',''),
    good.replace('R001\t','R001\tEXTRA\t'),
    good.replace('Fictional notes §3','Bad\\q escape'),
    good.replace('The meeting location is not confirmed.',''),
    good.replace('\r\n','\r'),
    good+'R002\tbad\n',
    good.repeat(32),
  ]) assert.throws(()=>importClaimLedgerTsv(invalid),undefined,'Invalid TSV should be rejected');
  const duplicate=good+good.trimEnd().split('\r\n')[1]+'\r\n';
  assert.throws(()=>importClaimLedgerTsv(duplicate),/duplicates review ID/);
  const tooMany=good.split('\r\n')[0]+'\r\n'+
    Array.from({length:31},(_,i)=>exportClaimLedger([makeLedgerEntry(base,i+1)]).trimEnd().split('\r\n')[1]).join('\r\n')+'\r\n';
  assert.throws(()=>importClaimLedgerTsv(tooMany),/up to 30/);
});

test('import control does not work without JS and never uploads a local file',()=>{
  const ui=read('src/pages/tools/claim-checker.astro');
  const controller=read('src/scripts/custom-claim-ledger.ts');
  const privacy=read('src/pages/privacy-policy.astro');
  const terms=read('src/pages/terms.astro');
  assert(ui.includes('id="personal-ledger-import-file" type="file"'));
  assert(ui.includes('id="personal-ledger-import" disabled'));
  assert(ui.includes('Import and replace current reviews'));
  assert(ui.includes('never sent to GuideHollow'));
  assert(controller.includes('importClaimLedgerTsv(tsv)'));
  assert(controller.includes('await selectedFile.text()'));
  assert(controller.includes('window.confirm('));
  assert(controller.indexOf('const restored = importClaimLedgerTsv(tsv)') < controller.indexOf('entries = restored'));
  assert(controller.indexOf('window.confirm(') < controller.indexOf('entries = restored'));
  assert(controller.includes("importFile.files?.[0] !== selectedFile"));
  assert(controller.includes('nextId = Math.max(...entries.map(entry => Number(entry.id.slice(1)))) + 1'));
  assert(!/\bfetch\s*\(/.test(controller));
  assert(!/\blocalStorage\b|\bsessionStorage\b/.test(controller));
  assert(privacy.includes('optional local claim-ledger TSV import/export'));
  assert(privacy.includes('no upload or server copy occurs'));
  assert(terms.includes('re-import locally to resume'));
});
