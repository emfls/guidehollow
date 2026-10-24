import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root = new URL('../',import.meta.url);
const read = path => readFileSync(new URL(path,root),'utf8');

test('beginner guide includes a source-bounded example answer, not invented facts',()=>{
  const body = read('src/content/articles/what-is-generative-ai.md');
  assert.match(body,/editor-written example of an acceptable answer/);
  assert.match(body,/Location: \[TO CONFIRM\]/);
  assert.match(body,/Saturday at 10 a\.m\./);
  assert.match(body,/no invented address, organizer, or promise/i);
  assert.match(body,/updatedDate: "2026-10-24"/);
});

test('safe prompt builder demo cannot replace visitor writing',()=>{
  const page=read('src/pages/tools/ai-prompt-builder.astro');
  const script=read('src/scripts/prompt-builder.ts');
  assert.match(page,/id="load-prompt-example"/);
  assert.match(script,/fields\.some\(id =>/);
  assert.match(script,/\|\| output\.value\.trim\(\)/);
  assert.match(script,/Your work was kept/);
  assert.match(script,/Fictional approved notes/);
  assert.match(script,/form\.querySelector<HTMLFieldSetElement>/);
});

test('first-task diagram has textual alternative and honest provenance',()=>{
  const page=read('src/pages/[category]/[slug].astro');
  const svg=read('public/visuals/first-ai-task-source-check.svg');
  assert.match(page,/first-ai-task-source-check\.svg/);
  assert.match(page,/not a native AI test/);
  assert.match(svg,/<title id="title">/);
  assert.match(svg,/<desc id="desc">/);
  assert.match(svg,/Location not confirmed/);
  assert.ok(svg.length<25000);
});
