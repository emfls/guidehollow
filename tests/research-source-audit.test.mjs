import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readTable,grade} from '../public/examples/research-source-audit/grade.mjs';

const base=new URL('../public/examples/research-source-audit/',import.meta.url);
const read=name=>readFileSync(new URL(name,base),'utf8');
const src=['booking-versions.txt','shared-device-admin.txt','trial-and-pricing.txt'].map(name=>read(name));
const practice=read('practice.tsv');
const key=read('answer-key.tsv');
const sample=read('example-predictions.tsv');
const blank=read('predictions-template.tsv');
const questions=readTable(practice,['ClaimID','ClaimToAudit']);
const answers=readTable(key,['ClaimID','Judgment','EvidenceIDs','Reason']);

test('all 12 original claims link to a current or explicitly retired primary source record',()=>{
  assert.equal(questions.length,12);
  assert.equal(answers.length,12);
  assert.deepEqual(questions.map(x=>x.ClaimID),
    Array.from({length:12},(_,i)=>'C'+String(i+1).padStart(2,'0')));
  assert.deepEqual(answers.map(x=>x.ClaimID),questions.map(x=>x.ClaimID));
  const full=src.join('\n');
  const seen=new Set();
  for(const line of full.split('\n')){
    const m=line.match(/^\[([A-Z]\d{2}|V1-\d{2})\]/);
    if(m){assert(!seen.has(m[1]),'Duplicate source ID '+m[1]);seen.add(m[1]);}
  }
  assert(seen.size>=12,'Source packet must contain enough independently checkable source passages');
  for(const row of answers) {
    assert(row.Reason.length>=30,'Editorial reason is required');
    for(const id of row.EvidenceIDs.split(','))assert(seen.has(id),'Missing evidence '+row.ClaimID+' → '+id);
  }
  assert(src[0].includes('SUPERSEDED, NOT CURRENT'));
  assert(src[0].includes('CURRENT EDITION'));
  assert(src[0].includes('V1-01'));
  assert(answers.find(x=>x.ClaimID==='C02').EvidenceIDs.includes('V1-02'));
  for(const doc of src)assert(/fictional|FICTIONAL/.test(doc));
});

test('reference labels distinguish explicit contradictions from unsupported unknowns',()=>{
  const tally={};
  for(const row of answers)tally[row.Judgment]=(tally[row.Judgment]||0)+1;
  assert.deepEqual(tally,{SUPPORTED:4,CONTRADICTED:3,NOT_ESTABLISHED:5});
  assert.equal(answers.find(x=>x.ClaimID==='C02').Judgment,'CONTRADICTED');
  assert.equal(answers.find(x=>x.ClaimID==='C06').Judgment,'NOT_ESTABLISHED');
  assert.equal(answers.find(x=>x.ClaimID==='C08').Judgment,'CONTRADICTED');
  assert.equal(answers.find(x=>x.ClaimID==='C09').Judgment,'NOT_ESTABLISHED');
  assert.equal(answers.find(x=>x.ClaimID==='C12').Judgment,'NOT_ESTABLISHED');
  assert(!practice.includes('Judgment'));
  assert(!blank.includes('Judgment\tEvidenceIDs'));
  assert.deepEqual(readTable(blank,['ClaimID','SubmittedJudgment']).map(x=>x.SubmittedJudgment),
    Array(12).fill('PENDING'));
});

test('local grader scores intentionally imperfect editor-written outputs without inventing model results',()=>{
  const result=grade(practice,key,sample);
  assert.equal(result.total,12);
  assert.deepEqual(result.stats,{match:9,wrongJudgment:2,invalidFormat:1});
  assert.deepEqual(result.rows.filter(x=>x.status==='WRONG_JUDGMENT').map(x=>x.id),['C02','C06']);
  assert.deepEqual(result.rows.filter(x=>x.status==='INVALID_FORMAT').map(x=>x.id),['C12']);
  assert.deepEqual(grade(practice,key,blank).stats,{match:0,wrongJudgment:0,invalidFormat:12});
});

test('missing rows, swapped IDs, duplicate predictions and invalid key do not silently pass',()=>{
  assert.throws(()=>grade(practice,key,sample.replace(/^C12\t.*\n/m,'')),/exactly 12 cases/);
  assert.throws(()=>grade(practice,key,sample.replace(/^C12\t/m,'C11\t')),/duplicate case ID/);
  assert.throws(()=>grade(practice,key,sample.replace(/^C12\t/m,'C99\t')),/source order/);
  assert.throws(()=>grade(practice,key,sample.replace('C06\tCONTRADICTED','C06\t')),/nonempty fields/);
  assert.throws(()=>grade(practice,key.replace('C02\tCONTRADICTED','C02\tSUPPORTS'),sample),/Editorial answer key is invalid/);
  assert.throws(()=>readTable('id\tlabel\nC01\tSUPPORTED\n',['ClaimID','SubmittedJudgment']),/Invalid header/);
});

test('published CLI executes the sample comparison locally with consistent outputs',()=>{
  const script=fileURLToPath(new URL('grade.mjs',base));
  const input=fileURLToPath(new URL('example-predictions.tsv',base));
  const run=spawnSync(process.execPath,[script,input],{encoding:'utf8',timeout:5000});
  assert.equal(run.status,0,run.stderr);
  assert.match(run.stdout,/Exact editorial matches: 9\/12; wrong valid judgments: 2; invalid format: 1/);
  assert.match(run.stdout,/C02: WRONG_JUDGMENT/);
  assert.match(run.stdout,/C12: INVALID_FORMAT/);
  assert.match(run.stdout,/not AI performance scores/);
  const code=read('grade.mjs');
  assert.doesNotMatch(code,/\bfetch\s*\(|\bhttps?:\/\/|node:child_process|\beval\s*\(/);
});

test('guide and Evidence Library expose each original source and preserve the official-doc boundary',()=>{
  const article=readFileSync(new URL('../src/content/articles/chatgpt-search-vs-deep-research-vs-standard-chat.md',import.meta.url),'utf8');
  const evidence=readFileSync(new URL('../src/pages/evidence.astro',import.meta.url),'utf8');
  const cat=readFileSync(new URL('../src/pages/[category]/index.astro',import.meta.url),'utf8');
  for(const name of [
    'booking-versions.txt','shared-device-admin.txt','trial-and-pricing.txt','practice.tsv',
    'answer-key.tsv','predictions-template.tsv','example-predictions.tsv','grade.mjs'
  ]){
    const url='/examples/research-source-audit/'+name;
    assert(article.includes(url),'Guide missing '+url);
    assert(evidence.includes(url),'Evidence Library missing '+url);
  }
  assert(article.includes('updatedDate: "2026-11-04"'));
  assert(article.includes('not a real product'));
  assert(article.includes('No generative AI system produced these sample labels'));
  assert(article.includes('documentation checked November 2')||
    article.includes('Documentation checked November 2'));
  assert(evidence.includes('id="evidence-research-source-audit"'));
  assert(cat.includes('Audit 12 fictional source-backed product claims'));
  assert(article.includes('NOT_ESTABLISHED'));
  const sources=JSON.parse(article.match(/^sources:\s*(\[.*\])$/m)?.[1]??'null');
  assert.equal(sources.length,3);
  assert(sources.every(x=>x.title.startsWith('OpenAI Help Center:')&&x.url.startsWith('https://')));
});
