import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = slug => readFileSync(new URL('../src/content/articles/' + slug + '.md',import.meta.url),'utf8');

test('upload help distinguishes Library storage from rate limits and avoids destructive instructions',()=>{
 const article=read('chatgpt-file-upload-problems');
 assert.match(article,/upload-rate limit.*Library storage/i);
 assert.match(article,/Settings → Storage/);
 assert.match(article,/does \*\*not\*\* tell you how much of a rolling upload-rate allowance remains/);
 assert.match(article,/Deleting a conversation alone does \*\*not\*\* delete a separate file/);
 assert.match(article,/help\.openai\.com\/en\/articles\/20001052-using-library-to-manage-files-in-chatgpt/);
 assert.match(article,/Do not remove irreplaceable files/);
 assert.match(article,/updatedDate: "2026-10-24"/);
});

test('Search article separates research from account deletion claims',()=>{
 const article=read('how-to-use-chatgpt-search');
 assert.match(article,/does not confirm whether any specific file exists/);
 assert.match(article,/file-upload diagnostics/);
 assert.match(article,/updatedDate: "2026-10-24"/);
});

test('AI spreadsheet guide points to worked formula examples rather than implying native execution',()=>{
 const article=read('how-to-use-ai-for-spreadsheet-tasks');
 assert.match(article,/https:\/\/sheets\.guidehollow\.com\/formulas\/sumifs-with-dates\//);
 assert.match(article,/https:\/\/sheets\.guidehollow\.com\/tools\/formula-finder\//);
 assert.match(article,/reference, not a spreadsheet execution engine/);
 assert.match(article,/not executed in a live Excel workbook/);
});
