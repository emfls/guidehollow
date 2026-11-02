import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file,import.meta.url),'utf8');
const cases = [
  {
    slug:'audit-ai-csv-duplicate-removal-without-losing-rows',
    file:'csv-duplicate-orders-fictional.csv',
    header:'OrderID,Region,OrderDate,Amount',
    rows:9,
    published:'2026-10-29',
    sources:8,
  },
  {
    slug:'audit-ai-monthly-totals-with-timestamps',
    file:'monthly-timestamp-orders-fictional.csv',
    header:'RecordID,Timestamp,Amount,Status',
    rows:10,
    published:'2026-11-01',
    sources:7,
  },
];
const splitCsv = raw => raw.trimEnd().split(/\r?\n/).map(line=>line.split(','));
const fence=String.fromCharCode(96).repeat(3);

test('downloadable CSV bytes equal the full original source code blocks in both articles',()=>{
  for(const item of cases){
    const article=read('src/content/articles/'+item.slug+'.md');
    const csv=read('public/examples/'+item.file);
    const expected=new RegExp(fence+'csv\\n('+item.header+'\\n[\\s\\S]*?)\\n'+fence).exec(article)?.[1];
    assert(expected,'Published article must show the complete exact CSV source: '+item.slug);
    assert.equal(csv,expected+'\n',item.slug+': source and exported CSV must not drift');
    assert.equal(csv.split('\n').length,item.rows+2,'One header, all rows, one final newline');
    assert(article.includes('](/examples/'+item.file+')'),'Article must link to its real download');
    assert(article.includes('File integrity and independent verification'));
    assert.match(article,/updatedDate: "2026-11-02"/);
    assert(article.includes('publishedDate: "'+item.published+'"'),'Never rewrite original publication date');
    const sources=JSON.parse(article.match(/^sources:\s*(.+)$/m)?.[1]??'null');
    assert.equal(sources.length,item.sources);
    assert.equal(new Set(sources.map(x=>x.url)).size,item.sources);
    assert(sources.every(x=>!x.title.includes(' — reference')),'Metadata must show specific verified official source titles');
    assert(sources.every(x=>/^https:\/\/(support\.microsoft\.com|support\.google\.com)\//.test(x.url)));
    assert(!article.includes('?hl=en-2'),'No malformed locale selector');
  }
});

test('original nine-row duplicate file reconciles exact and conflicting order groups',()=>{
  const [header,...records]=splitCsv(read('public/examples/csv-duplicate-orders-fictional.csv'));
  assert.deepEqual(header,['OrderID','Region','OrderDate','Amount']);
  assert.equal(records.length,9);
  assert.equal(records.reduce((sum,row)=>sum+Number(row[3]),0),490);
  const groups=new Map();
  for(const record of records){const id=record[0];groups.set(id,[...(groups.get(id)||[]),record]);}
  assert.equal(groups.get('O-102').length,2);
  assert.equal(new Set(groups.get('O-102').map(r=>r.join('|'))).size,1);
  assert.equal(groups.get('O-103').length,2);
  assert.equal(new Set(groups.get('O-103').map(r=>r.join('|'))).size,2);
  assert.equal(groups.get('').length,1,'Blank identifier must remain in the source');
  const uniqueIDs=[...groups].filter(([id,rows])=>id&&rows.length===1);
  assert.equal(uniqueIDs.length,4);
  const retained=records.filter((row,index)=>index!==3); // exclude only second full O-102 record
  assert.equal(retained.length,8);
  assert.equal(retained.reduce((sum,row)=>sum+Number(row[3]),0),410);
  const mutated=records.map((row,index)=>index===3?[...row.slice(0,3),'81']:row);
  assert.equal(mutated.reduce((sum,row)=>sum+Number(row[3]),0),491);
  assert.equal(new Set(mutated.filter(row=>row[0]==='O-102').map(row=>row.join('|'))).size,2,'O-102 mutation must become an unresolved ID conflict');
});

test('timestamp file reproduces 295 October Paid vs incorrect 190 midnight cutoff',()=>{
  const [header,...records]=splitCsv(read('public/examples/monthly-timestamp-orders-fictional.csv'));
  assert.deepEqual(header,['RecordID','Timestamp','Amount','Status']);
  assert.equal(records.length,10);
  assert.equal(new Set(records.map(row=>row[0])).size,10);
  const total = (rows, wrong=false) => rows.filter(row =>
    row[3]==='Paid' && row[1]>='2026-10-01 00:00'
    && (wrong ? row[1]<='2026-10-31 00:00' : row[1]<'2026-11-01 00:00')
  ).reduce((sum,row)=>sum+Number(row[2]),0);
  assert.equal(total(records),295);
  assert.equal(total(records,true),190);
  const shifted=records.map(row=>row[0]==='R-10'?[row[0],'2026-11-01 00:00',row[2],row[3]]:row);
  assert.equal(total(shifted),270);
  assert(records.some(row=>row[2]==='0'&&row[3]==='Paid'),'Real numeric zero must be preserved');
  assert(records.some(row=>row[3]==='Refunded'),'Do not reclassify or lose refund status');
});

test('Evidence Library gives both original file downloads and an honest error-injection exercise',()=>{
  const library=read('src/pages/evidence.astro');
  assert(library.includes('id="evidence-csv-source-integrity"'));
  assert(library.includes('href="#evidence-csv-source-integrity"'));
  assert(library.includes('12. Download the complete CSV'));
  for(const item of cases)assert(library.includes('/examples/'+item.file));
  assert(library.includes('original fictional CSV inputs'));
  assert(library.includes('live AI model'));
  assert(library.includes('295'));
  assert(library.includes('410'));
});
