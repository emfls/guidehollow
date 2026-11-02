import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const path='/examples/space-sharing-permissions-practice.tsv';
const keyPath='/examples/space-sharing-permissions-cases.tsv';

test('blind six-case worksheet contains exact original scenarios and absolutely no answer or reason columns',()=>{
  const practice=load('public'+path).replace(/\r?\n$/, '').split(/\r?\n/).map(line=>line.split('\t'));
  const answers=load('public'+keyPath).replace(/\r?\n$/, '').split(/\r?\n/).map(line=>line.split('\t'));
  assert.deepEqual(practice[0],['CaseID','FictionalAction','YourVerdict','YourReason','YourPreShareCheck']);
  assert.deepEqual(answers[0],['CaseID','FictionalAction','ExpectedExposure','Why','ReaderPreflight']);
  assert.equal(practice.length,7);
  assert.equal(answers.length,7);
  for(let i=1;i<7;i++) {
    assert.equal(practice[i].length,5);
    assert.equal(answers[i].length,5);
    assert.deepEqual(practice[i].slice(0,2),answers[i].slice(0,2),'No scenario drift across worksheets at row '+i);
    assert.deepEqual(practice[i].slice(2),['','',''],'The worksheet must not leak solutions');
    assert(answers[i][2]&&answers[i][3]&&answers[i][4],'The answer key must retain full reasoning and preflight advice');
  }
  for(const answer of ['PAGE_VIEWERS','SOURCE_PERMISSIONS_STAY','INHERITED_ACCESS'])
    assert(!load('public'+path).includes(answer),'No expected verdict should appear in the blank worksheet');
});

test('all reader entry points lead to the blind exercise first, with an explicit separate answer key',()=>{
  const privacy=load('src/content/articles/ai-privacy-basics.md');
  const project=load('src/content/articles/chatgpt-projects-recurring-work-setup.md');
  const evidence=load('src/pages/evidence.astro');
  for(const content of [privacy,project,evidence]){
    assert(content.includes(path));
    assert(content.includes(keyPath));
    assert(content.indexOf(path) < content.indexOf(keyPath),'Show practice download before reference answer in each reader entry point');
  }
  assert(privacy.includes('**Try a blind review before looking at the answers.**'));
  assert(evidence.includes('six-case blank permission worksheet'));
  assert(evidence.includes('The cases are fictional'));
  assert(!evidence.includes('id="evidence-space-new"'),'Do not introduce a thin standalone evidence category');
});

test('the sharing section separates page permissions, copied personal context, user Memory and user training preferences',()=>{
  const guide=load('src/content/articles/ai-privacy-basics.md');
  const source=JSON.parse(guide.match(/^sources: (\[.*\])$/m)?.[1]??'[]');
  assert(source.some(x=>x.url==='https://help.openai.com/en/articles/20001544-chatgpt-space-sharing-data-and-controls'));
  assert(guide.includes('A shared page has a second boundary: Memory and model training'));
  assert(guide.includes('Their interactions with a page are governed by their settings'));
  assert(guide.includes('if you or ChatGPT put personal context from a prior conversation'));
  assert(guide.includes('Business and Enterprise have a different default'));
  assert(guide.includes('not an experiment in any reader'));
});
