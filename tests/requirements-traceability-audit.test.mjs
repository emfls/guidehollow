import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {auditRegister,parseBrief,parseRegister} from '../public/examples/requirements-traceability/audit.mjs';

const base=new URL('../public/examples/requirements-traceability/',import.meta.url);
const read=name=>readFileSync(new URL(name,base),'utf8');
const brief=read('project-brief-v1.txt');
const reviewed=read('reviewed-register.tsv');
const faulty=read('faulty-register.tsv');

test('downloaded original contains exactly the nine lines published in the article',()=>{
  const article=readFileSync(new URL('../src/content/articles/ai-project-brief-requirements-traceability-matrix.md',import.meta.url),'utf8');
  const fence=String.fromCharCode(96).repeat(3);
  const block=article.split(fence+'plain\n').find(part=>part.startsWith('B1 | APPROVED'))?.split('\n'+fence)[0];
  assert(block,'Published brief must remain visible and match the download');
  const published=brief.split('\n').filter(line=>/^B\d+ \| /.test(line)).join('\n');
  assert.equal(block,published,'Source download may not drift from the page');
  const records=parseBrief(brief);
  assert.equal(records.size,9);
  assert.deepEqual([...records.values()].map(r=>r.status),[
    'APPROVED','APPROVED','APPROVED','APPROVED','APPROVED','APPROVED','PROPOSED','OPEN','EXCLUDED'
  ]);
  assert(brief.includes('NOT a real client specification'));
});

test('reviewed nine-row register preserves every ID, status and verbatim quote',()=>{
  const result=auditRegister(brief,reviewed);
  assert.equal(result.pass,true);
  assert.equal(result.sourceCount,9);
  assert.equal(result.registerCount,9);
  assert.deepEqual(result.issues,[]);
  assert.equal(parseRegister(reviewed).length,9);
});

test('flawed teaching register exposes exactly three structural errors and a separate semantic error',()=>{
  const result=auditRegister(brief,faulty);
  assert.equal(result.pass,false);
  assert.equal(result.registerCount,8);
  assert.deepEqual(result.issues.map(x=>[x.id,x.kind]),[
    ['B6','QUOTE_MISMATCH'],['B7','STATUS_MISMATCH'],['B8','MISSING_ID']
  ]);
  const b3=parseRegister(faulty).find(row=>row.id==='B3');
  assert(b3?.quote.includes('displays a confirmation code'));
  assert(b3?.interpretation.includes('confirmation email'));
});

test('source quote drift is detectable but interpretation drift needs human review',()=>{
  const original='A volunteer may change their selected shift until 24 hours before the shift begins.';
  const misquoted=reviewed.replace(original,original.replace('24 hours','48 hours'));
  assert(auditRegister(brief,misquoted).issues.some(x=>x.id==='B5'&&x.kind==='QUOTE_MISMATCH'));
  const changedInterpretation=reviewed.replace(
    'Allow volunteers to change their selected shift until 24 hours before shift start;',
    'Allow volunteers to change their selected shift until 48 hours before shift start;');
  assert.notEqual(changedInterpretation,reviewed);
  assert.equal(auditRegister(brief,changedInterpretation).pass,true,
    'An ID/quote checker must never pretend to certify prose semantics');
});

test('malformed tables, duplicate IDs and unauthorized scope labels fail closed',()=>{
  assert.throws(()=>parseRegister('not a TSV'),/header/);
  assert.throws(()=>parseRegister(reviewed.replace('WorkingInterpretation','Wrong')),/header/);
  const duplicate=reviewed+reviewed.trimEnd().split('\n')[1]+'\n';
  assert(auditRegister(brief,duplicate).issues.some(x=>x.kind==='DUPLICATE_ID'));
  const unknown=reviewed.replace(/^B9\t/m,'B99\t');
  assert(auditRegister(brief,unknown).issues.some(x=>x.kind==='UNKNOWN_ID'));
  assert(auditRegister(brief,unknown).issues.some(x=>x.kind==='MISSING_ID'));
  const changedStatus=reviewed.replace('B1\tAPPROVED','B1\tOPEN');
  assert(auditRegister(brief,changedStatus).issues.some(x=>x.kind==='STATUS_MISMATCH'));
  assert.throws(()=>parseBrief(brief.replace('B9 | EXCLUDED','B1 | EXCLUDED')),/Duplicate source ID/);
});

test('downloadable CLI is deterministic, local and honest about its limitations',()=>{
  const script=fileURLToPath(new URL('audit.mjs',base));
  const good=spawnSync(process.execPath,[script,fileURLToPath(new URL('reviewed-register.tsv',base))],{encoding:'utf8',timeout:5000});
  assert.equal(good.status,0,good.stderr);
  assert.match(good.stdout,/PASS: all source IDs, authority labels and verbatim quotes agree/);
  assert.match(good.stdout,/CANNOT validate WorkingInterpretation/);
  const bad=spawnSync(process.execPath,[script,fileURLToPath(new URL('faulty-register.tsv',base))],{encoding:'utf8',timeout:5000});
  assert.equal(bad.status,2,bad.stderr);
  for(const fragment of ['B6: QUOTE_MISMATCH','B7: STATUS_MISMATCH','B8: MISSING_ID'])
    assert(bad.stdout.includes(fragment),fragment);
  const scriptText=read('audit.mjs');
  assert.doesNotMatch(scriptText,/\bfetch\s*\(|\bhttps?:\/\/|node:child_process|\beval\s*\(/);
});

test('guide, Evidence Library and category routes link the audited inputs without a thin new article',()=>{
  const article=readFileSync(new URL('../src/content/articles/ai-project-brief-requirements-traceability-matrix.md',import.meta.url),'utf8');
  const index=readFileSync(new URL('../src/pages/evidence.astro',import.meta.url),'utf8');
  const cat=readFileSync(new URL('../src/pages/[category]/index.astro',import.meta.url),'utf8');
  for(const name of ['project-brief-v1.txt','reviewed-register.tsv','faulty-register.tsv','audit.mjs']){
    const path='/examples/requirements-traceability/'+name;
    assert(article.includes(path),'Article missing '+path);
    assert(index.includes(path),'Evidence Library missing '+path);
  }
  assert(article.includes('updatedDate: "2026-11-04"'));
  assert(article.includes('B3 row accurately quotes'));
  assert(index.includes('id="evidence-requirements-traceability"'));
  assert(cat.includes("['ai-project-brief-requirements-traceability-matrix', 'Build requirements without silently approving new scope'"));
  const sources=JSON.parse(article.match(/^sources:\s*(\[.*\])$/m)?.[1]||'null');
  assert(sources.every(x=>x.title&&!/— reference$/.test(x.title)));
  assert(sources.some(x=>x.title==='NASA: 6.2 Requirements Management'));
});
