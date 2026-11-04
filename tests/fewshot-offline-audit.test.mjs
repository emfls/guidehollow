import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {evaluate,readTable} from '../public/examples/fewshot-intent-audit/grade.mjs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const prefix='public/examples/fewshot-intent-audit/';
const blind=read(prefix+'blind-test.tsv');
const key=read(prefix+'answer-key.tsv');
const sample=read(prefix+'example-outputs.tsv');
const template=read(prefix+'predictions-template.tsv');

test('twelve original unseen cases have a separate, balanced editorial key',()=>{
  const blindRows=readTable(blind,['CaseID','FeedbackMessage']);
  const keyRows=readTable(key,['CaseID','ExpectedLabel','Reason']);
  const original=read('src/content/articles/few-shot-prompt-examples-teach-rules-not-keywords.md');
  assert.equal(blindRows.length,12);
  assert.deepEqual(blindRows.map(x=>x.CaseID),Array.from({length:12},(_,i)=>'C'+String(i+1).padStart(2,'0')));
  assert.deepEqual(blindRows.map(x=>x.CaseID),keyRows.map(x=>x.CaseID));
  for(const row of blindRows) {
    assert(!original.includes(row.FeedbackMessage),'Blind text must not be exposed by the published guide: '+row.CaseID);
    assert(!/^(REQUEST|IDEA|STATUS|UNCLEAR)$/.test(row.FeedbackMessage));
  }
  for(const label of ['REQUEST','IDEA','STATUS','UNCLEAR'])
    assert.equal(keyRows.filter(x=>x.ExpectedLabel===label).length,3);
  assert.deepEqual(readTable(template,['CaseID','ModelOutput']).map(x=>x.ModelOutput),Array(12).fill('PENDING'));
  assert(!blind.includes('ExpectedLabel'));
  assert(!template.includes('ExpectedLabel'));
});

test('offline grader separates actual label mismatch from invalid output shape',()=>{
  const result=evaluate(blind,key,sample);
  assert.equal(result.total,12);
  assert.deepEqual(result.counts,{matched:10,wrongLabel:1,invalidFormat:1});
  assert.equal(result.results.find(x=>x.id==='C10')?.result,'WRONG_LABEL');
  assert.equal(result.results.find(x=>x.id==='C10')?.expected,'IDEA');
  assert.equal(result.results.find(x=>x.id==='C11')?.result,'INVALID_FORMAT');
  assert.equal(result.results.find(x=>x.id==='C11')?.expected,'STATUS');
  const untouched=evaluate(blind,key,template);
  assert.deepEqual(untouched.counts,{matched:0,wrongLabel:0,invalidFormat:12});
});

test('invalid, reordered, duplicated and incomplete submissions fail closed',()=>{
  const rows=readTable(sample,['CaseID','ModelOutput']);
  assert.equal(rows[0].CaseID,'C01');
  assert.throws(()=>evaluate(blind,key,sample.replace('C10\tREQUEST','C09\tREQUEST')),/Invalid or repeated case ID/);
  assert.throws(()=>evaluate(blind,key,sample.replace('C10\tREQUEST','C98\tREQUEST')),/Case IDs must match/);
  assert.throws(()=>evaluate(blind,key,sample.replace('C10\tREQUEST\n','')),/exactly 12 cases/);
  assert.throws(()=>evaluate(blind,key,sample.replace('C10\tREQUEST','C10\t')),/nonempty columns/);
  assert.throws(()=>evaluate(blind,key,sample.replace('C10\tREQUEST','C10\tREQUEST\textra')),/nonempty columns/);
  assert.throws(()=>evaluate(blind,key.replace('C10\tIDEA','C10\tPURCHASE'),sample),/Published reference is incomplete/);
});

test('offline CLI reproduces published example counts without packages or any model request',()=>{
  const script=fileURLToPath(new URL('../public/examples/fewshot-intent-audit/grade.mjs',import.meta.url));
  const example=fileURLToPath(new URL('../public/examples/fewshot-intent-audit/example-outputs.tsv',import.meta.url));
  const process=spawnSync(processExecPath(),[script,example],{encoding:'utf8',timeout:5000});
  assert.equal(process.status,0,process.stderr);
  assert.match(process.stdout,/Exact matches: 10\/12; wrong valid labels: 1; invalid output format: 1/);
  assert.match(process.stdout,/not observed AI accuracy/);
  const source=read(prefix+'grade.mjs');
  assert.doesNotMatch(source,/\bfetch\s*\(|\bhttps?\s*:\s*\/\//);
  assert.doesNotMatch(source,/node:child_process|execSync|eval\s*\(/);
});
function processExecPath(){return globalThis.process.execPath;}

test('two existing guides and public evidence explain independent verification without overstating the results',()=>{
  const fewshot=read('src/content/articles/few-shot-prompt-examples-teach-rules-not-keywords.md');
  const uploads=read('src/content/articles/chatgpt-file-upload-problems.md');
  const evidence=read('src/pages/evidence.astro');
  const routes=read('src/pages/[category]/index.astro');
  for(const path of ['blind-test.tsv','predictions-template.tsv','answer-key.tsv','grade.mjs','example-outputs.tsv']){
    const url='/examples/fewshot-intent-audit/'+path;
    assert(fewshot.includes(url),'guide lacks '+url);
    assert(evidence.includes(url),'library lacks '+url);
  }
  assert.match(fewshot,/updatedDate: "2026-11-04"/);
  assert.match(uploads,/updatedDate: "2026-11-04"/);
  assert(fewshot.includes('not a blind test for anyone who has read the table'));
  assert(routes.includes('Test whether examples teach intent instead of keywords'));
  for(const name of ['fictional-expense-selectable-text.pdf','fictional-expense-image-only.pdf','manifest.json'])
    assert(uploads.includes('/examples/pdf-ocr-fixtures/'+name));
  assert(uploads.includes('**$400**'));
  assert(uploads.includes('No live account upload or ChatGPT extraction result is asserted here'));
  assert(uploads.includes('/troubleshooting/ai-pdf-summary-missing-tables-ocr-check/'));
});
