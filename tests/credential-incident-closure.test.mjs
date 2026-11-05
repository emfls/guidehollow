import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseEvents,assess} from '../public/examples/credential-incident-drill/closure-audit.mjs';

const base=new URL('../public/examples/credential-incident-drill/',import.meta.url);
const read=name=>readFileSync(new URL(name,base),'utf8');
const events=read('source-events.tsv');
const open=read('open-ledger.json');
const review=read('review-ledger.json');
const premature=read('chat-deletion-only.json');
const overclaim=read('overclaim-ledger.json');
const data=text=>JSON.parse(text);

test('fictional event history contains no credential values and separates chat removal from issuer revocation',()=>{
  const source=parseEvents(events);
  assert.equal(source.size,10);
  assert.equal(source.get('E03').domain,'chatHandling');
  assert.equal(source.get('E03').state,'REMOVED_FROM_ACCOUNT_VIEW');
  assert.equal(source.get('E04').domain,'issuerRevocation');
  assert.equal(source.get('E04').state,'CONFIRMED');
  assert.equal(source.get('E07').state,'PENDING');
  assert.equal(source.get('E09').state,'ADDRESSED');
  assert(source.get('E06').summary.includes('UNKNOWN'));
  assert(!events.includes('sk-proj-'));
  assert(!events.includes('-----BEGIN PRIVATE KEY-----'));
  assert(!events.includes('Authorization: Bearer'));
  assert(events.includes('no value is provided'));
  assert(events.includes('not inferred from chat deletion'));
});

test('open ledger is consistently OPEN even after credential revocation and replacement',()=>{
  const result=assess(events,open);
  assert.equal(result.computedDisposition,'OPEN');
  assert.equal(result.requestedDispositionMatches,true);
  assert.deepEqual(result.findings,[
    {domain:'savedFileHandling',kind:'OUTCOME_PENDING'},
    {domain:'shareHandling',kind:'MISSING_EVIDENCE'}
  ]);
  assert.equal(data(open).assertions.unauthorizedUse,'UNKNOWN');
  assert.equal(data(open).assertions.allCopiesErased,'UNKNOWN');
});

test('finished fictional workstreams permit review, never automatic closure or all-clear',()=>{
  const result=assess(events,review);
  assert.equal(result.computedDisposition,'READY_FOR_OWNER_REVIEW');
  assert.equal(result.requestedDispositionMatches,true);
  assert.deepEqual(result.findings,[]);
  assert(!review.includes('"CLOSED"'));
  assert.equal(data(review).assertions.unauthorizedUse,'UNKNOWN');
  assert.equal(data(review).assertions.allCopiesErased,'UNKNOWN');
});

test('chat deletion alone cannot justify credential revocation or incident closure',()=>{
  const result=assess(events,premature);
  assert.equal(result.computedDisposition,'OPEN');
  assert.equal(result.requestedDispositionMatches,false);
  assert(result.findings.some(f=>f.domain==='issuerRevocation'&&f.kind==='MISSING_EVIDENCE'));
  const mutated=data(open);
  mutated.checks.issuerRevocation='E03';
  assert(assess(events,JSON.stringify(mutated)).findings.some(f=>f.domain==='issuerRevocation'&&f.kind==='WRONG_DOMAIN'));
});

test('future events and unsupported certainty are rejected, even after all tracked workstreams are addressed',()=>{
  const early=data(open);
  early.checks.savedFileHandling='E09';
  assert(assess(events,JSON.stringify(early)).findings.some(f=>f.domain==='savedFileHandling'&&f.kind==='FUTURE_EVIDENCE'));
  const result=assess(events,overclaim);
  assert.equal(result.computedDisposition,'OPEN');
  assert.equal(result.requestedDispositionMatches,false);
  assert.deepEqual(result.findings,[
    {domain:'unauthorizedUse',kind:'UNSUPPORTED_CERTAINTY'},
    {domain:'allCopiesErased',kind:'UNSUPPORTED_CERTAINTY'}
  ]);
  const altered=data(review);
  altered.throughEvent='E03';
  assert(assess(events,JSON.stringify(altered)).findings.some(f=>f.kind==='FUTURE_EVIDENCE'));
});

test('malformed source evidence or unsupported fields fail closed',()=>{
  assert.throws(()=>parseEvents(events.replace('EventID\tSequence','EventId\tSequence')),/header/);
  assert.throws(()=>parseEvents(events.replace(/^E10\t10/m,'E10\t11')),/event sequence/);
  assert.throws(()=>parseEvents(events.replace(/^E01\t1/m,'E02\t1')),/event sequence/);
  const noDomain=data(review);
  delete noDomain.checks.chatHandling;
  assert.throws(()=>assess(events,JSON.stringify(noDomain)),/seven independent outcome fields/);
  const badDisposition=data(review);
  badDisposition.requestedDisposition='CLOSED';
  assert.throws(()=>assess(events,JSON.stringify(badDisposition)),/no auto-CLOSED state/);
  const badID=data(review);
  badID.scenario='REAL-INCIDENT';
  assert.throws(()=>assess(events,JSON.stringify(badID)),/Unexpected incident fixture ID/);
});

test('downloadable CLI reports consistent open and review status, rejects premature and overclaimed closure',()=>{
  const script=fileURLToPath(new URL('closure-audit.mjs',base));
  for(const [file,code,expect] of [
    ['open-ledger.json',0,/Computed disposition: OPEN/],
    ['review-ledger.json',0,/Computed disposition: READY_FOR_OWNER_REVIEW/],
    ['chat-deletion-only.json',2,/Requested disposition: UNSUPPORTED/],
    ['overclaim-ledger.json',2,/allCopiesErased: UNSUPPORTED_CERTAINTY/]
  ]){
    const child=spawnSync(process.execPath,[script,fileURLToPath(new URL(file,base))],{encoding:'utf8',timeout:5000});
    assert.equal(child.status,code,child.stderr);
    assert.match(child.stdout,expect);
    assert.match(child.stdout,/cannot verify provider logs/);
  }
  const scriptText=read('closure-audit.mjs');
  assert.doesNotMatch(scriptText,/\bfetch\s*\(|\bhttps?:\/\/|node:child_process|\beval\s*\(/);
});

test('guide and Evidence Library explain the unsafe order and link all original downloadable files',()=>{
  const article=readFileSync(new URL('../src/content/articles/api-key-pasted-into-chatgpt-incident-response.md',import.meta.url),'utf8');
  const evidence=readFileSync(new URL('../src/pages/evidence.astro',import.meta.url),'utf8');
  const category=readFileSync(new URL('../src/pages/[category]/index.astro',import.meta.url),'utf8');
  for(const name of [
    'source-events.tsv','open-ledger.json','review-ledger.json',
    'chat-deletion-only.json','overclaim-ledger.json','closure-audit.mjs'
  ]){
    const url='/examples/credential-incident-drill/'+name;
    assert(article.includes(url),'Article does not link '+url);
    assert(evidence.includes(url),'Evidence does not link '+url);
  }
  assert(article.includes('updatedDate: "2026-11-05"'));
  assert(article.includes('**A deliberate bad first move:**'));
  assert(article.includes('not to recommend that order'));
  assert(article.includes('not a way to query or authenticate an issuer dashboard'));
  assert(article.includes('Chat and file retention in ChatGPT'));
  assert(evidence.includes('id="evidence-credential-incident"'));
  assert(category.includes('Practice a credential-exposure response without handling real keys'));
});
