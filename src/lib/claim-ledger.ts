/**
 * Human-reviewed claim ledger. No AI verdicts, network calls or hidden storage.
 * All cells are kept as text when exporting to a spreadsheet-compatible TSV.
 */
export const LEDGER_VERDICTS = ['SUPPORTED','CONTRADICTED','UNSUPPORTED'] as const;
export type LedgerVerdict = typeof LEDGER_VERDICTS[number];
export interface LedgerInput {
  source: string;
  claim: string;
  passage: string;
  verdict: LedgerVerdict;
  note: string;
}
export interface LedgerEntry extends LedgerInput { id: string }

export function makeLedgerEntry(input: LedgerInput, ordinal: number): LedgerEntry {
  if (!Number.isSafeInteger(ordinal) || ordinal < 1 || ordinal > 9999) throw new Error('Invalid row number.');
  const source = input.source.trim(), claim = input.claim.trim(), passage = input.passage.trim(), note = input.note.trim();
  if (!source || !claim || !note) throw new Error('Enter a source label, the exact claim and your review reason.');
  if (!LEDGER_VERDICTS.includes(input.verdict)) throw new Error('Choose a valid review verdict.');
  if (input.verdict !== 'UNSUPPORTED' && !passage) {
    throw new Error('Supported or contradicted claims need an exact source passage.');
  }
  if (source.length > 500 || claim.length > 2000 || passage.length > 3000 || note.length > 3000) {
    throw new Error('A field exceeds the local worksheet size limit.');
  }
  return {id:'R'+String(ordinal).padStart(3,'0'),source,claim,passage,verdict:input.verdict,note};
}
export function replaceLedgerEntry(entries: LedgerEntry[], revised: LedgerEntry): LedgerEntry[] {
  const at = entries.findIndex(item => item.id === revised.id);
  if (at === -1) throw new Error('The review row no longer exists.');
  if (entries.some((item,index) => index !== at && item.id === revised.id))
    throw new Error('Duplicate review IDs are not allowed.');
  return entries.map((item,index) => index === at ? revised : item);
}
function safeTsvCell(input: string): string {
  // Escape delimiters and line breaks before constructing rows; never let a
  // user-supplied tab or newline create an extra record or column.
  const value = input.replace(/\\/g,'\\\\').replace(/\r\n?/g,'\n').replace(/[\t\n\u2028\u2029]/g, char => char === '\t' ? '\\t' : '\\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();
  // Some spreadsheets evaluate formulas in imported cells. Treat all fields
  // as untrusted text, including quoted/whitespace-prefixed formula strings.
  return /^[\s"']*[=+\-@]/.test(value) ? "'" + value : value;
}
export function exportClaimLedger(entries: LedgerEntry[]): string {
  if (entries.length === 0) throw new Error('Add at least one reviewed claim before downloading.');
  if (entries.length > 30) throw new Error('The worksheet supports up to 30 claims.');
  const fields = ['ReviewID','SourceLabel','Claim','ExactSourcePassage','HumanVerdict','ReviewReason'];
  const rows = entries.map(entry => {
    if (!LEDGER_VERDICTS.includes(entry.verdict)) throw new Error('Invalid review verdict.');
    return [entry.id,entry.source,entry.claim,entry.passage,entry.verdict,entry.note].map(safeTsvCell).join('\t');
  });
  return '\uFEFF' + [fields.join('\t'), ...rows].join('\r\n') + '\r\n';
}


/** Read only this tool's own six-column TSV export. No network or persistent storage. */
export function importClaimLedgerTsv(input: string): LedgerEntry[] {
  if (!input.trim()) throw new Error('Choose a nonempty GuideHollow claim-ledger TSV file.');
  if (input.length > 320000) throw new Error('The TSV file exceeds the 320,000-character safety limit.');
  const normalized = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (normalized.includes('\r')) throw new Error('Unexpected line ending in TSV.');
  const lines = normalized.split('\n');
  if (lines.at(-1) === '') lines.pop();
  const header = 'ReviewID\tSourceLabel\tClaim\tExactSourcePassage\tHumanVerdict\tReviewReason';
  if (lines[0] !== header) throw new Error('Not a GuideHollow claim-ledger export: six-column header is missing.');
  if (lines.length < 2) throw new Error('The TSV has no reviewed claims.');
  if (lines.length > 31) throw new Error('The worksheet supports up to 30 claims.');
  const seen = new Set<string>();
  const decodeCell = (value: string): string => {
    // A formula-looking field is prefixed by one apostrophe during export.
    // Remove only that guard. If the original text started with an apostrophe
    // it is accurately restored because export prepended a separate one.
    const safe = /^'[\s"']*[=+\-@]/.test(value) ? value.slice(1) : value;
    let result = '';
    for (let i = 0; i < safe.length; i++) {
      if (safe[i] !== '\\') { result += safe[i]; continue; }
      const next = safe[++i];
      if (next === '\\') result += '\\';
      else if (next === 'n') result += '\n';
      else if (next === 't') result += '\t';
      else throw new Error('TSV has an unsupported escape; use the original GuideHollow download.');
    }
    return result;
  };
  return lines.slice(1).map((line,index) => {
    const rowNumber = index + 2;
    const cells = line.split('\t');
    if (cells.length !== 6) throw new Error('TSV row '+rowNumber+' must contain exactly six columns.');
    const [id,source,claim,passage,verdict,note] = cells;
    if (!/^R(?:\d{3}|\d{4})$/.test(id) || id === 'R000' || id === 'R0000') {
      throw new Error('TSV row '+rowNumber+' has an invalid review ID.');
    }
    if (seen.has(id)) throw new Error('TSV row '+rowNumber+' duplicates review ID '+id+'.');
    seen.add(id);
    const ordinal = Number(id.slice(1));
    const entry = makeLedgerEntry({
      source:decodeCell(source),claim:decodeCell(claim),
      passage:decodeCell(passage),verdict:verdict as LedgerVerdict,note:decodeCell(note),
    },ordinal);
    if (entry.id !== id) throw new Error('TSV row '+rowNumber+' has a noncanonical review ID.');
    return entry;
  });
}
