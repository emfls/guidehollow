import test from 'node:test';
import assert from 'node:assert/strict';

test('prompt builder requires a goal instead of silently producing a prompt', async () => {
  const { buildPrompt } = await import('../src/lib/tools.ts');
  assert.throws(() => buildPrompt({ goal: '  ' }), /goal/i);
});

test('prompt preserves user text, trims boundaries and omits missing fields', async () => {
  const { buildPrompt } = await import('../src/lib/tools.ts');
  assert.equal(buildPrompt({ goal: ' Explain fractions ', context: '<script>example</script>', audience: '', constraints: 'Under 100 words', format: 'Numbered steps' }),
    'Goal\nExplain fractions\n\nContext\n<script>example</script>\n\nConstraints\nUnder 100 words\n\nOutput format\nNumbered steps');
});

test('checklist reports reviewed items without claiming factual correctness', async () => {
  const { checklistSummary } = await import('../src/lib/tools.ts');
  assert.equal(checklistSummary(0, 6), '0 of 6 checks completed. Review each item before using the response.');
  assert.equal(checklistSummary(6, 6), '6 of 6 checks completed. This records your review; it does not certify accuracy.');
});
