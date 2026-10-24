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

test('email drafting reference stays within the approved scheduling brief',()=>{
 const article=read('how-to-draft-emails-with-ai');
 const match=article.match(/## A complete reference email[\\s\\S]*?```text\\n([\\s\\S]*?)\\n```/);
 assert.ok(match,'The article needs a copyable complete editorial example');
 const email=match[1];
 assert.match(email,/Subject: Which planning meeting window works\\?/);
 assert.match(email,/\\[OPTION A\\] or \\[OPTION B\\]/);
 assert.match(email,/proposed agenda is to review the draft volunteer checklist/);
 assert.match(email,/Neither time has been confirmed, and the venue is not booked\\./);
 assert.doesNotMatch(email,/I booked|invitation has been sent|meeting is confirmed/i);
 assert.ok(email.trim().split(/\\s+/).length<130,'Email reference must match the brief word limit');
 assert.match(article,/editor-written reference.*not a captured ChatGPT response/);
 assert.match(article,/updatedDate: "2026-10-24"/);
});

test('prompt injection article names its exact official sources',()=>{
 const article=read('spot-prompt-injection-in-documents');
 assert.match(article,/OWASP: LLM01:2025 Prompt Injection/);
 assert.match(article,/OpenAI: Understanding prompt injections: a frontier security challenge/);
 assert.match(article,/OpenAI: Designing AI agents to resist prompt injection/);
 assert.doesNotMatch(article,/— reference/);
});
