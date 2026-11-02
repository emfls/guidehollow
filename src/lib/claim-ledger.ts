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
