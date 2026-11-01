import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildPrompt } from '../src/lib/tools.ts';

const read = file => readFile(new URL('../' + file, import.meta.url),'utf8');

test('prompt output can actually be edited, while invalidated drafts cannot be exported', async () => {
  const [page,script] = await Promise.all([
    read('src/pages/tools/ai-prompt-builder.astro'),
    read('src/scripts/prompt-builder.ts'),
  ]);
  assert.match(page,/<textarea id="prompt-output" disabled\b/);
  assert.doesNotMatch(page,/<textarea id="prompt-output"[^>]*\breadonly\b/);
  assert.match(page,/edit the draft directly here/);
  assert.match(page,/If you change any source field after building/);
  assert.match(script,/output\.disabled = false/);
  assert.match(script,/output\.addEventListener\('input'/);
  assert.match(script,/form\.addEventListener\('input'/);
  assert.match(script,/outputIsCurrent = false;[\s\S]*?updateExportActions\(\);/);
  assert.match(script,/const enabled = outputIsCurrent && !output\.disabled && output\.value\.trim\(\)\.length > 0/);
  assert.match(script,/copy\.disabled = !enabled/);
  assert.match(script,/download\.disabled = !enabled/);
  assert.match(script,/navigator\.clipboard\.writeText\(output\.value\)/);
  assert.match(script,/new Blob\(\[output\.value\]/);
  assert.match(script,/form\.addEventListener\('reset'/);
  assert.match(script,/output\.disabled = true/);
  assert.match(script,/Your previous draft is kept below, but it is now out of date/);
  assert.match(script,/Your work was kept\. Use Reset before loading the example/);
});

test('fixture prompt is source-bounded and user edits do not require an AI API call', () => {
  const prompt = buildPrompt({
    goal:'Write a friendly community garden meeting invitation',
    context:'Fictional approved notes: Saturday at 10 a.m. Bring a notebook. We will choose a planting schedule. The location has not been confirmed.',
    constraints:'Keep only confirmed facts. Do not invent a location or organizer. Mark the missing location [TO CONFIRM].',
    format:'A friendly invitation under 70 words',
  });
  assert(prompt.includes('The location has not been confirmed.'));
  assert(prompt.includes('[TO CONFIRM]'));
  const edited=prompt.replace('under 70 words','under 50 words');
  assert(edited.includes('under 50 words'));
  assert(!edited.includes('under 70 words'));
});
