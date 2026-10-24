import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../public/examples/', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');

test('document evidence binds the reviewed request to the original source', () => {
  const source = read('document-coverage/source.txt');
  const criteria = JSON.parse(read('document-coverage/criteria.json'));
  assert.equal(createHash('sha256').update(source).digest('hex'), criteria.source_sha256);
  assert.equal(source.trim().split(/\s+/).length, criteria.source_words_whitespace);
  assert.ok(read('document-coverage/request.txt').endsWith(source));
  const response = read('document-coverage/response.txt');
  for (let n = 1; n <= 10; n++) assert.match(response, new RegExp(`\\bS${n}\\b`));
  const review = JSON.parse(read('document-coverage/review.json'));
  assert.deepEqual(review.checks.map(c => c.id), criteria.checks.map(c => c.id));
  assert.ok(response.includes(review.correction.observed));
  assert.equal(review.checks.find(c => c.id === 'money').status, 'needs_editorial_correction');
});

test('public claim ledger keeps source checking separate from site actions', () => {
  const ledger = JSON.parse(read('verification-ledger-robots.json'));
  assert.deepEqual(ledger.claims.map(c => c.status), ['contradicted', 'supported', 'unresolved']);
  for (const c of ledger.claims) assert.equal(new URL(c.source).hostname, 'developers.google.com');
  assert.match(ledger.method, /No live index-removal experiment/);
});

test('published execution artifacts retain their hashes and unedited handoff', () => {
  const manifest = JSON.parse(read('observed-evidence-manifest.json'));
  for (const item of manifest.files) {
    const text = read(item.path);
    assert.equal(createHash('sha256').update(text).digest('hex'), item.sha256, item.path);
    assert.doesNotMatch(text, /https:\/\/chatgpt\.com\/c\//);
  }
  const brief = read('context-handoff/response.txt');
  assert.ok(read('context-handoff/resume-request.txt').endsWith(brief));
  const review = JSON.parse(read('context-handoff/review.json'));
  assert.equal(brief.trim().split(/\s+/).length, review.handoff_word_count);
  assert.ok(review.handoff_word_count >= 180);
  assert.equal(review.length_result, 'not_met');
});
