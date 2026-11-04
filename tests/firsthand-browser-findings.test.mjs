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
  assert(client.includes("form.addEventListener('change', () => {"));
  assert(client.includes('rememberVisibleAnswers();'));
  assert(client.includes('updateSelectionCount();'));
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


test('published post-fix five-answer browser observation matches the real scoring code and retained history', async () => {
  const ledger = JSON.parse(await readFile(new URL('../public/examples/firsthand-browser-qa-2026-11-01.json', import.meta.url),'utf8'));
  const run = ledger.trials.find(trial => trial.id === 'claim-five-answer-full-browser-verified');
  const ambiguous = ledger.trials.find(trial => trial.id === 'claim-practice-selection-ambiguity');
  assert(run, 'The direct production-browser evidence must remain publicly available');
  assert.equal(run.outcome,'pass');
  assert.equal(run.runUrl,'https://agent.tinyfish.ai/runs/e6804798-a2cd-4872-9283-a2c5761d5391');
  const expectedInput = {
    G04:'SUPPORTED', G06:'CONTRADICTED', G09:'SUPPORTED',
    R02:'CONTRADICTED', E06:'SUPPORTED'
  };
  assert.deepEqual(run.observed.checkedAnswers,expectedInput);
  const cases=parseClaimCases(await readFile(dataUrl,'utf8')).filter(item=>PRACTICE_IDS.includes(item.id));
  const score=scoreClaimCases(cases,run.observed.checkedAnswers);
  assert.equal(score.answered,5);
  assert.equal(score.matched,4);
  assert.equal(run.observed.reportedScore,'4 of 5');
  assert.deepEqual(score.results.filter(item=>item.matches).map(item=>item.id),run.observed.matchedCaseIds);
  assert.deepEqual(score.results.filter(item=>!item.matches).map(item=>item.id),run.observed.mismatchedCaseIds);
  assert.equal(run.observed.preSubmitStatus,'5 of 5 claims answered. All choices are selected; you can now check your answers.');
  assert.match(run.observed.g04Reason,/location is not confirmed/);
  assert.equal(ambiguous.outcome,'inconclusive','Preserve the uncertain earlier observation rather than rewriting history');
  assert.match(ambiguous.limits,/cannot be inferred retrospectively/);
});
test('editing a checked verdict clears stale scoring output before another grade', async () => {
  const script=await readFile(new URL('../src/scripts/claim-checker.ts',import.meta.url),'utf8');
  const update=script.split('function updateSelectionCount() {')[1]?.split('function render(')[0] ?? '';
  assert(update.includes('feedback?.replaceChildren()'),'Old results should not remain visible after editing a choice');
  assert(script.includes("form.addEventListener('change', () => {"));
  assert(script.includes('rememberVisibleAnswers();'));
  assert(script.includes('updateSelectionCount();'));
  assert(script.includes("if (result.answered !== result.total)"));
});
