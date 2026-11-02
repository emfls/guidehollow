import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compareSections, parseSections } from '../public/examples/document-diff/section-diff.mjs';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const original = read('public/examples/document-diff/old-v1.txt');
const revised = read('public/examples/document-diff/new-v2.txt');
const answerKey = read('public/examples/document-diff/expected-changes.tsv');
const article = read('src/content/articles/compare-two-documents-ai-without-missing-changes.md');
const evidence = read('src/pages/evidence.astro');

test('downloaded source texts exactly match the two six-line blocks in the guide', () => {
  const old = article.split('### OLD (v1)')[1]?.match(/\x60{3}plain\n([\s\S]*?)\n\x60{3}/);
  const next = article.split('### NEW (v2)')[1]?.match(/\x60{3}plain\n([\s\S]*?)\n\x60{3}/);
  assert(old && next);
  assert.equal(original.trimEnd(), old[1].trimEnd());
  assert.equal(revised.trimEnd(), next[1].trimEnd());
  assert.equal(parseSections(original).size, 6);
  assert.equal(parseSections(revised).size, 6);
});

test('all seven reference records and counts match the standalone source comparison', () => {
  const result = compareSections(original, revised);
  assert.deepEqual(result.counts, { MODIFIED: 3, REMOVED_FROM_TEXT: 1, ADDED: 1, UNCHANGED: 2 });
  assert.equal(result.rows.length, 7);
  const [heading, ...lines] = answerKey.trimEnd().split('\n');
  assert.equal(heading, 'SectionID\tChangeType\tOLDClause\tNEWClause\tReviewQuestion');
  assert.equal(lines.length, 7);
  const records = lines.map(line => line.split('\t'));
  assert(records.every(row => row.length === 5 && row[4].length > 18));
  assert.deepEqual(records.map(row => row[0]), result.rows.map(row => row.id));
  for (let index = 0; index < records.length; index++) {
    const row = result.rows[index];
    const [id, status, before, after] = records[index];
    assert.deepEqual([id,status,before,after],[row.id,row.kind,row.old,row.current]);
  }
});

test('fail closed on duplicate IDs, malformed lines and missing source records', () => {
  assert.throws(() => parseSections('S1 | A | one\nS1 | A | two'), /duplicate section ID S1/);
  assert.throws(() => parseSections('S1 | A | one\n\nS2 | B | two'), /blank interior record/);
  assert.throws(() => parseSections('S1 | A | one\nunexpected row'), /invalid ID/);
  assert.throws(() => parseSections(''), /empty/);
  assert.throws(() => compareSections(original, revised + 'S3 | Deposit | $999.\n'), /duplicate section ID S3/);
  const oldWithoutS4 = original.split('\n').filter(line => !line.startsWith('S4 | ')).join('\n');
  assert.equal(compareSections(oldWithoutS4, revised).counts.REMOVED_FROM_TEXT, 0);
  const reversed = compareSections(revised, original);
  assert.equal(reversed.rows.find(row => row.id === 'S4').kind,'ADDED');
  assert.equal(reversed.rows.find(row => row.id === 'S7').kind,'REMOVED_FROM_TEXT');
});

test('public command runs and both pages link complete downloadable evidence', () => {
  const path = name => fileURLToPath(new URL('../public/examples/document-diff/' + name, import.meta.url));
  const run = spawnSync(process.execPath, [path('section-diff.mjs'), path('old-v1.txt'), path('new-v2.txt')], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /OLD=6 NEW=6 UNIQUE=7/);
  assert.match(run.stdout, /MODIFIED=3 REMOVED_FROM_TEXT=1 ADDED=1 UNCHANGED=2/);
  for (const name of ['old-v1.txt','new-v2.txt','expected-changes.tsv','section-diff.mjs']) {
    assert(article.includes('/examples/document-diff/' + name));
    assert(evidence.includes('/examples/document-diff/' + name));
  }
  assert.match(article, /not a live AI model test/);
  assert.match(evidence, /not an observed AI response/);
});
