import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = slug => readFileSync(new URL('../src/content/articles/' + slug + '.md',import.meta.url),'utf8');
const sources = text => {
  const line = text.match(/^sources:\s*(.+)$/m);
  assert(line,'Each article must have structured sources');
  return JSON.parse(line[1]);
};

test('sharing guide explicitly separates chat deletion from lingering scheduled task shares', () => {
  const article=read('chatgpt-shared-links-audit-revoke-access');
  assert.match(article,/updatedDate: "2026-11-02"/);
  assert.match(article,/deleting a conversation may leave a shared task link/i);
  assert.match(article,/associated scheduled task is \*\*paused\*\*/i);
  assert.match(article,/shared task link remains available/i);
  assert.match(article,/original scheduled task/i);
  assert.match(article,/Copies already scheduled by someone else remain/i);
  assert.match(article,/Lock.*conversation/i);
  assert.match(article,/previously shared content remains accessible until the link is explicitly deleted/i);
  assert.match(article,/https:\/\/chatgpt\.com\/share\//);
  assert.match(article,/https:\/\/chatgpt\.com\/s\//);
  assert.match(article,/not.*live test of an account/i);
  assert.match(article,/Settings → Data controls → Shared links → Manage/);
});

test('high-impact article references show publisher and descriptive titles rather than unverified placeholders', () => {
  const guides=['chatgpt-shared-links-audit-revoke-access',
    'compare-two-documents-ai-without-missing-changes',
    'build-policy-faq-with-ai-without-inventing-rules'];
  const referenceCounts=[2,5,3];
  for(let i=0;i<guides.length;i++){
    const article=read(guides[i]);
    assert.match(article,/updatedDate: "2026-11-02"/,guides[i]);
    const refs=sources(article);
    assert.equal(refs.length,referenceCounts[i],guides[i]);
    const unique=new Set(refs.map(x=>x.url));
    assert.equal(unique.size,refs.length, guides[i]+' duplicated source metadata');
    for(const reference of refs){
      assert(reference.title.length>=20,guides[i]+': source title is too generic');
      assert(!/ — reference$/i.test(reference.title),guides[i]+': opaque reference label');
      const parsed=new URL(reference.url);
      assert.equal(parsed.protocol,'https:');
      assert(reference.title.includes(':'),reference.title+' should identify a real publisher');
    }
    assert(!article.includes('\\n\\n**What was tested:**'));
    assert(!article.includes('\\n\\n**Verification note:**'));
  }
  const policy=read(guides[2]);
  assert(policy.includes('https://help.openai.com/en/articles/10032626-prompt-engineering-best-practices-for-chatgpt'));
  assert(!policy.includes('https://help.openai.com/en/articles/10032626"'));
  assert.match(policy,/authorization notice/i);
});

test('editorial source refresh discloses what was and was not independently exercised', () => {
  const doc=read('compare-two-documents-ai-without-missing-changes');
  const policy=read('build-policy-faq-with-ai-without-inventing-rules');
  assert.match(doc,/This verifies the cited reference pages, not the behavior of a live Word or Docs installation/);
  assert.match(doc,/We did not run an AI comparison/);
  assert.match(policy,/No live AI service/);
  assert.match(policy,/not constitute a live test of that service/);
});
