#!/usr/bin/env node
// Original teaching tool: section-ID text comparison only, not a legal or product test.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function parseSections(text, name = 'document') {
  if (typeof text !== 'string') throw new TypeError(name + ' must be text');
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n');
  const final = lines.findLastIndex(line => line.trim().length > 0);
  if (final < 0) throw new Error(name + ': the document is empty');
  const sections = new Map();
  for (let i = 0; i <= final; i++) {
    const line = lines[i];
    if (!line.trim()) throw new Error(name + ': blank interior record on line ' + (i + 1));
    const match = /^(S[1-9]\d*) \| ([^|]+) \| (.+)$/.exec(line);
    if (!match || !match[2].trim() || !match[3].trim())
      throw new Error(name + ': invalid ID | title | text record on line ' + (i + 1));
    const [, id, title, content] = match;
    if (sections.has(id)) throw new Error(name + ': duplicate section ID ' + id);
    sections.set(id, { id, title: title.trim(), content: content.trim() });
  }
  return sections;
}

export function compareSections(oldText, newText) {
  const oldSections = parseSections(oldText, 'OLD');
  const newSections = parseSections(newText, 'NEW');
  const ids = [...new Set([...oldSections.keys(), ...newSections.keys()])]
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  const counts = { MODIFIED: 0, REMOVED_FROM_TEXT: 0, ADDED: 0, UNCHANGED: 0 };
  const rows = ids.map(id => {
    const before = oldSections.get(id), after = newSections.get(id);
    const kind = !before ? 'ADDED' : !after ? 'REMOVED_FROM_TEXT'
      : before.title === after.title && before.content === after.content ? 'UNCHANGED' : 'MODIFIED';
    counts[kind]++;
    return { id, kind, old: before?.content ?? '', current: after?.content ?? '' };
  });
  return { rows, counts, oldCount: oldSections.size, newCount: newSections.size };
}

function main(args) {
  if (args.length !== 2) {
    console.error('Usage: node section-diff.mjs OLD-v1.txt NEW-v2.txt');
    process.exitCode = 2;
    return;
  }
  try {
    const [oldText, newText] = args.map(path => readFileSync(path, 'utf8'));
    const result = compareSections(oldText, newText);
    console.log('OLD=' + result.oldCount + ' NEW=' + result.newCount + ' UNIQUE=' + result.rows.length);
    console.log(Object.entries(result.counts).map(([key, value]) => key + '=' + value).join(' '));
    for (const row of result.rows) console.log(row.id + '\t' + row.kind);
    console.log('Review the original approval record before interpreting any change.');
  } catch (error) {
    console.error('Comparison stopped: ' + error.message);
    process.exitCode = 1;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
