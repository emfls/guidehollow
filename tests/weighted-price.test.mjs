import test from 'node:test';
import assert from 'node:assert/strict';
import { auditWeightedPriceCsv, parsePriceCsv } from '../src/lib/weighted-price.ts';

const sample = `LineID,Channel,Units,UnitPrice
L-101,Web,1,100
L-102,Web,4,25
L-103,Store,10,12
L-104,Web,2,40
L-105,Store,3,30
L-106,Web,0,999
L-107,Store,5,0
L-108,Store,2,20`;

test('reconciles original eight-row fixture and distinguishes means', () => {
  const a = auditWeightedPriceCsv(sample);
  assert.equal(a.rowCount,8); assert.equal(a.units,27); assert.equal(a.revenue,530);
  assert.equal(a.weightedPrice,530/27); assert.equal(a.simplePriceMean,153.25);
  assert.deepEqual(a.zeroUnitLines,['L-106']); assert.deepEqual(a.zeroPriceLines,['L-107']);
  assert.deepEqual(a.channels.map(x=>[x.channel,x.units,x.revenue]),[['Web',7,280],['Store',20,250]]);
  assert.equal(a.channels.reduce((n,c)=>n+c.units,0),a.units);
  assert.equal(a.channels.reduce((n,c)=>n+c.revenue,0),a.revenue);
});
test('quantity error changes totals but not listed-price mean', () => {
  const a = auditWeightedPriceCsv(sample.replace('L-102,Web,4,25','L-102,Web,40,25'));
  assert.equal(a.units,63); assert.equal(a.revenue,1430); assert.equal(a.simplePriceMean,153.25);
  assert.equal(a.channels[0].units,43); assert.equal(a.channels[0].revenue,1180);
});
test('blank price is invalid even if spreadsheet may treat it as zero', () => {
  assert.throws(()=>auditWeightedPriceCsv(sample.replace('L-107,Store,5,0','L-107,Store,5,')),/blanks are not zero/);
});
test('duplicate IDs and negative or fractional units are rejected', () => {
  assert.throws(()=>auditWeightedPriceCsv(sample.replace('L-102,','L-101,')),/duplicate/);
  assert.throws(()=>auditWeightedPriceCsv(sample.replace('L-102,Web,4,25','L-102,Web,-4,25')),/nonnegative/);
  assert.throws(()=>auditWeightedPriceCsv(sample.replace('L-102,Web,4,25','L-102,Web,4.3,25')),/whole number/);
});
test('quotes and CRLF are parsed, malicious cells treated as data only', () => {
  assert.deepEqual(parsePriceCsv('LineID,Channel,Units,UnitPrice\r\n"L,1","A ""quote""",1,2\r\n'),[['LineID','Channel','Units','UnitPrice'],['L,1','A "quote"','1','2']]);
  assert.throws(()=>auditWeightedPriceCsv('LineID,Channel,Units,UnitPrice\nx,Web,0,0'),/undefined/);
  assert.throws(()=>parsePriceCsv('LineID,Channel,Units,UnitPrice\n"oops,Web,1,2'),/unclosed/);
});
