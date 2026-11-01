import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseClaimCases, scoreClaimCases, PRACTICE_IDS } from '../src/lib/claim-audit.ts';

const dataUrl = new URL('../public/examples/claim-boundary-audit.csv', import.meta.url);

test('a five-case answer set with one deliberately wrong label must score exactly four, not one', async () => {
  const cases = parseClaimCases(await readFile(dataUrl, 'utf8'))
    .filter(item => PRACTICE_IDS.includes(item.id));
  assert.equal(cases.length, 5);
  const intended = {
    G04: 'SUPPORTED', // incorrect: location is unconfirmed
    G06: 'CONTRADICTED',
    G09: 'SUPPORTED',
    R02: 'CONTRADICTED',
    E06: 'SUPPORTED',
  };
  const outcome = scoreClaimCases(cases, intended);
  assert.equal(outcome.answered, 5);
  assert.equal(outcome.matched, 4);
  assert.equal(outcome.total, 5);
  assert.deepEqual(outcome.results.filter(x => !x.matches).map(x=>x.id), ['G04']);
  assert.match(outcome.results[0].reason, /location is not confirmed/);
});

test('a partially answered real-browser exercise should never display a misleading score', async () => {
  const client = await readFile(new URL('../src/scripts/claim-checker.ts', import.meta.url), 'utf8');
  assert(client.includes('if (result.answered !== result.total)'));
  assert(client.includes('Select a verdict for every claim before grading.'));
  assert(client.includes("form.addEventListener('change', updateSelectionCount)"));
  assert(client.includes("input.setAttribute('aria-label', item.id + ': ' + readable[verdict])"));
  assert(client.includes("label.htmlFor = input.id"));
  const cases = parseClaimCases(await readFile(dataUrl, 'utf8'))
    .filter(item => PRACTICE_IDS.includes(item.id));
  const selectedOnlyOne = scoreClaimCases(cases, { G06:'CONTRADICTED' });
  assert.equal(selectedOnlyOne.answered, 1);
  assert.equal(selectedOnlyOne.matched, 1);
  assert.equal(selectedOnlyOne.total, 5);
  assert(selectedOnlyOne.answered !== selectedOnlyOne.total);
});
