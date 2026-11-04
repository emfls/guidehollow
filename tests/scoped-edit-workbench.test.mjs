import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assemble,check} from '../public/examples/scoped-revision/scoped-edit.mjs';

const base=new URL('../public/examples/scoped-revision/',import.meta.url);
const read=name=>readFileSync(new URL(name,base),'utf8');
const approved=read('approved-answer.txt');
const replacement=read('replacement-questions.txt');
const reference=read('reference-revised.txt');
const overreach=read('overreach-revised.txt');
const unsupported=read('unsupported-revised.txt');

test('the original support-note source and frozen approved answer match the published guide',()=>{
  const article=readFileSync(new URL('../src/content/articles/revise-one-ai-answer-section-without-changing-approved-text.md',import.meta.url),'utf8');
  const backticks=String.fromCharCode(96).repeat(3);
  const snippet='- Problem: The customer cannot open the report download link.\n- Confirmed facts: They tried twice; the note provides no error code or browser version.\n- Missing details: Error code and browser version were not provided.';
  assert(article.includes(backticks+'plain\n'+snippet+'\n'+backticks));
  assert.equal(approved.trimEnd(),snippet);
  assert(read('source-note.txt').includes('No repair,'));
  assert(read('source-note.txt').includes('This is invented for GuideHollow'));
});

test('patch-only assembly copies protected lines exactly without making the model regenerate them',()=>{
  assert.equal(assemble(approved,replacement),reference);
  assert.deepEqual(check(approved,reference),{pass:true,problem:null});
  assert(assemble(approved,replacement).startsWith(approved.split('\n').slice(0,2).join('\n')+'\n'));
  assert.equal(assemble(approved.slice(0,-1),replacement).endsWith('\n'),false,'No trailing newline should be invented');
});

test('literal drift, output shape changes and newline conversion are detected',()=>{
  assert.deepEqual(check(approved,overreach),{pass:false,problem:'FROZEN_TEXT_DRIFT'});
  assert.equal(check(approved,reference.slice(0,-1)).problem,'NEWLINE_DRIFT');
  assert.equal(check(approved,reference.replace('\n','\r\n')).problem,'OUTPUT_SHAPE');
  assert.equal(check(approved,reference+'\n- Additional: invented').problem,'OUTPUT_SHAPE');
  assert.equal(check(approved,reference.replace('- Problem:','- Summary:')).problem,'OUTPUT_SHAPE');
  assert.equal(check(approved,reference.replace('What error code appears? Which browser and version are you using?','What error code appears?')).problem,'EDIT_SHAPE');
});

test('semantically false but structurally valid question is a deliberate, disclosed blind spot',()=>{
  assert.deepEqual(check(approved,unsupported),{pass:true,problem:null});
  const note=read('source-note.txt');
  assert(!note.includes('E42'));
  assert(!note.includes('fixed'));
  assert(unsupported.includes('E42'));
  assert(unsupported.includes('already fixed?'));
  assert.throws(()=>assemble(approved,'Was E42 fixed? Which browser and version? \nThird line'),/one nonempty line/);
  assert.throws(()=>assemble(approved,'Are you using a browser?'),/exactly two question marks/);
});

test('published CLI produces a complete safe patch, differentiates failure codes, and avoids a network requirement',()=>{
  const script=fileURLToPath(new URL('scoped-edit.mjs',base));
  const a=fileURLToPath(new URL('approved-answer.txt',base));
  const patch=fileURLToPath(new URL('replacement-questions.txt',base));
  const valid=fileURLToPath(new URL('reference-revised.txt',base));
  const invalid=fileURLToPath(new URL('overreach-revised.txt',base));
  const semanticallyBad=fileURLToPath(new URL('unsupported-revised.txt',base));
  const assembled=spawnSync(process.execPath,[script,'assemble',a,patch],{encoding:'utf8',timeout:5000});
  assert.equal(assembled.status,0,assembled.stderr);
  assert.equal(assembled.stdout,reference);
  for(const [path,code,match] of [
    [valid,0,/PASS: frozen lines/],
    [invalid,2,/FAIL: FROZEN_TEXT_DRIFT/],
    [semanticallyBad,0,/LIMIT: This check cannot establish whether the new questions are factually supported/]
  ]) {
    const run=spawnSync(process.execPath,[script,'check',a,path],{encoding:'utf8',timeout:5000});
    assert.equal(run.status,code,run.stderr);
    assert.match(run.stdout,match);
  }
  const invalidArgs=spawnSync(process.execPath,[script,'bad-command',a,patch],{encoding:'utf8',timeout:5000});
  assert.equal(invalidArgs.status,1);
  const source=read('scoped-edit.mjs');
  assert.doesNotMatch(source,/\bfetch\s*\(|\bhttps?:\/\/|node:child_process|\beval\s*\(/);
});

test('article and evidence library expose all seven source-first files and explain mechanical limits',()=>{
  const article=readFileSync(new URL('../src/content/articles/revise-one-ai-answer-section-without-changing-approved-text.md',import.meta.url),'utf8');
  const evidence=readFileSync(new URL('../src/pages/evidence.astro',import.meta.url),'utf8');
  const category=readFileSync(new URL('../src/pages/[category]/index.astro',import.meta.url),'utf8');
  for(const filename of [
    'source-note.txt','approved-answer.txt','replacement-questions.txt',
    'reference-revised.txt','overreach-revised.txt','unsupported-revised.txt','scoped-edit.mjs'
  ]) {
    const url='/examples/scoped-revision/'+filename;
    assert(article.includes(url),'Missing guide download '+url);
    assert(evidence.includes(url),'Missing evidence download '+url);
  }
  assert(article.includes('updatedDate: "2026-11-04"'));
  assert(article.includes('Reject despite PASS'));
  assert(article.includes('No live AI model revision is claimed'));
  assert(evidence.includes('id="evidence-scoped-revision"'));
  assert(category.includes("['revise-one-ai-answer-section-without-changing-approved-text', 'Change only one approved answer section'"));
});
