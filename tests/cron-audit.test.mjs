import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditCron, parseCronReference } from '../src/lib/cron-audit.ts';

const fixture = JSON.parse(readFileSync(new URL('../public/examples/cron-validator-suite/cron-validator-suite.json', import.meta.url)));
const fixtureCase = id => fixture.test_cases.find(item => item.id === id);
const audit = (expression, options = {}) => auditCron(expression, {
  reference: '2028-05-01T00:00:00Z',
  dayRule: 'posix',
  sunday: 'zero',
  timeZone: 'UTC',
  ...options,
});
const utcRuns = result => result.runs.map(run => run.utc);
const codes = result => result.warnings.map(warning => warning.code);

test('guide CRON-02 reproduces the union and shows where strict AND first differs', () => {
  const sample = fixtureCase('CRON-02');
  const options = { reference: sample.reference_time_utc };
  const union = audit(sample.ai_generated_expression, options);
  const intersection = audit(sample.ai_generated_expression, { ...options, dayRule: 'and' });
  assert.equal(union.runs.length, 10);
  assert.equal(intersection.runs.length, 10);
  assert.deepEqual(utcRuns(union).slice(0, 5), sample.checks[0].expected_utc);
  assert.deepEqual(utcRuns(intersection).slice(0, 2), sample.checks[2].expected_utc);
  assert.match(union.warnings.find(item => item.code === 'day-rule').message, /2028-05-08T09:00:00Z/);
  assert.equal(new Set(utcRuns(union)).size, 10);
});

test('POSIX combines month and date before OR; a wildcard day leaves the other restriction in force', () => {
  const expression = '0 9 1,15 5 1';
  assert.equal(audit(expression, { reference: '2028-05-29T10:00:00Z' }).runs[0].utc, '2028-06-05T09:00:00Z');
  assert.equal(audit(expression, { dayRule: 'and' }).runs[2].utc, '2034-05-01T09:00:00Z');
  assert.equal(audit('0 9 * * 1', { dayRule: 'and' }).runs[0].utc, '2028-05-01T09:00:00Z');
  assert.equal(audit('0 9 15 * *').runs[0].utc, '2028-05-15T09:00:00Z');
  assert(codes(audit('0 9 * 5 1')).includes('day-rule'));
});

test('guide CRON-01 accepts Sunday 7 only in alias mode, and shows UTC and local clock results', () => {
  const sample = fixtureCase('CRON-01');
  const options = { reference: sample.reference_time_utc, timeZone: sample.timezone };
  assert.throws(() => audit(sample.ai_generated_expression, options), /Sunday.*0/);
  const result = audit(sample.ai_generated_expression, { ...options, sunday: 'zero-or-seven' });
  assert.deepEqual(result.runs[0], { utc: sample.expected_next_timestamp_iso, local: sample.expected_local_timestamp_iso });
  assert(codes(result).includes('sunday-alias'));
  assert.match(result.warnings.find(item => item.code === 'utc-comparison').message, /2026-11-29T04:00:00Z/);
  assert.deepEqual(utcRuns(result), utcRuns(audit(sample.corrected_schedule, options)));
  assert.deepEqual(utcRuns(audit('0 4 * * 0,7', { ...options, sunday: 'zero-or-seven' })), utcRuns(result));
  assert.deepEqual(utcRuns(audit('0 4 * * 7', { ...options, sunday: 'zero-or-seven', timeZone: 'UTC' })).slice(0, 1),
    [sample.expected_next_in_comparison_timezone_utc]);
});

test('guide CRON-03 preserves inclusive ranges and steps, with a POSIX portability warning', () => {
  const sample = fixtureCase('CRON-03');
  const options = { reference: sample.reference_time_utc };
  const result = audit(sample.corrected_schedule, options);
  assert.deepEqual(utcRuns(result).slice(0, 5), sample.checks[2].expected_utc);
  assert.deepEqual(utcRuns(result), utcRuns(audit(sample.posix_equivalent, options)));
  assert(codes(result).includes('step-syntax'));
  assert.deepEqual(utcRuns(audit(sample.ai_generated_expression, options)).slice(0, 2), sample.checks[0].expected_utc);
  assert.deepEqual(utcRuns(audit('1-5/2,5 0 * * *')).slice(0, 3),
    ['2028-05-01T00:01:00Z', '2028-05-01T00:03:00Z', '2028-05-01T00:05:00Z']);
});

test('spring gap is skipped and fall fold reports both instants with distinct offsets', () => {
  const timeZone = 'America/New_York';
  const spring = audit('30 2 * * *', { timeZone, reference: '2027-03-13T00:00:00Z' });
  assert.deepEqual(spring.runs.slice(0, 2), [
    { utc: '2027-03-13T07:30:00Z', local: '2027-03-13T02:30:00-05:00' },
    { utc: '2027-03-15T06:30:00Z', local: '2027-03-15T02:30:00-04:00' },
  ]);
  const fall = audit('30 1 * * *', { timeZone, reference: '2027-11-07T05:29:00Z' });
  assert.deepEqual(fall.runs.slice(0, 2), [
    { utc: '2027-11-07T05:30:00Z', local: '2027-11-07T01:30:00-04:00' },
    { utc: '2027-11-07T06:30:00Z', local: '2027-11-07T01:30:00-05:00' },
  ]);
  assert(codes(fall).includes('offset-change'));
});

test('half-hour DST folds and fractional offsets keep UTC ordering and local date matching', () => {
  const fold = audit('45 1 * * *', { timeZone: 'Australia/Lord_Howe', reference: '2027-04-03T14:00:00Z' });
  assert.deepEqual(fold.runs.slice(0, 2), [
    { utc: '2027-04-03T14:45:00Z', local: '2027-04-04T01:45:00+11:00' },
    { utc: '2027-04-03T15:15:00Z', local: '2027-04-04T01:45:00+10:30' },
  ]);
  const monday = audit('0 0 * * 1', { timeZone: 'Asia/Kathmandu', reference: '2028-04-30T00:00:00Z' });
  assert.deepEqual(monday.runs[0], { utc: '2028-04-30T18:15:00Z', local: '2028-05-01T00:00:00+05:45' });
});

test('the reference is exclusive and complete, sparse and impossible dates report honestly', () => {
  assert.equal(audit('* * * * *', { reference: '2028-05-01T00:00:30Z' }).runs[0].utc, '2028-05-01T00:01:00Z');
  assert.equal(parseCronReference('2028-02-29T00:00Z').toISOString(), '2028-02-29T00:00:00.000Z');
  assert.throws(() => parseCronReference('2027-02-29T00:00Z'), /calendar/);
  assert.throws(() => parseCronReference('2028-02-29 00:00'), /UTC/);
  const leap = audit('0 0 29 2 *', { reference: '2028-02-29T00:00:00Z' });
  assert.equal(leap.runs.length, 10);
  assert.equal(leap.runs[0].utc, '2032-02-29T00:00:00Z');
  const impossible = audit('0 0 31 2 *', { timeZone: 'America/New_York' });
  assert.equal(impossible.runs.length, 0);
  assert(codes(impossible).includes('search-limit'));
  const sparse = audit('0 0 29 2 1', { dayRule: 'and' });
  assert(sparse.runs.length > 0 && sparse.runs.length < 10);
  assert(codes(sparse).includes('search-limit'));
});

test('rejects invalid field counts, scheduler-specific tokens and malformed numeric sets', () => {
  for (const invalid of ['* * * *', fixtureCase('CRON-05').ai_generated_expression, 'cron(0 0 L * ? *)', '@daily']) {
    assert.throws(() => audit(invalid), /five fields/);
  }
  for (const invalid of [fixtureCase('CRON-04').ai_generated_expression, '0 0 * * MON', '0 0 * * ?', '0 0 * * 5#2',
    '60 0 * * *', '0 24 * * *', '0 0 0 * *', '0 0 * 13 *', '0 0 * * 8',
    '*/0 * * * *', '*/-2 * * * *', '2/3 * * * *', '5-2 * * * *', '5, * * * *', '*,1 * * * *']) {
    assert.throws(() => audit(invalid), /field|step/i, invalid);
  }
  assert.throws(() => audit('0 0 * * *', { timeZone: 'Mars/Olympus' }), /time zone/);
});
