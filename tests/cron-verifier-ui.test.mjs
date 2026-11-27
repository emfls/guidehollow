import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { auditCron } from '../src/lib/cron-audit.ts';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('src/pages/tools/cron-schedule-verifier.astro');
const guide = read('src/content/articles/verify-ai-cron-schedule-expressions-day-of-week.md');
const fixture = JSON.parse(read('public/examples/cron-validator-suite/cron-validator-suite.json'));
const source = page.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const script = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function startPage() {
  const elements = new Map([...page.matchAll(/id="(cron-[^"]+)"/g)].map(([, id]) => {
    const listeners = new Map();
    return [id, {
      listeners,
      children: [],
      addEventListener(event, handler) { listeners.set(event, handler); },
      append(child) { this.children.push(child); },
      replaceChildren() { this.children = []; },
    }];
  }));
  const element = id => elements.get('cron-' + id);
  element('runs').insertRow = function () {
    const cells = [];
    this.children.push(cells);
    return { insertCell() { const cell = {}; cells.push(cell); return cell; } };
  };
  element('controls').disabled = true;
  element('zone-mode').value = 'utc';
  Object.assign(element('day-rule'), { value: 'posix', selectedOptions: [{ text: 'POSIX OR' }] });
  runInNewContext(script, {
    Error,
    exports: {},
    require: name => {
      assert.equal(name, '../../lib/cron-audit');
      return { auditCron };
    },
    document: { querySelector: selector => elements.get(selector.slice(1)), createElement: () => ({}) },
  });
  return {
    element,
    loadPreset(data) {
      element('preset').selectedOptions = [{ dataset: data }];
      element('load').listeners.get('click')();
    },
    edit(id, value) {
      const target = element(id);
      target.value = value;
      element('audit-form').listeners.get('input')({ target });
    },
    submit() {
      let prevented = false;
      element('audit-form').listeners.get('submit')({ preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
    },
    rows: () => element('runs').children.map(row => row.map(cell => cell.textContent)),
  };
}

test('the client loads the New York case and invalidates results and warnings on every schedule edit', () => {
  const ui = startPage();
  const sample = fixture.test_cases.find(item => item.id === 'CRON-01');
  assert.equal(ui.element('controls').disabled, false);
  ui.loadPreset({
    expression: sample.ai_generated_expression,
    reference: sample.reference_time_utc,
    sunday: 'zero-or-seven',
    zone: sample.timezone,
  });
  assert.equal(ui.element('zone-mode').value, 'named');
  assert.equal(ui.element('zone-label').hidden, false);
  ui.submit();
  assert.equal(ui.rows().length, 10);
  assert.deepEqual(ui.rows()[0], ['1', sample.expected_next_timestamp_iso, sample.expected_local_timestamp_iso]);
  assert.match(ui.element('warnings').children[0].textContent, /maps 7 to Sunday/);

  ui.edit('sunday', 'zero');
  assert.equal(ui.element('table-region').hidden, true);
  assert.deepEqual(ui.rows(), []);
  assert.equal(ui.element('warnings').children.length, 0);
  ui.submit();
  assert.match(ui.element('status').textContent, /Select the 0 or 7 mode/);
  assert.deepEqual(ui.rows(), []);

  ui.edit('expression', sample.corrected_schedule);
  ui.edit('zone-mode', 'utc');
  assert.equal(ui.element('zone').disabled, true);
  ui.submit();
  assert.deepEqual(ui.rows()[0], ['1', sample.expected_next_in_comparison_timezone_utc, sample.expected_next_in_comparison_timezone_utc]);
});

test('the static page has reciprocal guide links, original preset values and an inert no-JS form', () => {
  assert.match(page, /<fieldset id="cron-controls" disabled>/);
  assert.match(page, /<noscript>.*href="#cron-reference-results"/);
  assert.doesNotMatch(page, /<(?:input|select)\b[^>]*\bname=/);
  assert.match(page, /\/guides\/verify-ai-cron-schedule-expressions-day-of-week\//);
  assert.match(guide, /\]\(\/tools\/cron-schedule-verifier\/\)/);
  for (const item of fixture.test_cases.slice(0, 3)) {
    const expression = item.id === 'CRON-03' ? item.corrected_schedule : item.ai_generated_expression;
    assert(page.includes(`expression: '${expression}', reference: '${item.reference_time_utc}'`));
  }
});
