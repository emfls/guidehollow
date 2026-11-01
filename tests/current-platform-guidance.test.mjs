import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readArticle = slug => readFileSync(
  new URL('../src/content/articles/' + slug + '.md', import.meta.url), 'utf8');
const getSources = article => JSON.parse(article.match(/^sources:\s*(.*)$/m)?.[1] ?? 'null');
const spaceDoc = 'https://help.openai.com/en/articles/20001549-getting-started-with-space-in-chatgpt';

test('upload guidance distinguishes rate, storage, Library and Space without destructive quick fixes', () => {
  const article=readArticle('chatgpt-file-upload-problems');
  assert.match(article,/updatedDate: "2026-11-02"/);
  assert.match(article,/Settings → Storage/);
  assert.match(article,/Space.*instead of Library/);
  assert.match(article,/does \*\*not\*\* tell you how much of a rolling upload-rate allowance remains/);
  assert.match(article,/Deleting a conversation alone does \*\*not\*\* delete a separate file/);
  assert.match(article,/Do not remove irreplaceable files/);
  assert.match(article,/PDF with charts deserves an additional distinction/);
  assert.match(article,/not the result of measured account-specific upload tests/);
  assert(getSources(article).some(item=>item.url===spaceDoc),'Need a direct official Space citation');
});

test('project guide preserves memory, shared access and saved-file deletion boundaries', () => {
  const article=readArticle('chatgpt-projects-recurring-work-setup');
  assert.match(article,/updatedDate: "2026-11-02"/);
  assert.match(article,/change the mode later from \*\*Project settings → Memory\*\*/);
  assert.match(article,/may take a few hours to apply/);
  assert.match(article,/Shared projects automatically use project-only memory and cannot be switched to default/);
  assert.match(article,/Files separately saved in \*\*Library or Space\*\* are not deleted/);
  assert.match(article,/\*\*not\*\* a verified test in a live workspace/);
  assert(getSources(article).some(item=>item.url===spaceDoc),'Need official Space reference');
  for (const source of getSources(article)) assert(!source.title.includes('— reference'),source.title);
});

test('source-freshness links stay accessible from the published guide body', () => {
  for(const slug of ['chatgpt-file-upload-problems','chatgpt-projects-recurring-work-setup']) {
    const article=readArticle(slug);
    assert(article.includes(']('+spaceDoc+')'),slug+' must link directly to Space help');
    assert(!article.includes('Documentation reviewed October 26, 2026.'),
      slug+' must not present an old date as a current complete source review');
  }
});
