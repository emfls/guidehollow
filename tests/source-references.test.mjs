import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceReferenceLabel } from '../src/lib/source-references.ts';
import { readFile } from 'node:fs/promises';

test('source labels improve opaque references using only URL-defined topics', () => {
  assert.equal(sourceReferenceLabel('support.microsoft.com — reference', 'https://support.microsoft.com/en-us/excel/functions/sumifs-function'), 'Microsoft Support — SUMIFS Function');
  assert.equal(sourceReferenceLabel('help.openai.com — reference', 'https://help.openai.com/en/articles/8437071-data-analysis-with-chatgpt'), 'OpenAI Help Center — Data Analysis With ChatGPT');
  assert.equal(sourceReferenceLabel('helpx.adobe.com — reference', 'https://helpx.adobe.com/acrobat/desktop/create-documents/scan-documents-to-pdfs/recognize-text.html'), 'Adobe Help — Recognize Text');
  assert.equal(sourceReferenceLabel('support.google.com — reference', 'https://support.google.com/docs/answer/3256550?hl=en'), 'Google Help — help article #3256550');
  assert.equal(sourceReferenceLabel('developers.openai.com — reference', 'https://developers.openai.com/api/docs/guides/structured-outputs'), 'OpenAI API documentation — Structured Outputs');
  assert.equal(sourceReferenceLabel('www.nasa.gov — reference', 'https://www.nasa.gov/reference/6-2-requirements-management/'), 'NASA — Requirements Management');
  assert.equal(sourceReferenceLabel('Official Microsoft SUMIFS help', 'https://support.microsoft.com/example'), 'Official Microsoft SUMIFS help');
});

test('labels distinguish honest URL-based topics from claimed page titles', async () => {
  const page = await readFile(new URL('../src/pages/[category]/[slug].astro',import.meta.url),'utf8');
  assert(page.includes('sourceReferenceLabel(source.title, source.url)'));
  assert(page.includes('References and source documents'));
  assert(page.includes('derived from the URL') && page.includes('not a verified document title'));
  assert(page.includes('source.url'));
});
