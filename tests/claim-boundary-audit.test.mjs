import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fixture = new URL('../public/examples/claim-boundary-audit.csv', import.meta.url);
const source = new URL('../public/examples/claim-boundary-source-notes.txt', import.meta.url);
const expected = {
  G01:'SUPPORTED',G02:'SUPPORTED',G03:'SUPPORTED',G04:'UNSUPPORTED',
  G05:'UNSUPPORTED',G06:'CONTRADICTED',G07:'SUPPORTED',
  G08:'SUPPORTED',G09:'SUPPORTED',G10:'UNSUPPORTED',
  R01:'SUPPORTED',R02:'CONTRADICTED',R03:'SUPPORTED',
  R04:'CONTRADICTED',R05:'SUPPORTED',R06:'UNSUPPORTED',
  E01:'SUPPORTED',E02:'CONTRADICTED',E03:'SUPPORTED',
  E04:'CONTRADICTED',E05:'CONTRADICTED',E06:'SUPPORTED'
};

test('the 22-case teaching audit is complete, labeled and reproducible', async () => {
  const [raw,notes] = await Promise.all([readFile(fixture,'utf8'),readFile(source,'utf8')]);
  const lines = raw.trimEnd().split(/\r?\n/);
  assert.equal(lines.shift(),'CaseID,Scenario,Claim,ExpectedVerdict,EditorialReason');
  assert.equal(lines.length,22);
  const rows = lines.map(line => {
    const columns = line.split(',');
    assert.equal(columns.length,5,'No unescaped CSV delimiters: '+line);
    const [id,scenario,claim,verdict,reason]=columns;
    assert.equal(scenario,{G:'GARDEN',R:'RELEASE',E:'EVENT'}[id[0]]);
    assert.equal(verdict,expected[id],id+': editorial answer key changed');
    assert(claim.length>=15 && reason.length>=20,id+': missing contextual explanation');
    return {id,verdict};
  });
  assert.equal(new Set(rows.map(r=>r.id)).size,22);
  assert.deepEqual(Object.keys(expected).sort(),rows.map(r=>r.id).sort());
  const counts=rows.reduce((result,r)=>{result[r.verdict]=(result[r.verdict]||0)+1;return result},{});
  assert.deepEqual(counts,{SUPPORTED:12,UNSUPPORTED:4,CONTRADICTED:6});
  assert(notes.includes('FICTIONAL TEACHING DATA'));
  for(const section of ['[GARDEN]','[RELEASE]','[EVENT]']) assert(notes.includes(section));
  for(const evidence of ['Saturday at 10 a.m.','3 bags cost $8 each','2 trays cost $6 each',
     'Offline mode is a proposal','No release date has been agreed',
     'two hours long','has not been reserved','No event date has been selected'])
    assert(notes.includes(evidence),'Missing primary teaching input: '+evidence);
  assert.equal(3*8+2*6,36,'Arithmetic is a subtotal only; delivery is unknown');
  assert.equal(3*8,24);
  assert.equal(2*6,12);
});
