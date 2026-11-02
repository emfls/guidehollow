import { exportClaimLedger, makeLedgerEntry, type LedgerEntry, type LedgerVerdict } from '../lib/claim-ledger';

const form = document.querySelector<HTMLFormElement>('#personal-claim-form');
const fields = form?.querySelector<HTMLFieldSetElement>('fieldset');
const source = form?.querySelector<HTMLInputElement>('#personal-source');
const claim = form?.querySelector<HTMLTextAreaElement>('#personal-claim');
const passage = form?.querySelector<HTMLTextAreaElement>('#personal-passage');
const verdict = form?.querySelector<HTMLSelectElement>('#personal-verdict');
const note = form?.querySelector<HTMLTextAreaElement>('#personal-note');
const status = document.querySelector<HTMLElement>('#personal-ledger-status');
const records = document.querySelector<HTMLOListElement>('#personal-ledger-entries');
const download = document.querySelector<HTMLButtonElement>('#personal-ledger-download');
const clear = document.querySelector<HTMLButtonElement>('#personal-ledger-clear');
let entries: LedgerEntry[] = [];
let nextId = 1;

function refresh() {
  if (!records || !download || !clear) return;
  const items = entries.map(entry => {
    const li = document.createElement('li');
    li.className = 'personal-ledger-record';
    const heading = document.createElement('strong');
    heading.textContent = entry.id + ' · ' + entry.verdict;
    const claimText = document.createElement('p');
    claimText.textContent = entry.claim;
    const evidence = document.createElement('p');
    evidence.className = 'small muted';
    evidence.textContent = 'Source: ' + entry.source + (entry.passage ? ' · Passage: ' + entry.passage : ' · No exact passage supplied');
    const reason = document.createElement('p');
    reason.className = 'small';
    reason.textContent = 'Reviewer note: ' + entry.note;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove ' + entry.id;
    remove.setAttribute('aria-label', 'Remove reviewed claim ' + entry.id);
    remove.addEventListener('click', () => {
      entries = entries.filter(item => item.id !== entry.id);
      refresh();
      if (status) status.textContent = entry.id + ' removed. ' + entries.length + ' review rows remain.';
    });
    li.append(heading,claimText,evidence,reason,remove);
    return li;
  });
  records.replaceChildren(...items);
  download.disabled = clear.disabled = entries.length === 0;
}
if (form && fields && source && claim && passage && verdict && note && status && records && download && clear) {
  // With JavaScript disabled or failed, the form remains disabled and cannot
  // submit personal text via its default GET request.
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      if (entries.length >= 30) throw new Error('You have reached the 30-row limit. Download or remove rows first.');
      const entry = makeLedgerEntry({
        source: source.value, claim: claim.value, passage: passage.value,
        verdict: verdict.value as LedgerVerdict, note: note.value,
      }, nextId);
      entries = [...entries, entry];
      nextId++;
      form.reset();
      refresh();
      status.textContent = entry.id + ' added. ' + entries.length + ' human-reviewed claim(s) ready for export.';
      source.focus();
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'The entry could not be added.';
    }
  });
  clear.addEventListener('click', () => {
    entries = [];
    refresh();
    status.textContent = 'All review rows cleared. Nothing was sent or saved online.';
  });
  download.addEventListener('click', () => {
    try {
      const text = exportClaimLedger(entries);
      const blob = new Blob([text], {type:'text/tab-separated-values;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'guidehollow-source-claim-ledger.tsv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = entries.length + ' human review rows exported as TSV. This is not an AI truth score.';
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Export failed.';
    }
  });
  fields.disabled = false;
  refresh();
  status.textContent = 'Your entries stay on this device until you download or leave the page. No automatic verdicts.';
}
