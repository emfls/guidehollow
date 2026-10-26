import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';

test('queued publishers read the latest main ledger and serialize with reconciliation',()=>{
  const workflow=parse(readFileSync('.github/workflows/notion-daily-publisher.yml','utf8'));
  const recovery=parse(readFileSync('.github/workflows/main-ledger-reconcile.yml','utf8'));
  assert.equal(workflow.concurrency.group,recovery.concurrency.group);
  assert.equal(workflow.concurrency['cancel-in-progress'],false);
  const steps=workflow.jobs.publish.steps;
  assert.equal(steps.find(s=>s.uses?.startsWith('actions/checkout@')).with.ref,'main');
  const verify=steps.findIndex(s=>s.run==='python scripts/verify_pages_deployment.py');
  const finalize=steps.findIndex(s=>s.run?.includes('notion_publish_daily.py finalize'));
  assert(verify>=0 && finalize>verify);
  assert.equal(steps[verify].if,"steps.stage.outputs.status == 'STAGED'");
  assert.equal(steps[finalize].env.PUBLISHED_COMMIT_SHA,steps[verify].env.ARTICLE_SHA);
});
