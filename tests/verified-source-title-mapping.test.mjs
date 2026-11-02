import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const folder = '../src/content/articles/';
const cases = {
  'ai-clarifying-question-gate-missing-information': ['OpenAI API: Prompt engineering','Google AI for Developers: Prompt design strategies','Claude Developer Docs: Prompting best practices','Source-to-claim boundary'],
  'few-shot-prompt-examples-teach-rules-not-keywords': ['OpenAI API: Prompt engineering','Google AI for Developers: Prompt design strategies','Claude Developer Docs: Prompting best practices','Python documentation: collections.Counter','What each source establishes'],
  'revise-one-ai-answer-section-without-changing-approved-text': ['OpenAI API: Prompt engineering','OpenAI API: Evaluation best practices','Python documentation: Built-in types — str.splitlines','Evidence boundaries'],
  'chatgpt-search-vs-deep-research-vs-standard-chat': ['OpenAI Help Center: Searching the web with ChatGPT','OpenAI Help Center: Deep research in ChatGPT','OpenAI Help Center: Does ChatGPT tell the truth?','Source-to-claim boundary','not using app write actions'],
};
for (const [slug, expected] of Object.entries(cases)) {
  test(slug + ': official references have verified names and bounded claims',()=>{
    const content=readFileSync(new URL(folder + slug + '.md',import.meta.url),'utf8');
    assert.match(content,/updatedDate: "2026-11-02"/);
    const m=content.match(/^sources: (\[[^\n]+\])/m);
    assert(m,'Article source register required');
    const refs=JSON.parse(m[1]);
    assert(refs.length >= 3,'At least three appropriate sources');
    assert(refs.every(x=>x.url.startsWith('https://')&&!/— reference$/.test(x.title)),'Do not restore opaque references');
    for (const title of expected) assert(content.includes(title),'Missing verified title or claim boundary: '+title);
  });
}

test('research guide explains connected-source permissions without claiming write access',()=>{
  const content=readFileSync(new URL(folder+'chatgpt-search-vs-deep-research-vs-standard-chat.md',import.meta.url),'utf8');
  assert(content.includes('reading available connected-app sources for research'));
  assert(content.includes('not using app write actions'));
  assert(content.includes('A research report or suggested action is not evidence that an external account was changed'));
  assert(!content.includes('Documentation checked October 26, 2026'));
  assert(!content.includes('Product guidance reviewed against OpenAI\'s official documentation on October 26, 2026'));
});
