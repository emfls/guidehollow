import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const privacy=read('src/content/articles/ai-privacy-basics.md');
const project=read('src/content/articles/chatgpt-projects-recurring-work-setup.md');
const path='/examples/space-sharing-permissions-cases.tsv';
const help='https://help.openai.com/en/articles/20001549-getting-started-with-space-in-chatgpt';

test('privacy guide makes three distinct documented Space share outcomes inspectable',()=>{
  assert(privacy.includes('updatedDate: "2026-11-03"'));
  const items=JSON.parse(privacy.match(/^sources: (\[.+\])$/m)?.[1]??'[]');
  assert(items.some(x=>x.url===help));
  assert(privacy.includes('file uploaded **into the page**'));
  assert(privacy.includes('does **not automatically grant**'));
  assert(privacy.includes('copied text **even if they cannot open the original file**'));
  assert(privacy.includes('direct page invitation'));
  assert(privacy.includes('parent page'));
  assert(privacy.includes('Projects remain separate'));
  assert(privacy.includes('not a live test in anyone'));
  assert(privacy.includes(path));
});

test('original six-case worksheet is a complete independent artifact with different permission results',()=>{
  const lines=read('public/examples/space-sharing-permissions-cases.tsv').trimEnd().split(/\r?\n/);
  assert.equal(lines[0],'CaseID\tFictionalAction\tExpectedExposure\tWhy\tReaderPreflight');
  assert.equal(lines.length,7);
  const rows=lines.slice(1).map(line=>line.split('\t'));
  assert(rows.every(row=>row.length===5));
  assert.deepEqual(rows.map(row=>row[0]),['S01','S02','S03','S04','S05','S06']);
  const byId=Object.fromEntries(rows.map(row=>[row[0],row[2]]));
  assert.equal(byId.S01,'PAGE_VIEWERS');
  assert.equal(byId.S02,'SOURCE_PERMISSIONS_STAY');
  assert.equal(byId.S03,'SOURCE_PERMISSIONS_STAY');
  assert.equal(byId.S04,'PAGE_VIEWERS');
  assert.equal(byId.S05,'INHERITED_ACCESS');
  assert.equal(byId.S06,'INHERITED_ACCESS');
  assert(rows.every(row=>row.slice(1).every(Boolean)));
  assert(privacy.includes('**Case S03:**'));
  assert(privacy.includes('**Case S04:**'));
  assert(privacy.includes('**Case S05:**'));
  assert(privacy.includes('**Case S06:**'));
});

test('Projects remains distinct from Space permissions after the dated factual update',()=>{
  assert(project.includes('updatedDate: "2026-11-03"'));
  assert(project.includes('Projects are not Space pages'));
  assert(project.includes(help));
  assert(project.includes('Project-only memory controls'));
  assert(project.includes('review the **Space audience again**'));
  assert(project.includes(path));
  assert(project.includes('/guides/ai-privacy-basics/'));
});
