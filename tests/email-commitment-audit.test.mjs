import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function parseTsv(text, expectedColumns) {
  const rows = text.trimEnd().split(/\r?\n/).map(line => line.split('\t'));
  assert.deepEqual(rows.shift(), expectedColumns, 'TSV columns must stay stable');
  assert(rows.every(row => row.length === expectedColumns.length && row.every(value => value.trim())), 'Each field must be present');
  return rows;
}

test('email commitment audit separates reproducible input from editorial grading', async () => {
  const [casesText, answersText, article] = await Promise.all([
    readFile('public/examples/email-commitment-cases.tsv', 'utf8'),
    readFile('public/examples/email-commitment-answer-key.tsv', 'utf8'),
    readFile('src/content/articles/how-to-draft-emails-with-ai.md', 'utf8'),
  ]);
  const cases = parseTsv(casesText, ['case_id', 'approved_brief', 'candidate_draft']);
  const answers = parseTsv(answersText, ['case_id', 'editorial_decision', 'reason', 'minimal_repair']);
  assert.equal(cases.length, 10);
  assert.equal(answers.length, cases.length);
  const ids = cases.map(row => row[0]);
  assert.equal(new Set(ids).size, ids.length, 'Duplicate case IDs');
  assert.deepEqual(answers.map(row => row[0]), ids, 'Answer IDs must match case order');
  const decisions = answers.map(row => row[1]);
  assert(decisions.every(label => ['PASS', 'REWRITE', 'INCOMPLETE'].includes(label)), 'Unknown decision label');
  assert.equal(decisions.filter(label => label === 'PASS').length, 4);
  assert.equal(decisions.filter(label => label === 'REWRITE').length, 5);
  assert.equal(decisions.filter(label => label === 'INCOMPLETE').length, 1);
  const byId = Object.fromEntries(answers.map(row => [row[0], row]));
  assert.equal(byId.E03[1], 'INCOMPLETE', 'Missing fallback deadline is an omission');
  assert.equal(byId.E08[1], 'REWRITE', 'Invented total price is not a missing detail');
  assert.match(article, /\/examples\/email-commitment-cases\.tsv/);
  assert.match(article, /\/examples\/email-commitment-answer-key\.tsv/);
  assert.match(article, /not\*\* a model accuracy|not\*\* a model accuracy/);
});
