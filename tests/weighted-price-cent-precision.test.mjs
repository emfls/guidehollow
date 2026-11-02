import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditWeightedPriceCsv } from '../src/lib/weighted-price.ts';

const header = 'LineID,Channel,Units,UnitPrice\n';
const audit = (...lines) => auditWeightedPriceCsv(header + lines.join('\n'));
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('decimal prices reconcile in exact hundredths across rows and channels', () => {
  const a = audit('A,Web,3,0.10','B,Store,2,0.20','C,Web,1,0.01');
  assert.equal(a.rowCount, 3);
  assert.equal(a.units, 6);
  assert.equal(a.revenue, 0.71);
  assert.equal(a.weightedPrice, 71 / 600);
  assert.deepEqual(a.rows.map(row => row.revenue), [0.3,0.4,0.01]);
  assert.deepEqual(a.channels.map(row => [row.channel,row.units,row.revenue]),[['Web',4,0.31],['Store',2,0.4]]);
  assert.equal(a.channels.reduce((total,row) => Math.round(total * 100) + Math.round(row.revenue * 100),0),71);
});

test('do not silently drop fractional price precision or a missing price', () => {
  assert.throws(() => audit('A,Web,1,0.001'), /at most two decimal places/);
  assert.throws(() => audit('A,Web,1,12.345'), /at most two decimal places/);
  assert.throws(() => audit('A,Web,1,'), /blanks are not zero/);
  assert.equal(audit('A,Web,1,.05').revenue,0.05);
});

test('reject per-row and aggregate amounts that would lose displayed-cent precision', () => {
  assert.throws(() => audit('A,Web,1,900719925474.10'), /UnitPrice exceeds the supported two-decimal precision/);
  assert.throws(() => audit('A,Web,3,400000000000.00'), /row revenue exceeds the supported two-decimal precision/);
  assert.throws(() => audit('A,Web,1,500000000000.00','B,Store,1,500000000000.00'), /totals exceed the supported two-decimal precision/);
});

test('public tool and related guide explain the exact-cent boundary and give a reproducible decimal case', () => {
  const page=read('src/pages/tools/weighted-price-checker.astro');
  const article=read('src/content/articles/verify-ai-weighted-average-price-spreadsheet.md');
  assert(page.includes('exact integer hundredths'));
  assert(page.includes('0.71'));
  assert(page.includes('0.001'));
  assert(article.includes('exact integer hundredths'));
  assert(article.includes('updatedDate: "2026-11-02"'));
});
