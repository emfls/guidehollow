import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const worksheet = read('public/examples/prompt-injection-boundary-cases.tsv');
const answerKey = read('public/examples/prompt-injection-boundary-answer-key.tsv');
const article = read('src/content/articles/spot-prompt-injection-in-documents.md');
const library = read('src/pages/evidence.astro');

function parseTable(raw, required) {
  assert.match(raw, /^FICTIONAL TRUST-BOUNDARY/m);
  const lines = raw.trimEnd().split('\n');
  const start = lines.findIndex(line => line.startsWith('CaseID\t'));
  assert(start >= 0, 'TSV needs a visible column header');
  const keys = lines[start].split('\t');
  assert.deepEqual(keys, required);
  return lines.slice(start + 1).map(line => {
    const cells = line.split('\t');
    assert.equal(cells.length, keys.length, 'Each case must preserve all TSV columns');
    return Object.fromEntries(keys.map((key, index) => [key, cells[index]]));
  });
}

test('source worksheet stays separate from a complete ten-case editorial answer key', () => {
  const source = parseTable(worksheet, ['CaseID','AuthorizedTask','SourceType','Excerpt']);
  const answers = parseTable(answerKey, ['CaseID','Label','Rationale','SafeReviewAction']);
  const ids = Array.from({length:10}, (_,index) => 'T' + String(index + 1).padStart(2,'0'));
  assert.deepEqual(source.map(row => row.CaseID), ids);
  assert.deepEqual(answers.map(row => row.CaseID), ids);
  assert(source.every(row => row.AuthorizedTask && row.SourceType && row.Excerpt));
  assert(answers.every(row => row.Rationale.length >= 25 && row.SafeReviewAction.length >= 25));
  assert(!worksheet.includes('EMBEDDED_DIRECTIVE') && !worksheet.includes('QUOTED_EXAMPLE'),
    'The reader-facing input worksheet must not leak the answer labels');
  const labels = answers.reduce((counts, row) => {
    counts[row.Label] = (counts[row.Label] || 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(labels, { TASK_DATA:3, EMBEDDED_DIRECTIVE:5, QUOTED_EXAMPLE:2 });
  assert.equal(answers[0].Label, 'TASK_DATA');
  assert.equal(answers[1].Label, 'EMBEDDED_DIRECTIVE');
  assert.equal(answers[4].Label, 'QUOTED_EXAMPLE');
});

test('guide and evidence index link both source-first downloads and disclose non-live scope', () => {
  for(const text of [article,library]) {
    assert(text.includes('/examples/prompt-injection-boundary-cases.tsv'));
    assert(text.includes('/examples/prompt-injection-boundary-answer-key.tsv'));
    assert(/not (?:a live AI|logged live attacks)/i.test(text), 'Must not imply live AI/security testing');
  }
  assert.match(library, /href="#evidence-injection"/);
  assert.match(library, /id="evidence-injection"/);
  assert.match(article, /updatedDate: "2026-11-02"/);
  assert.match(article, /Mutation test:/);
  assert.match(article, /3 TASK_DATA, 5 EMBEDDED_DIRECTIVE and 2 QUOTED_EXAMPLE/);
});
