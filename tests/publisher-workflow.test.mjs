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

test('publisher schedule is unchanged and monitor cannot publish or create duplicate Issues',()=>{
  const publisher=parse(readFileSync('.github/workflows/notion-daily-publisher.yml','utf8'));
  assert.deepEqual(publisher.on.schedule.map(s=>s.cron),[
    '17 0 * * *','29 0 * * *','43 0 * * *',
    '17 6 * * *','29 6 * * *','43 6 * * *',
    '17 12 * * *','29 12 * * *','43 12 * * *'
  ]);
  const slotExpr=publisher.jobs.publish.env.PUBLISH_SLOT;
  for (const [hour,slot] of [['0','morning'],['6','afternoon'],['12','evening']]) {
    for (const minute of [17,29,43]) {
      assert(slotExpr.includes(`'${minute} ${hour} * * *'`),`Missing ${slot} fallback cron ${minute}:${hour}`);
    }
  }
  assert.equal(publisher.concurrency.group,'guidehollow-notion-daily-publisher');
  assert.equal(publisher.concurrency['cancel-in-progress'],false);
  const steps=publisher.jobs.publish.steps;
  const stage=steps.find(s=>s.id==='stage');
  assert.equal(stage.if,"steps.timing.outputs.allowed == 'true'");
  const commit=steps.find(s=>s.id==='article_commit').run;
  assert(commit.indexOf('publisher_timing.py --require-allowed')<commit.indexOf('git push'));
  assert(steps.some(s=>s.if==='always()'&&s.run==='python scripts/publisher_monitor.py receipt'));
  assert(steps.some(s=>s.with?.name==='publisher-observation-${{ github.run_id }}-${{ github.run_attempt }}'));
  const monitor=parse(readFileSync('.github/workflows/publisher-monitor.yml','utf8'));
  assert.deepEqual(monitor.permissions,{contents:'read',actions:'read',deployments:'read'});
  assert.equal(monitor.concurrency['cancel-in-progress'],false);
  assert.equal(monitor.jobs.observe.steps.find(s=>s.uses?.startsWith('actions/checkout@')).with['persist-credentials'],false);
  assert(monitor.jobs.observe.steps.some(s=>s.run==='python scripts/publisher_monitor.py check > /tmp/publisher-monitor.json'));
});

test('external trigger templates stay disabled, secret-free and bound to existing named slots',()=>{
  const templates=JSON.parse(readFileSync('docs/examples/cron-job-org-main.disabled.json','utf8'));
  const publisher=parse(readFileSync('.github/workflows/notion-daily-publisher.yml','utf8'));
  assert.equal(templates.length,3);
  for (const [i,slot] of ['morning','afternoon','evening'].entries()) {
    const job=templates[i].job;
    assert.equal(job.enabled,false);
    assert.equal(job.url,'https://api.github.com/repos/emfls/guidehollow/actions/workflows/notion-daily-publisher.yml/dispatches');
    assert.equal(job.requestMethod,1); // cron-job.org POST
    assert.equal(job.saveResponses,false);
    assert.equal(job.redirectSuccess,false);
    assert.equal(job.requestTimeout,30);
    assert.deepEqual(job.schedule,{timezone:'Asia/Seoul',hours:[[9,15,21][i]],minutes:[17],mdays:[-1],months:[-1],wdays:[-1]});
    assert.deepEqual(JSON.parse(job.extendedData.body),{ref:'main',inputs:{slot}});
    assert(publisher.on.workflow_dispatch.inputs.slot.options.includes(slot));
    assert.deepEqual(Object.keys(job.extendedData.headers).sort(),['Accept','Content-Type','X-GitHub-Api-Version']);
  }
  assert.equal(publisher.jobs.publish.env.PUBLISH_BOUND_MANUAL_SLOT,
    "${{ github.event_name == 'workflow_dispatch' && inputs.slot != '' && inputs.slot != 'manual' }}");
  assert(publisher.jobs.publish.steps.some(s=>s.run?.includes('PUBLISH_RUN_CREATED_AT=$created')));
  assert(publisher.jobs.publish.steps.find(s=>s.id==='timing').run.includes('publisher_timing.py'));
});
