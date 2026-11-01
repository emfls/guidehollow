// Original educational fixture auditor. Node.js built-ins only.
// This is NOT a general JSON Schema validator and does not certify real-world facts.
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const schema = JSON.parse(read('ticket-schema.json'));
const reference = JSON.parse(read('reference.json'));
const candidates = JSON.parse(read('candidate-outputs.json'));
const answers = read('answer-key.tsv').trimEnd().split(/\r?\n/).slice(1)
  .map(line => line.split('\t'));
const expected = new Map(answers.map(row => [row[0], row[1]]));

// Implement only the declared keywords used in this particular downloadable
// schema. For arbitrary production schemas use a compatible full validator.
function hasType(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  return typeof value === type;
}
function structureError(value, rules, path = '$') {
  const types = rules.type ? [].concat(rules.type) : [];
  if (types.length && !types.some(type => hasType(value, type))) return path + ': wrong type';
  if (Array.isArray(value)) {
    if (rules.minItems !== undefined && value.length < rules.minItems) return path + ': too few items';
    if (rules.maxItems !== undefined && value.length > rules.maxItems) return path + ': too many items';
    if (rules.items) for (let i = 0; i < value.length; i++) {
      const error = structureError(value[i], rules.items, path + '[' + i + ']');
      if (error) return error;
    }
  } else if (value !== null && typeof value === 'object') {
    for (const key of rules.required ?? []) if (!Object.hasOwn(value, key)) return path + ': missing ' + key;
    for (const [key, field] of Object.entries(value)) {
      const child = rules.properties?.[key];
      if (!child) {
        if (rules.additionalProperties === false) return path + ': unexpected ' + key;
        continue;
      }
      const error = structureError(field, child, path + '.' + key);
      if (error) return error;
    }
  }
  return null;
}
function sourceError(candidate) {
  // This exercise fixes the short "problem" strings in reference.json.
  // A different truthful paraphrase could be acceptable in real extraction.
  for (let i = 0; i < reference.records.length; i++) {
    const expected = reference.records[i];
    const actual = candidate.records[i];
    for (const key of ['id', 'problem', 'error_code', 'resolved']) {
      if (actual[key] !== expected[key]) return 'record ' + (i + 1) + ': ' + key + ' differs from reference';
    }
  }
  return null;
}
export function classify(candidateText) {
  let value;
  try { value = JSON.parse(candidateText); }
  catch { return 'SYNTAX'; }
  if (structureError(value, schema)) return 'STRUCTURE';
  if (sourceError(value)) return 'SOURCE';
  return 'PASS';
}

const counts = { PASS: 0, SYNTAX: 0, STRUCTURE: 0, SOURCE: 0 };
let mismatches = 0;
for (const candidate of candidates) {
  const actual = classify(candidate.candidate);
  const expectedStatus = expected.get(candidate.id);
  if (!expectedStatus || actual !== expectedStatus) mismatches++;
  counts[actual]++;
  process.stdout.write(candidate.id + ' ' + actual + (actual === expectedStatus ? '' : ' (answer-key mismatch)') + '\n');
}
process.stdout.write('Exercise totals: ' + JSON.stringify(counts) + '\n');
process.stdout.write('Checks: JSON syntax; restricted structural schema subset; exact fictional two-ticket reference.\n');
process.stdout.write('No live AI model or real customer data were tested.\n');
if (candidates.length !== answers.length || mismatches) process.exitCode = 1;
