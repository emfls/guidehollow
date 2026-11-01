import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../public/examples/json-fidelity/', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');

test('JSON teaching source and published reference have the same two factual records', () => {
  const notes = read('source-notes.txt');
  const reference = JSON.parse(read('reference.json'));
  const schema = JSON.parse(read('ticket-schema.json'));
  assert.match(notes, /NOT CUSTOMER DATA/);
  assert.match(notes, /T-101.*download link shows an error/);
  assert.match(notes, /T-102.*E42/);
  assert.match(notes, /resolved after a corrected CSV/);
  assert.deepEqual(reference.records.map(row => [row.id,row.error_code,row.resolved]), [
    ['T-101',null,null], ['T-102','E42',true],
  ]);
  assert.equal(schema.properties.records.minItems, 2);
  assert.equal(schema.properties.records.maxItems, 2);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.records.items.additionalProperties, false);
});

test('ten original candidates reproduce the independently disclosed three-layer classifications', () => {
  const candidates = JSON.parse(read('candidate-outputs.json'));
  assert.equal(candidates.length, 10);
  assert.equal(new Set(candidates.map(row=>row.id)).size,10);
  const expected = new Map([
    ['J01','PASS'],['J02','SYNTAX'],['J03','STRUCTURE'],['J04','STRUCTURE'],
    ['J05','SOURCE'],['J06','SOURCE'],['J07','SOURCE'],['J08','STRUCTURE'],
    ['J09','STRUCTURE'],['J10','SOURCE'],
  ]);
  const answers = read('answer-key.tsv').trimEnd().split(/\r?\n/).slice(1).map(line => line.split('\t'));
  assert.equal(answers.length,10);
  for(const row of answers) {
    assert.equal(row.length,4);
    assert.equal(row[1],expected.get(row[0]),'Wrong answer for '+row[0]);
  }
  assert.deepEqual(answers.map(row=>row[0]),candidates.map(row=>row.id));
  const run=spawnSync(process.execPath,['audit.mjs'],{cwd:fileURLToPath(root),encoding:'utf8',timeout:10000});
  assert.equal(run.status,0,run.stderr+'\n'+run.stdout);
  for(const [id,status] of expected) assert(run.stdout.includes(id+' '+status+'\n'),id+' was not classified correctly');
  assert.match(run.stdout,/"PASS":1,"SYNTAX":1,"STRUCTURE":4,"SOURCE":4/);
  assert.match(run.stdout,/NOT a general JSON Schema validator|No live AI model/);
});

test('reader guide and evidence library offer direct downloads and disclose experiment scope', () => {
  const guide=readFileSync(new URL('../src/content/articles/ai-valid-json-without-inventing-data.md',import.meta.url),'utf8');
  const library=readFileSync(new URL('../src/pages/evidence.astro',import.meta.url),'utf8');
  for(const filename of ['source-notes.txt','reference.json','ticket-schema.json','candidate-outputs.json','answer-key.tsv','audit.mjs']) {
    assert(guide.includes('/examples/json-fidelity/'+filename),'Guide link missing '+filename);
    assert(library.includes('/examples/json-fidelity/'+filename),'Evidence link missing '+filename);
  }
  assert.match(guide,/not a general-purpose JSON Schema implementation/i);
  assert.match(guide,/No candidate is represented as a captured model response/);
  assert.match(guide,/minItems/);
  assert.match(guide,/maxItems/);
  assert.match(guide,/updatedDate: "2026-11-02"/);
});
