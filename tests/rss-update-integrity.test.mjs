import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderRssItems } from '../src/lib/feed.ts';
import { xmlEscape } from '../src/lib/xml.ts';

const fixtures = [
  { title: 'Older guide <updated> & verified', description: 'A & B < C', url: '/guides/older/', category: 'guides', publishedDate: new Date('2026-09-01T00:00:00Z'), updatedDate: new Date('2026-11-02T00:00:00Z') },
  { title: 'Newer guide', description: 'Original', url: '/guides/newer/', category: 'guides', publishedDate: new Date('2026-10-31T00:00:00Z'), updatedDate: new Date('2026-10-31T00:00:00Z') },
  { title: 'Unmodified guide', description: 'No revisions', url: '/guides/untouched/', category: 'guides', publishedDate: new Date('2026-10-01T00:00:00Z'), updatedDate: new Date('2026-10-01T00:00:00Z') },
];

test('revised older articles appear first without falsifying original publication dates', () => {
  const original = structuredClone(fixtures);
  const xml = renderRssItems(fixtures, 'https://guidehollow.com');
  assert.deepEqual(fixtures, original, 'Never mutate caller publication order');
  assert(xml.indexOf('/guides/older/') < xml.indexOf('/guides/newer/'));
  assert(xml.indexOf('/guides/newer/') < xml.indexOf('/guides/untouched/'));
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => match[1]);
  assert.equal(items.length, 3);
  assert(items[0].includes('<pubDate>Tue, 01 Sep 2026 00:00:00 GMT</pubDate>'));
  assert(items[0].includes('<dcterms:modified>2026-11-02T00:00:00.000Z</dcterms:modified>'));
  assert(items[0].includes('<guid isPermaLink="true">https://guidehollow.com/guides/older/</guid>'));
  assert(items[0].includes('<link>https://guidehollow.com/guides/older/</link>'));
  assert(items[1].includes('<dcterms:modified>2026-10-31T00:00:00.000Z</dcterms:modified>'));
});

test('RSS XML-escapes editorial content and retains one stable GUID per post', () => {
  const xml=renderRssItems(fixtures,'https://guidehollow.com');
  assert(xml.includes('<title>Older guide &lt;updated&gt; &amp; verified</title>'));
  assert(xml.includes('<description>A &amp; B &lt; C</description>'));
  assert.equal((xml.match(/<guid isPermaLink="true">/g)||[]).length,3);
  assert.equal(xmlEscape('Tom\'s "test" & <tag>'),'Tom&apos;s &quot;test&quot; &amp; &lt;tag&gt;');
});

test('feed is deterministic across runs and stable when dates tie', () => {
  const tied=fixtures.map(item=>({...item,updatedDate:new Date('2026-11-02T00:00:00Z')}));
  assert.equal(renderRssItems(tied,'https://guidehollow.com'), renderRssItems(tied,'https://guidehollow.com'));
  const xml=renderRssItems(tied,'https://guidehollow.com');
  assert(xml.indexOf('/guides/newer/') < xml.indexOf('/guides/untouched/'));
});

test('endpoint exposes modified date without synthesizing fake edit timestamps', () => {
  const source=readFileSync(new URL('../src/pages/rss.xml.ts',import.meta.url),'utf8');
  assert(source.includes('xmlns:dcterms="http://purl.org/dc/terms/"'));
  assert(source.includes('updatedDate: post.data.updatedDate'));
  assert(source.includes('publishedDate: post.data.publishedDate'));
  assert(!source.includes('new Date()'),'RSS must not claim an update on every build');
  const sitemap=readFileSync(new URL('../src/pages/sitemap.xml.ts',import.meta.url),'utf8');
  assert(sitemap.includes('post.data.updatedDate.toISOString().slice(0,10)'));
});
