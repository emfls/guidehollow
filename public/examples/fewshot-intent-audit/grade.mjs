// GuideHollow original teaching audit. Run locally with Node.js; no AI/API/network.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const LABELS = new Set(['REQUEST','IDEA','STATUS','UNCLEAR']);

export function readRows(text, header) {
  if (typeof text !== 'string' || text.length > 100000) throw new Error('TSV must be plain text under 100,000 characters.');
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n/g,'\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines.shift() !== header) throw new Error('Expected TSV header: ' + header);
  if (!lines.length) throw new Error('TSV must contain records.');
  const seen = new Set();
  return lines.map((line, index) => {
    const cells = line.split('\t');
    if (cells.length !== 2 || cells.some(cell => !cell)) throw new Error('Row ' + (index+2) + ' must contain exactly two nonempty cells.');
    const [id,value] = cells;
    if (!/^C\d{2}$/.test(id) || seen.has(id)) throw new Error('Invalid or repeated case ID at row ' + (index+2));
    seen.add(id);
    return {id,value};
  });
}

export function evaluate(blindText, keyText, outputText) {
  const blind = readRows(blindText,'CaseID\tFeedbackMessage');
  const key = readRows(keyText,'CaseID\tExpectedLabel\tReason');
  const outputs = readRows(outputText,'CaseID\tModelOutput');
  if (blind.length !== 12 || key.length !== 12 || outputs.length !== 12)
    throw new Error('The published exercise requires exactly 12 cases.');
  // The key has three columns, unlike the blind and submitted files.
  // Parse its rows separately; keep the expected labels undisclosed until grading.
}
