import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('downloadable spreadsheet example matches all published arithmetic expectations', async () => {
  const csv = (await readFile(new URL('../public/examples/ai-spreadsheet-sample.csv',import.meta.url),'utf8')).trim().split('\n').map(line => line.split(','));
  assert.deepEqual(csv.shift(),['Region','Status','Amount']);
  const sum = rows => rows.filter(row=>row[0]==='East' && row[1]==='Paid').reduce((total,row)=>total+Number(row[2]),0);
  assert.equal(sum(csv),150);
  const change = (row,column,value) => csv.map((values,index)=>values.map((cell,col)=>index===row && col===column ? value : cell));
  assert.equal(sum(change(1,2,'800')),150);
  assert.equal(sum(change(2,1,'Paid')),200);
  assert.equal(sum(change(3,2,'0')),120);
  assert.equal(sum(csv.map(row=>[row[0],row[0]==='East' ? 'Pending' : row[1],row[2]])),0);
});
