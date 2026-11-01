import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditWeightedPriceCsv, parsePriceCsv } from '../src/lib/weighted-price.ts';

const sample=readFileSync(new URL('../public/examples/weighted-price-sample.csv',import.meta.url),'utf8');
const page=readFileSync(new URL('../src/pages/tools/weighted-price-checker.astro',import.meta.url),'utf8');

test('blank CSV rows inside the dataset must never be silently skipped',()=>{
  for(const modified of [
    sample.replace('L-103,Store,10,12\nL-104', 'L-103,Store,10,12\n\nL-104'),
    sample.replace('LineID,Channel,Units,UnitPrice\n', 'LineID,Channel,Units,UnitPrice\n\n'),
    sample.replace('L-102,Web,4,25\nL-103', 'L-102,Web,4,25\n  \nL-103'),
  ]){
    assert.notEqual(modified,sample,'Each fixture must be mutated');
    assert.throws(()=>parsePriceCsv(modified),/Blank CSV record \d+: a source row may have been lost/);
    assert.throws(()=>auditWeightedPriceCsv(modified),/Reconcile the original file/);
  }
});

test('trailing newline and blank lines are not incorrectly treated as dropped source rows',()=>{
  const baseline=auditWeightedPriceCsv(sample);
  for(const trailing of ['\n','\n\n','\n \n\t\n','\r\n\r\n']){
    const res=auditWeightedPriceCsv(sample.trimEnd()+trailing);
    assert.equal(res.rowCount,baseline.rowCount);
    assert.equal(res.units,27);
    assert.equal(res.revenue,530);
  }
  assert.throws(()=>auditWeightedPriceCsv(sample.replace('L-107,Store,5,0','L-107,Store,5,')),/blanks are not zero/);
  assert.equal(parsePriceCsv('LineID,Channel,Units,UnitPrice\r\n"L,1","Store A",1,2\r\n').length,2);
});

test('manual audit fallback is meaningful when JavaScript cannot run',()=>{
  assert.match(page,/<noscript><p[^>]*>The interactive calculation requires JavaScript/);
  assert.match(page,/download the fictional eight-row sample CSV/);
  assert.match(page,/530 revenue ÷ 27 units/);
  assert.match(page,/id="calculate-weighted-price" disabled/);
  assert.match(page,/id="reset-weighted-price" disabled/);
  assert.match(page,/calculate\.disabled = false;/);
  assert.match(page,/restore\.disabled = false;/);
  assert.match(page,/restore\.addEventListener\('click'/);
  assert.match(page,/Blank CSV records between populated records/i);
  assert.match(page,/Check for accidentally omitted CSV records/);
  assert.match(page,/Do not simply delete the empty line/);
});

test('recalculation still clears stale output on changed CSV and failure',()=>{
  assert.match(page,/input\.addEventListener\('input', \(\) => \{/);
  assert.match(page,/result\.replaceChildren\(\);/);
  assert.match(page,/summary\.textContent = 'No result: correct the input and try again\.'/);
  assert.match(page,/status\.textContent = e instanceof Error \? e\.message/);
});
