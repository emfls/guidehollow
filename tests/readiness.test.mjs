import test from 'node:test';
import assert from 'node:assert/strict';
import { validPublisherId } from '../src/config.ts';

test('topic archives need three guides to exist and remain noindex', async () => {
  const { isIndexableTag, isUsefulTagArchive } = await import('../src/lib/seo.ts');
  assert.equal(isIndexableTag(0),false);
  assert.equal(isIndexableTag(1),false);
  assert.equal(isIndexableTag(2),false);
  assert.equal(isIndexableTag(20),false);
  assert.equal(isUsefulTagArchive(0),false);
  assert.equal(isUsefulTagArchive(1),false);
  assert.equal(isUsefulTagArchive(2),false);
  assert.equal(isUsefulTagArchive(3),true);
  assert.equal(isUsefulTagArchive(12),true);
});

test('publisher syntax requires the actual AdSense account shape', () => {
  assert.equal(validPublisherId(''),false);
  assert.equal(validPublisherId('pub-'+ '1'.repeat(16)),false);
  assert.equal(validPublisherId('ca-pub-'+ '1'.repeat(15)),false);
  assert.equal(validPublisherId('ca-pub-'+ '1'.repeat(16)+'\n'),false);
  assert.equal(validPublisherId('ca-pub-'+ '1'.repeat(16)),true);
});
