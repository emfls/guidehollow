import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const article=read('src/content/articles/build-policy-faq-with-ai-without-inventing-rules.md');
const source=read('public/examples/fictional-policy-faq-source.txt');
const csv=read('public/examples/fictional-policy-faq-reference.csv');
const library=read('src/pages/evidence.astro');
const officialUrl='https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/layout?view=doc-intel-4.0.0';

test('downloadable fictional policy is a byte-faithful copy of all nine source sections',()=>{
  const embedded=article.match(/```plain\n(S1 [|] Eligibility [|][\s\S]*?)\n```/);
  assert(embedded,'The full policy source must remain visible in the guide');
  assert.equal(source.split('\n\n').slice(1).join('\n\n').trim(),embedded[1].trim(),'Article and downloadable source text drifted');
  const lines=embedded[1].split('\n');
  assert.equal(lines.length,9,'Nine sections in article fixture');
  for(let i=1;i<=9;i++)assert(lines[i-1].startsWith('S'+i+' | '),'Missing source S'+i);
  assert(source.includes('This is invented source material'));
  assert(article.includes('/examples/fictional-policy-faq-source.txt'));
});

test('every answer references real source sections or explicitly states missing evidence',()=>{
  const [header,...lines]=csv.trimEnd().split('\n').map(line=>line.split(','));
  assert.deepEqual(header,['QuestionID','Question','SourceIDs','Status','ReferenceAnswer']);
  assert.equal(lines.length,11);
  assert.deepEqual(lines.map(x=>x[0]),Array.from({length:11},(_,i)=>'Q'+(i+1)));
  assert.deepEqual(lines.reduce((a,row)=>{a[row[3]]=(a[row[3]]||0)+1;return a;},{}),{ANSWERED:8,PARTIAL:1,NOT_SPECIFIED:2});
  for(const [id,question,sourceIds,status,answer] of lines){
    assert(question&&answer,id+': not usable as a worksheet');
    if(status==='NOT_SPECIFIED'){assert.equal(sourceIds,'');assert.match(answer,/Not specified/);}
    else {assert.match(sourceIds,/^S[1-9]$/);assert(source.includes(sourceIds+' |'),id+': non-existent source');}
  }
  assert.match(lines.find(row=>row[0]==='Q6')[4],/no other group has a confirmed reservation AND.*at least 1 calendar day/);
  assert.match(lines.find(row=>row[0]==='Q7')[4],/\$25 before the cap.*\$20 after/);
  assert.match(lines.find(row=>row[0]==='Q8')[4],/replacement fee is not specified/);
});

test('public article and evidence library support no-model reproducibility and accessible official reference',()=>{
  for(const href of ['/examples/fictional-policy-faq-source.txt','/examples/fictional-policy-faq-reference.csv']){
    assert(article.includes(']('+href+')'),'Article missing downloadable fixture '+href);
    assert(library.includes('href="'+href+'"'),'Evidence Library missing fixture '+href);
  }
  assert(article.includes(officialUrl));
  assert(!article.includes('choose-model-feature?view=doc-intel-4.0.0'));
  assert(article.includes('Microsoft Learn: Document layout analysis'));
  assert(article.includes('updatedDate: "2026-11-02"'));
  assert(article.includes('publishedDate: "2026-10-28"'));
  assert(library.includes('A second source-to-answer check: policy FAQ conditions'));
  assert(library.includes('not a captured AI model run'));
});
