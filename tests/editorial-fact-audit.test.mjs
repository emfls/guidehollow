import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const articleRoot = new URL('../src/content/articles/', import.meta.url);
test('every published article has a parseable HTTPS source register', async () => {
  const names = (await readdir(articleRoot)).filter(name => name.endsWith('.md'));
  assert(names.length >= 31, 'The audit baseline contains 31 articles');
  for (const name of names) {
    const content = await readFile(new URL(name, articleRoot), 'utf8');
    const sourceLine = content.match(/^sources:\s*(.+)$/m)?.[1];
    assert(sourceLine, name + ': source metadata absent');
    const sources = JSON.parse(sourceLine);
    assert(Array.isArray(sources) && sources.length > 0, name + ': missing external evidence');
    for (const source of sources) {
      assert(typeof source.title === 'string' && source.title.trim(), name + ': untitled evidence');
      assert(/^https:\/\//.test(source.url), name + ': source URL must use HTTPS');
      assert(new URL(source.url).hostname.includes('.'), name + ': invalid evidence host');
    }
    assert(/publishedDate:\s*["']\d{4}-\d{2}-\d{2}["']/.test(content), name + ': missing publication date');
    assert(!/draft:\s*true/.test(content), name + ': draft should not be in published audit baseline');
  }
});

test('fictional deduplication fixture and both described mutations reconcile independently', async () => {
  const content = await readFile(new URL('audit-ai-csv-duplicate-removal-without-losing-rows.md', articleRoot), 'utf8');
  const csv = content.match(/\`\`\`javascript\n(OrderID,Region,OrderDate,Amount\n[\s\S]*?)\`\`\`/)?.[1];
  assert(csv, 'Original CSV must be in the published article');
  const records = csv.trim().split(/\r?\n/).slice(1).map(line => {
    const [id,region,date,amount] = line.split(',');
    return {id,region,date,amount:Number(amount)};
  });
  assert.equal(records.length,9);
  const summary = rows => {
    const byID = new Map();
    for(const row of rows) if (row.id) byID.set(row.id, [...(byID.get(row.id)||[]),row]);
    const signature = row => [row.id,row.region,row.date,row.amount].join('|');
    const flags = rows.map(row => !row.id ? 'MISSING_ID' : byID.get(row.id).length===1 ? 'UNIQUE_ID' : new Set(byID.get(row.id).map(signature)).size===1 ? 'EXACT_DUPLICATE_GROUP' : 'CONFLICTING_ID');
    const kept = new Set();
    let retained=0;
    for(let i=0;i<rows.length;i++){
      const key=signature(rows[i]);
      if(flags[i]==='EXACT_DUPLICATE_GROUP'&&kept.has(key)) continue;
      kept.add(key);
      retained+=rows[i].amount;
    }
    return {raw:rows.reduce((sum,r)=>sum+r.amount,0),retained,flags};
  };
  const a=summary(records);
  assert.equal(a.raw,490);
  assert.equal(a.retained,410);
  assert.deepEqual(['EXACT_DUPLICATE_GROUP','CONFLICTING_ID','MISSING_ID','UNIQUE_ID'].map(f=>a.flags.filter(x=>x===f).length),[2,2,1,4]);
  const b=summary(records.map(r=>r.id==='O-103'&&r.amount===50?{...r,amount:45}:r));
  assert.equal(b.raw,485);
  assert.equal(b.retained,360);
  assert.deepEqual(['EXACT_DUPLICATE_GROUP','CONFLICTING_ID','MISSING_ID','UNIQUE_ID'].map(f=>b.flags.filter(x=>x===f).length),[4,0,1,4]);
  assert(content.includes('**Test B: Restore the original'), 'Published explanation should include the mutation case');
});
