import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseClaimCases, scoreClaimCases, PRACTICE_IDS, VERDICTS } from '../src/lib/claim-audit.ts';

test('interactive source verifier loads and preserves the exact 22 published teaching cases', async () => {
  const csv = await readFile(new URL('../public/examples/claim-boundary-audit.csv',import.meta.url),'utf8');
  const cases = parseClaimCases(csv);
  assert.equal(cases.length,22);
  assert.equal(new Set(cases.map(x=>x.id)).size,22);
  assert(PRACTICE_IDS.every(id=>cases.some(x=>x.id===id)));
  assert.deepEqual(cases.reduce((acc,c)=>{acc[c.expected]=(acc[c.expected]||0)+1;return acc},{}),{SUPPORTED:12,UNSUPPORTED:4,CONTRADICTED:6});
  assert.equal(VERDICTS.length,3);
  const correct=Object.fromEntries(cases.map(c=>[c.id,c.expected]));
  let result=scoreClaimCases(cases,correct);
  assert.equal(result.answered,22);
  assert.equal(result.matched,22);
  const practice=cases.filter(c=>PRACTICE_IDS.some(id=>id===c.id));
  result=scoreClaimCases(practice,{G04:'SUPPORTED',G06:'CONTRADICTED'});
  assert.equal(result.total,5);
  assert.equal(result.answered,2);
  assert.equal(result.matched,1);
  assert.equal(result.results[0].chosen,'SUPPORTED');
  assert.equal(result.results[0].matches,false);
  assert.equal(result.results[1].matches,true);
});

test('the source verifier fails closed on misleading or damaged case data', async () => {
  const csv=await readFile(new URL('../public/examples/claim-boundary-audit.csv',import.meta.url),'utf8');
  assert.throws(()=>parseClaimCases(csv.replace('CaseID,Scenario,','CaseID,FakeScenario,')),/unexpected header/);
  assert.throws(()=>parseClaimCases(csv.replace('G01,GARDEN,','G02,GARDEN,')),/duplicate case/);
  assert.throws(()=>parseClaimCases(csv.replace('G01,GARDEN,','G01,SECRET,')),/invalid category/);
  assert.throws(()=>parseClaimCases(csv.replace('G01,GARDEN,','G01,GARDEN,extra,')),/invalid row/);
  assert.throws(()=>parseClaimCases(csv.split('\n').slice(0,-2).join('\n')),/22 published/);
});
