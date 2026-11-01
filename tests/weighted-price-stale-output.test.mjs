import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { auditWeightedPriceCsv } from '../src/lib/weighted-price.ts';

const read = path => readFile(new URL('../' + path, import.meta.url),'utf8');

test('the weighted-price workbench invalidates old result tables on every CSV edit', async () => {
  const page = await read('src/pages/tools/weighted-price-checker.astro');
  const inputStart = page.indexOf("input.addEventListener('input', () => {");
  const submitStart = page.indexOf("form.addEventListener('submit', event => {");
  assert(inputStart > 0, 'An input-change listener must exist');
  assert(submitStart > inputStart, 'Input invalidation must be wired before calculation');
  const listener = page.slice(inputStart, page.indexOf('\n    });', inputStart));
  assert(listener.includes('result.replaceChildren()'),'Previously rendered audit tables must be cleared');
  assert(listener.includes("summary.textContent = 'Not calculated for the current CSV."),'Previously rendered totals must be cleared');
  assert(listener.includes("status.textContent = 'CSV changed."),'The visitor needs a visible recalculate warning');
  assert(page.includes('Changing the CSV clears the previous calculation immediately'));
  assert(page.includes('remove the old 27-unit result'));
  const submit = page.slice(submitStart);
  assert(submit.includes('result.replaceChildren();'),'Recalculating must also clear previous detail');
  assert(submit.includes("summary.textContent = 'No result: correct the input and try again.'"), 'Invalid calculations must not leave valid-looking totals');
});

test('a changed sample must produce changed totals, never the original 27-unit result', async () => {
  const fixture = await read('public/examples/weighted-price-sample.csv');
  const original = auditWeightedPriceCsv(fixture);
  assert.equal(original.units,27);
  assert.equal(original.revenue,530);
  const changed = fixture.replace('L-102,Web,4,25','L-102,Web,40,25');
  assert.notEqual(changed,fixture);
  const recalculated = auditWeightedPriceCsv(changed);
  assert.equal(recalculated.units,63);
  assert.equal(recalculated.revenue,1430);
  assert.equal(Number(recalculated.weightedPrice.toFixed(2)),22.70);
});
