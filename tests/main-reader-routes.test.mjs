import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

test('main-site reader routes stay self-contained during AdSense review', async () => {
  const directory = 'src/content/articles';
  const filenames = (await readdir(directory)).filter(name => name.endsWith('.md'));
  const articles = await Promise.all(filenames.map(async name => ({
    name, content: await readFile(`${directory}/${name}`, 'utf8'),
  })));
  const stray = articles.filter(({ content }) => /https?:\/\/sheets\.guidehollow\.com\//i.test(content));
  assert.deepEqual(stray.map(({ name }) => name), [],
    'Published main-site articles should not send users to unverified sheets subdomain routes');

  const spreadsheet = articles.find(({ name }) => name === 'how-to-use-ai-for-spreadsheet-tasks.md')?.content;
  const monthly = articles.find(({ name }) => name === 'audit-ai-monthly-totals-with-timestamps.md')?.content;
  assert(spreadsheet && monthly, 'Both first-party spreadsheet guides must exist');
  assert.match(spreadsheet, /\/guides\/audit-ai-monthly-totals-with-timestamps\//);
  assert.match(spreadsheet, /October 31, 23:59/);
  assert.match(spreadsheet, /November 1, 00:00/);
  assert.match(monthly, /October Paid total/);
  assert.match(monthly, /\*\*295\*\*/);
  assert.match(monthly, /\*\*190\*\*/);

  const guides = await readFile('src/pages/[category]/index.astro', 'utf8');
  assert.match(guides, /\['audit-ai-monthly-totals-with-timestamps', 'Diagnose a month-end total/);

  const privacyGuide = articles.find(({ name }) => name === 'ai-privacy-basics.md')?.content;
  assert(privacyGuide, 'Privacy guide must exist');
  assert.match(privacyGuide, /all four free browser tools/);
  assert.match(privacyGuide, /does not upload your answers/);
  assert.doesNotMatch(privacyGuide, /two free tools/);
});
