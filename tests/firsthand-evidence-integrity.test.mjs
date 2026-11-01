import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { auditWeightedPriceCsv } from '../src/lib/weighted-price.ts';
import { parseClaimCases, scoreClaimCases, PRACTICE_IDS } from '../src/lib/claim-audit.ts';

const read = path => readFile(new URL('../' + path,import.meta.url),'utf8');
test('public firsthand browser evidence is backed by actual reproducible source input', async () => {
  const [raw,baseCsv,claimCsv,article,evidencePage] = await Promise.all([
    read('public/examples/firsthand-browser-qa-2026-11-01.json'),
    read('public/examples/weighted-price-sample.csv'),
    read('public/examples/claim-boundary-audit.csv'),
    read('src/content/articles/verify-ai-weighted-average-price-spreadsheet.md'),
    read('src/pages/evidence.astro'),
  ]);
  const report = JSON.parse(raw);
  assert.equal(report.date,'2026-11-01');
  assert.equal(report.trials.length,6);
  assert(report.scope.includes('No Excel, Google Sheets, ChatGPT'));
  const [base,quantity,invalid,claim,smoke,complete] = report.trials;
  for(const trial of report.trials){
    assert.match(trial.runUrl,/^https:\/\/agent\.tinyfish\.ai\/runs\/[0-9a-f-]{36}$/);
    assert(trial.url.startsWith('https://guidehollow.com/tools/'));
  }
  const baseCalculated=auditWeightedPriceCsv(baseCsv);
  assert.equal(base.observed.rowCount,baseCalculated.rowCount);
  assert.equal(base.observed.units,baseCalculated.units);
  assert.equal(base.observed.revenue,baseCalculated.revenue);
  assert.equal(base.observed.displayedWeightedPrice,Number(baseCalculated.weightedPrice.toFixed(2)));
  assert.equal(base.observed.displayedSimplePriceMean,baseCalculated.simplePriceMean);
  assert.deepEqual(baseCalculated.channels.map(x=>[x.channel,x.units,x.revenue]),[['Web',7,280],['Store',20,250]]);
  const changed=baseCsv.replace('L-102,Web,4,25','L-102,Web,40,25');
  assert.notEqual(changed,baseCsv);
  const recalculated=auditWeightedPriceCsv(changed);
  assert.equal(quantity.observed.units,recalculated.units);
  assert.equal(quantity.observed.revenue,recalculated.revenue);
  assert.equal(quantity.observed.displayedWeightedPrice,Number(recalculated.weightedPrice.toFixed(2)));
  assert.equal(quantity.observed.displayedSimplePriceMean,baseCalculated.simplePriceMean);
  const missing=baseCsv.replace('L-107,Store,5,0','L-107,Store,5,');
  assert.throws(()=>auditWeightedPriceCsv(missing),/blanks are not zero/);
  assert.match(invalid.observed.error,/Row 8: UnitPrice.*blanks are not zero/);
  assert.equal(invalid.outcome,'pass');
  const cases=parseClaimCases(claimCsv).filter(c=>PRACTICE_IDS.some(id=>id===c.id));
  const intended=scoreClaimCases(cases,claim.plannedAnswers);
  assert.equal(intended.answered,5);
  assert.equal(intended.matched,4);
  assert.equal(claim.observed.visibleScore,'1 of 5');
  assert.equal(claim.outcome,'inconclusive');
  assert(claim.limits.includes('browser run did not preserve verified pre-submit radio states'));
  assert.equal(smoke.id,'claim-incomplete-guard-postfix');
  assert.equal(smoke.outcome,'pass');
  assert.equal(smoke.observed.answeredBeforeSubmit,1);
  assert.equal(smoke.observed.gradingBlocked,true);
  assert.equal(smoke.observed.scoreShown,false);
  assert.equal(smoke.observed.feedbackShown,false);
  assert.match(smoke.observed.submitStatus,/Only 1 of 5 claims answered/);
  assert.equal(smoke.observed.uniqueAccessibleLabel,'G04: Supported by the notes');
  assert.equal(complete.id,'claim-five-answer-full-browser-verified');
  assert.equal(complete.outcome,'pass');
  assert.equal(complete.observed.reportedScore,'4 of 5');
  assert.equal(complete.observed.preSubmitStatus.startsWith('5 of 5 claims answered.'),true);
  assert.deepEqual(complete.observed.mismatchedCaseIds,['G04']);
  assert.deepEqual(complete.observed.matchedCaseIds,['G06','G09','R02','E06']);
  assert.deepEqual(complete.observed.checkedAnswers,claim.plannedAnswers);
  assert.equal(scoreClaimCases(cases,complete.observed.checkedAnswers).matched,4);
  assert(evidencePage.includes('/examples/firsthand-browser-qa-2026-11-01.json'));
  assert(article.includes('A real browser run on the published workbench'));
  assert(article.includes('not a claim that ChatGPT, Excel or Google Sheets was executed'));
});
