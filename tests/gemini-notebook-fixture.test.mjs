import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../public/examples/gemini-notebook/', import.meta.url);
const read = (name) => readFile(new URL(name, root), 'utf8');

const canonicalSources = [
  ['exhibit-overview-v1.txt', ['three exhibit rooms', 'begins in Room A']],
  ['training-agenda-v2.txt', ['starts at 1:30 p.m.', 'meet at the reception desk']],
  ['visitor-questions-v1.txt', ['explaining the map', 'photography policy is not included']],
];

test('three reader-downloadable Notebook sources establish precisely the editorial claims', async () => {
  for (const [filename, phrases] of canonicalSources) {
    const body = await read(filename);
    assert.match(body, /FICTIONAL TRAINING FIXTURE — NOT REAL MUSEUM POLICY/);
    for (const phrase of phrases) assert(body.includes(phrase), filename + ': missing source phrase ' + phrase);
  }
  const obsolete = await read('training-agenda-v1-superseded.txt');
  assert.match(obsolete, /SUPERSEDED DRAFT; NOT PART OF THE THREE-SOURCE BASELINE/);
  assert.match(obsolete, /2:00 p.m./);
  assert.match(obsolete, /Room C/);
});

test('claim audit and approved-version register remain independently reviewable', async () => {
  const lines = (await read('claim-audit-worksheet.tsv')).trimEnd().split(/\r?\n/);
  const answerLines = (await read('claim-audit-answer-key.tsv')).trimEnd().split(/\r?\n/);
  assert.equal(lines.shift(), 'case_id\tcandidate_claim\treviewer_decision_before_answer_key');
  assert.equal(answerLines.shift(), 'case_id\tclassification\tsource_basis\tminimum_safe_correction');
  assert.equal(lines.length, 10);
  assert.equal(answerLines.length, 10);
  const cases = lines.map(line => line.split('\t'));
  const answers = answerLines.map(line => line.split('\t'));
  assert(cases.every(row => row.length === 3 && row[2] === ''), 'Worksheet must hide the answer from the reader');
  assert(answers.every(row => row.length === 4 && row.every(Boolean)), 'Answers must contain evidence and repairs');
  assert.deepEqual(cases.map(row => row[0]), answers.map(row => row[0]), 'Case IDs must align');
  assert.equal(new Set(cases.map(row => row[0])).size, 10);
  const counts = Object.fromEntries(['SUPPORTED', 'CONTRADICTED', 'NOT_ESTABLISHED'].map(status => [status, answers.filter(row => row[1] === status).length]));
  assert.deepEqual(counts, { SUPPORTED: 3, CONTRADICTED: 4, NOT_ESTABLISHED: 3 });
  assert.equal(answers.find(row => row[0] === 'C04')[1], 'NOT_ESTABLISHED');
  assert.equal(answers.find(row => row[0] === 'C05')[1], 'NOT_ESTABLISHED');
  const reg = (await read('source-register.tsv')).trimEnd().split(/\r?\n/).slice(1).map(line => line.split('\t'));
  assert.deepEqual(reg.filter(row => row[2] === 'YES').map(row => row[0]), canonicalSources.map(row => row[0]));
  assert.equal(reg.find(row => row[0] === 'training-agenda-v1-superseded.txt')[2], 'NO');
});

test('published tutorial and evidence library link the sources and disclaim live-model testing', async () => {
  const article = await readFile(new URL('../src/content/articles/notebooklm-source-checked-study-guide.md', import.meta.url), 'utf8');
  const library = await readFile(new URL('../src/pages/evidence.astro', import.meta.url), 'utf8');
  for (const filename of [...canonicalSources.map(row => row[0]), 'source-register.tsv', 'claim-audit-worksheet.tsv', 'claim-audit-answer-key.tsv', 'training-agenda-v1-superseded.txt']) {
    assert(article.includes('/examples/gemini-notebook/' + filename), filename + ': missing article download');
    assert(library.includes('/examples/gemini-notebook/' + filename), filename + ': missing evidence library download');
  }
  assert.match(article, /No live Gemini Notebook session or paid-account experiment was performed/);
  assert.match(article, /not\*\* a record of Gemini Notebook answering ten queries/);
  const sources = JSON.parse(article.match(/^sources:\s*(.+)$/m)[1]);
  assert.equal(sources.length, 8, 'Seven named help documents plus official renaming announcement');
  assert(sources.every(source => source.title.startsWith('Google: ') && !source.title.includes('— reference')));
});
