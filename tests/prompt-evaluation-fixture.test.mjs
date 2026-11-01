import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('published fictional prompt evaluation fixture reproduces its declared math', async () => {
  const text = await readFile(new URL('../public/examples/prompt-evaluation-routing.csv',import.meta.url),'utf8');
  const rows = text.trim().split(/\r?\n/).map(row=>row.split(','));
  assert.deepEqual(rows.shift(),['CaseID','Message','ExpectedLabel','IllustrativePromptA','IllustrativePromptB']);
  assert.equal(rows.length,8);
  assert.deepEqual(rows.map(row=>row[0]),['T01','T02','T03','T04','T05','T06','T07','T08']);
  assert(rows.every(row=>row.length===5),'Every dataset row must have exactly five columns');
  const labels=new Set(['BILLING','ACCESS','TECHNICAL','OTHER']);
  assert(rows.every(row=>row.slice(2).every(label=>labels.has(label))));
  assert.equal(rows.filter(row=>row[2]===row[3]).length,5,'Illustrative A must match 5/8');
  assert.equal(rows.filter(row=>row[2]===row[4]).length,7,'Illustrative B must match 7/8');
  assert.deepEqual(rows.find(row=>row[0]==='T07')?.slice(2),['OTHER','ACCESS','ACCESS'],'The explicit ambiguous failure must remain visible');
});
