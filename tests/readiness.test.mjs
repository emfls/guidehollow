import test from 'node:test';
import assert from 'node:assert/strict';
import { validPublisherId } from '../src/config.ts';

test('navigation-only tag archives stay available but no tag list is indexable', async () => {
  const { isIndexableTag } = await import('../src/lib/seo.ts');
  assert.equal(isIndexableTag(0),false);
  assert.equal(isIndexableTag(1),false);
  assert.equal(isIndexableTag(2),false);
  assert.equal(isIndexableTag(20),false);
});

test('publisher syntax requires the actual AdSense account shape', () => {
  assert.equal(validPublisherId(''),false);
  assert.equal(validPublisherId('pub-'+ '1'.repeat(16)),false);
  assert.equal(validPublisherId('ca-pub-'+ '1'.repeat(15)),false);
  assert.equal(validPublisherId('ca-pub-'+ '1'.repeat(16)+'\n'),false);
  assert.equal(validPublisherId('ca-pub-'+ '1'.repeat(16)),true);
});
