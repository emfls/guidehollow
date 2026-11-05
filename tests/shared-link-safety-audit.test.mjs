import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {classifyShape,parseTable,scanCandidates,gradeWorksheet} from '../public/examples/shared-link-audit/link-shape-audit.mjs';

const base=new URL('../public/examples/shared-link-audit/',import.meta.url);
const read=name=>readFileSync(new URL(name,base),'utf8');
const candidates=read('synthetic-links.tsv');
const reference=read('answer-key.tsv');
const blank=read('classification-worksheet.tsv');
const flawed=read('flawed-worksheet.tsv');
const scenarios=read('lifecycle-boundaries.tsv');

test('four canonical-looking first-party URL shapes and ten suspicious shapes have transparent editorial reasons',()=>{
  const observed=scanCandidates(candidates);
  const key=parseTable(reference,['CaseID','ExpectedClassification','ReasonCode']);
  assert.equal(observed.length,14);
  assert.deepEqual(observed.map(x=>x.id),Array.from({length:14},(_,i)=>'C'+String(i+1).padStart(2,'0')));
  for(let i=0;i<observed.length;i++){
    assert.equal(observed[i].classification,key[i].ExpectedClassification,observed[i].id);
    assert.equal(observed[i].reason,key[i].ReasonCode,observed[i].id);
  }
  assert.equal(observed.filter(x=>x.classification==='CONVERSATION_PATTERN').length,2);
  assert.equal(observed.filter(x=>x.classification==='TASK_PATTERN').length,2);
  assert.equal(observed.filter(x=>x.classification==='REJECT').length,10);
  const raw=parseTable(candidates,['CaseID','SyntheticURL']);
  assert(raw.every(x=>!x.SyntheticURL.includes('sk-proj-')));
  assert(raw.every(x=>!x.SyntheticURL.includes('REAL_PRIVATE_SHARE_ID')));
  assert(raw.every(x=>x.SyntheticURL.includes('fictional-') || x.SyntheticURL.includes('chatgpt.com/s/')));
});

test('explicit hostname inspection rejects phishing-style lookalikes and userinfo regardless of substring',()=>{
  assert.deepEqual(classifyShape('https://chatgpt.com.evil.example/share/fictional-01'),
    {classification:'REJECT',reason:'HOST_MISMATCH'});
  assert.deepEqual(classifyShape('https://chatgpt.com@not-chatgpt.example/share/fictional-02'),
    {classification:'REJECT',reason:'USERINFO_NOT_ALLOWED'});
  assert.deepEqual(classifyShape('https://sub.chatgpt.com/s/fictional-03'),
    {classification:'REJECT',reason:'HOST_MISMATCH'});
  assert.deepEqual(classifyShape('http://chatgpt.com/share/fictional-04'),
    {classification:'REJECT',reason:'HTTPS_REQUIRED'});
  assert.deepEqual(classifyShape('https://chatgpt.com:8443/share/fictional-05'),
    {classification:'REJECT',reason:'UNEXPECTED_PORT'});
  assert.deepEqual(classifyShape('https://chatgpt.com/share/fake?ref=thirdparty'),
    {classification:'REJECT',reason:'QUERY_NOT_ALLOWED'});
  assert.deepEqual(classifyShape('https://chatgpt.com/s/fictional-task#reader'),
    {classification:'REJECT',reason:'FRAGMENT_NOT_ALLOWED'});
  assert.deepEqual(classifyShape('https://chatgpt.com/share/foo/bar'),
    {classification:'REJECT',reason:'PATH_NOT_CANONICAL'});
  assert.deepEqual(classifyShape('https://chatgpt.com/share/fictional%2fpath'),
    {classification:'REJECT',reason:'PATH_NOT_CANONICAL'});
  assert.deepEqual(classifyShape('https://chatgpt.com/share/fictional-06'),
    {classification:'CONVERSATION_PATTERN',reason:'MATCH_CONVERSATION'});
  assert.deepEqual(classifyShape('https://chatgpt.com/s/fictional-07'),
    {classification:'TASK_PATTERN',reason:'MATCH_TASK'});
});

test('editorial faulty classifications are distinguished from format errors, not claimed as AI test results',()=>{
  const result=gradeWorksheet(candidates,flawed);
  assert.deepEqual(result.stats,{matches:10,wrongValid:2,invalidFormat:2});
  assert.deepEqual(result.cases.filter(x=>x.outcome==='WRONG_VALID').map(x=>x.id),['C04','C06']);
  assert.deepEqual(result.cases.filter(x=>x.outcome==='INVALID_FORMAT').map(x=>x.id),['C11','C14']);
  assert.deepEqual(gradeWorksheet(candidates,blank).stats,{matches:0,wrongValid:0,invalidFormat:14});
});

test('missing rows, duplicated IDs and altered columns are rejected before scoring',()=>{
  assert.throws(()=>parseTable('bad\n',['CaseID','SyntheticURL']),/Unexpected TSV columns/);
  assert.throws(()=>gradeWorksheet(candidates,flawed.replace(/^C14\t.*\n/m,'')),/exactly fourteen cases/);
  assert.throws(()=>gradeWorksheet(candidates,flawed.replace(/^C14\t/m,'C13\t')),/Duplicate or out-of-order/);
  assert.throws(()=>gradeWorksheet(candidates,flawed.replace('YourClassification','Status')),/Unexpected TSV columns/);
  assert.throws(()=>scanCandidates(candidates.replace('CaseID\tSyntheticURL','Case\tURL')),/Unexpected TSV columns/);
});

test('eight lifecycle scenarios prevent overclaiming deletion and preserve separate scheduled task/copy boundaries',()=>{
  const lines=scenarios.trimEnd().split('\n');
  assert.equal(lines.length,9,'Eight cases plus header');
  assert.equal(lines[0],'CaseID\tSurface\tObservedAction\tRequiredFollowUp\tDoNotConclude');
  const records=lines.slice(1).map(s=>s.split('\t'));
  assert(records.every(r=>r.length===5&&r.every(Boolean)));
  assert.deepEqual(records.map(r=>r[0]),Array.from({length:8},(_,i)=>'R'+String(i+1).padStart(2,'0')));
  assert(records.some(r=>r[3].includes('separate scheduled-task shared URL')));
  assert(records.some(r=>r[4].includes('recipient-owned continuation')));
  assert(records.some(r=>r[4].includes('export proves none exist')));
  assert(records.some(r=>r[2].includes('Improve the model for everyone')));
  assert(records.every(r=>!r.join(' ').includes('real customer')));
});

test('downloadable offline CLI scans synthetic links and gives consistent grading without network calls',()=>{
  const script=fileURLToPath(new URL('link-shape-audit.mjs',base));
  const scanFile=fileURLToPath(new URL('synthetic-links.tsv',base));
  const badFile=fileURLToPath(new URL('flawed-worksheet.tsv',base));
  const run=(mode,file)=>spawnSync(process.execPath,[script,mode,file],{encoding:'utf8',timeout:5000});
  const s=run('scan',scanFile);
  assert.equal(s.status,0,s.stderr);
  assert.match(s.stdout,/Recognized conversation\/task shapes: 4\/14; rejected shapes: 10\/14/);
  assert.match(s.stdout,/C05\tREJECT\tUSERINFO_NOT_ALLOWED/);
  const g=run('grade',badFile);
  assert.equal(g.status,0,g.stderr);
  assert.match(g.stdout,/Matches: 10\/14; wrong valid labels: 2; invalid format: 2/);
  assert.match(g.stdout,/C04: WRONG_VALID/);
  assert.match(g.stdout,/C14: INVALID_FORMAT/);
  assert.match(g.stdout,/not proof that any link exists/);
  const scriptText=read('link-shape-audit.mjs');
  assert.doesNotMatch(scriptText,/\bfetch\s*\(|\bhttps?:\/\/|node:child_process|\beval\s*\(/);
});

test('source-updated article, task path and evidence library link all six files with honest limitations',()=>{
  const article=readFileSync(new URL('../src/content/articles/chatgpt-shared-links-audit-revoke-access.md',import.meta.url),'utf8');
  const evidence=readFileSync(new URL('../src/pages/evidence.astro',import.meta.url),'utf8');
  const category=readFileSync(new URL('../src/pages/[category]/index.astro',import.meta.url),'utf8');
  for(const file of [
    'synthetic-links.tsv','answer-key.tsv','classification-worksheet.tsv',
    'flawed-worksheet.tsv','lifecycle-boundaries.tsv','link-shape-audit.mjs'
  ]){
    const url='/examples/shared-link-audit/'+file;
    assert(article.includes(url),'Guide missing '+url);
    assert(evidence.includes(url),'Evidence missing '+url);
  }
  assert.match(article,/updatedDate: "2026-11-05"/);
  assert(article.includes('product-specific claims were checked'));
  assert(article.includes('does not follow redirects'));
  assert(article.toLowerCase().includes('data export can include conversation-sharing metadata'));
  assert(evidence.includes('id="evidence-shared-link-safety"'));
  assert(category.includes('Audit a ChatGPT share before trusting or revoking a URL'));
  const sources=JSON.parse(article.match(/^sources:\s*(\[.*\])$/m)?.[1]||'null');
  assert.equal(sources.length,2);
  assert(sources.every(x=>x.url.startsWith('https://help.openai.com/en/articles/')));
});
