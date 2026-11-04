import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const root='public/examples/meeting-action-audit/';
const source=read(root+'source-notes.txt');
const practice=read(root+'practice.tsv');
const key=read(root+'answer-key.tsv');
const parseTsv=(text,header)=> {
  const lines=text.trimEnd().split(/\r?\n/);
  assert.equal(lines.shift(),header,'A public worksheet needs exactly the documented columns');
  return lines.map((line,index)=>{
    const fields=line.split('\t');
    assert.equal(fields.length,header.split('\t').length,'TSV record '+(index+2)+' has an unexpected column count');
    assert(fields.every(x=>x.trim().length>0),'TSV has an empty field on row '+(index+2));
    return fields;
  });
};
const practiceHeader='CaseID\tDraftClaimToAudit';
const answerHeader='CaseID\tEditorialTreatment\tSourceIDs\tCorrectedStatement\tEditorialReason';

function verify(textSource,blank,keyText) {
  const ids=[...textSource.matchAll(/^\[(D\d{2}|M\d{2})\]\s+(.+)$/gm)].map(m=>m[1]);
  assert.equal(ids.length,13,'Original packet should hold three proposal and ten approved source lines');
  assert.equal(new Set(ids).size,ids.length,'Source line IDs cannot repeat');
  assert.deepEqual(ids,[
    'D01','D02','D03','M01','M02','M03','M04','M05','M06','M07','M08','M09','M10'
  ]);
  const rows=parseTsv(blank,practiceHeader);
  const answers=parseTsv(keyText,answerHeader);
  assert.equal(rows.length,15);
  assert.equal(answers.length,15);
  assert.deepEqual(rows.map(r=>r[0]),Array.from({length:15},(_,i)=>'C'+String(i+1).padStart(2,'0')));
  assert.deepEqual(answers.map(r=>r[0]),rows.map(r=>r[0]));
  assert(!/\b(?:EditorialTreatment|CorrectedStatement|EditorialReason|KEEP|REWRITE|REMOVE)\b/.test(blank),
    'Readers must not see the verdicts before opening the answer key');
  const categories={KEEP:0,REWRITE:0,REMOVE:0};
  for(const [id,treatment,refs,corrected,reason] of answers){
    assert(Object.hasOwn(categories,treatment),'Unknown answer treatment for '+id);
    categories[treatment]++;
    assert(reason.length>=30,'Explain each editorial judgment');
    assert(corrected.length>=18,'Every judgment must include a useful correction or explicit removal');
    for(const ref of refs.split(','))assert(ids.includes(ref),'Unknown source reference '+ref+' in '+id);
  }
  assert.deepEqual(categories,{KEEP:6,REWRITE:3,REMOVE:6});
  return answers;
}

test('the fifteen blind exercises have stable records, source IDs and a separate complete editorial key',()=>{
  const rows=verify(source,practice,key);
  assert.equal(rows.find(x=>x[0]==='C05')[1],'REWRITE');
  assert.equal(rows.find(x=>x[0]==='C07')[1],'REMOVE');
  assert.equal(rows.find(x=>x[0]==='C10')[1],'REWRITE');
  assert.equal(rows.find(x=>x[0]==='C11')[1],'KEEP');
  assert.equal(rows.find(x=>x[0]==='C14')[1],'REWRITE');
  assert(source.includes('The condition is not yet met.'));
  assert(source.includes('No owner or due date was assigned to signage review.'));
  assert(source.includes('This meeting date is not a blanket deadline'));
});

test('fixture validation detects corrupted references, leaked answer labels and missing cases',()=>{
  assert.throws(()=>verify(source,practice,key.replace('D01,M01','D99,M01')),/Unknown source reference/);
  assert.throws(()=>verify(source,practice.replace('C15\t','C14\t'),key));
  assert.throws(()=>verify(source,practice+'C16\tKEEP: fake answer\n',key));
  assert.throws(()=>verify(source.replace('[M10]','[M09]'),practice,key),/Source line IDs cannot repeat/);
});

test('both guides and evidence library link the original source, blind sheet and separate key with honest scope',()=>{
  const extraction=read('src/content/articles/extract-meeting-action-items-with-ai.md');
  const framework=read('src/content/articles/a-practical-ai-prompt-framework.md');
  const library=read('src/pages/evidence.astro');
  const categories=read('src/pages/[category]/index.astro');
  const urls=[
    '/examples/meeting-action-audit/source-notes.txt',
    '/examples/meeting-action-audit/practice.tsv',
    '/examples/meeting-action-audit/answer-key.tsv',
  ];
  for(const url of urls){
    assert(extraction.includes(url),'Missing extraction-guide link '+url);
    assert(framework.includes(url),'Missing framework-guide link '+url);
    assert(library.includes(url),'Missing evidence-library link '+url);
  }
  assert(extraction.includes('updatedDate: "2026-11-04"'));
  assert(framework.includes('updatedDate: "2026-11-04"'));
  assert(extraction.includes('This is a **blind editorial source-reading exercise**'));
  assert(framework.includes('not a record of a live AI system'));
  assert(library.includes('id="evidence-meeting-actions"'));
  assert(categories.includes("['extract-meeting-action-items-with-ai', 'Extract approved meeting tasks"));
  assert(source.includes('All names, quantities, dates, and currency-like amounts are invented.'));
});
