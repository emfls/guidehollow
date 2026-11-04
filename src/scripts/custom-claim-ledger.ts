import { exportClaimLedger, importClaimLedgerTsv, makeLedgerEntry, replaceLedgerEntry, type LedgerEntry, type LedgerVerdict } from '../lib/claim-ledger';

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
const save = form?.querySelector<HTMLButtonElement>('#personal-ledger-save');
const cancel = form?.querySelector<HTMLButtonElement>('#personal-ledger-cancel-edit');
const importFile = document.querySelector<HTMLInputElement>('#personal-ledger-import-file');
const importButton = document.querySelector<HTMLButtonElement>('#personal-ledger-import');
let entries: LedgerEntry[] = [];
let nextId = 1;
let editingId: string | null = null;
let readingImport = false;
// A temporary draft is not part of the downloaded TSV until the visitor saves
// it as a row. Every action that would replace it must ask before proceeding.
function hasUnfinishedFormInput(): boolean {
  return [source,claim,passage,note].some(field => Boolean(field?.value.trim())) || Boolean(verdict?.value);
}
function hasReviewWork(): boolean {
  return entries.length > 0 || hasUnfinishedFormInput();
}
function stopEditing() {
  editingId = null;
  if (save) save.textContent = 'Add reviewed claim';
  if (cancel) cancel.disabled = true;
}

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
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Edit ' + entry.id;
    edit.setAttribute('aria-label', 'Edit reviewed claim ' + entry.id);
    edit.addEventListener('click', () => {
      if (!form || !source || !claim || !passage || !verdict || !note || !save || !cancel || !status) return;
      if (editingId !== entry.id && hasUnfinishedFormInput() &&
          !window.confirm('Opening '+entry.id+' will replace the unfinished review fields. Save the draft as a row first, or select OK to discard it.')) {
        status.textContent = 'Edit cancelled. Your unfinished fields and saved review rows are unchanged.';
        return;
      }
      source.value = entry.source;
      claim.value = entry.claim;
      passage.value = entry.passage;
      verdict.value = entry.verdict;
      note.value = entry.note;
      editingId = entry.id;
      save.textContent = 'Save revised claim ' + entry.id;
      cancel.disabled = false;
      status.textContent = 'Editing ' + entry.id + '. Save the changes or cancel editing; your existing row remains until you save.';
      source.focus();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove ' + entry.id;
    remove.setAttribute('aria-label', 'Remove reviewed claim ' + entry.id);
    remove.addEventListener('click', () => {
      if (!window.confirm('Remove '+entry.id+' from this browser session? Download your current TSV first if you need a copy.')) {
        if (status) status.textContent = 'Removal cancelled. '+entry.id+' and your unfinished fields are unchanged.';
        return;
      }
      entries = entries.filter(item => item.id !== entry.id);
      if (editingId === entry.id) {
        form?.reset();
        stopEditing();
      }
      refresh();
      if (status) status.textContent = entry.id + ' removed. ' + entries.length + ' review rows remain.';
    });
    li.append(heading,claimText,evidence,reason,edit,remove);
    return li;
  });
  records.replaceChildren(...items);
  download.disabled = entries.length === 0;
  // Clear must remain available to erase unfinished fields even before a row is added.
  clear.disabled = false;
}
if (form && fields && source && claim && passage && verdict && note && status && records && download && clear && save && cancel && importFile && importButton) {
  // With JavaScript disabled or failed, the form remains disabled and cannot
  // submit personal text via its default GET request.
  form.addEventListener('reset', () => {
    stopEditing();
    status.textContent = 'Current fields cleared; saved review rows are unchanged.';
  });
  cancel.addEventListener('click', () => {
    form.reset();
    status.textContent = 'Editing cancelled. Your original review row is unchanged.';
    source.focus();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      if (entries.length >= 30 && !editingId)
        throw new Error('You have reached the 30-row limit. Download or remove rows first.');
      const revised = Boolean(editingId);
      const ordinal = revised ? Number(editingId!.slice(1)) : nextId;
      const entry = makeLedgerEntry({
        source: source.value, claim: claim.value, passage: passage.value,
        verdict: verdict.value as LedgerVerdict, note: note.value,
      }, ordinal);
      entries = revised ? replaceLedgerEntry(entries, entry) : [...entries, entry];
      if (!revised) nextId++;
      form.reset();
      refresh();
      status.textContent = entry.id + (revised ? ' updated.' : ' added.') + ' ' +
        entries.length + ' human-reviewed claim(s) ready for export.';
      source.focus();
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'The entry could not be saved.';
    }
  });
  clear.addEventListener('click', () => {
    if ((entries.length > 0 || hasUnfinishedFormInput()) &&
        !window.confirm('Clear all '+entries.length+' saved review rows and unfinished fields? This cannot be undone in the page. Download your TSV first if you need to keep them.')) {
      status.textContent = 'Clear cancelled. Your review rows and unfinished fields are unchanged.';
      return;
    }
    entries = [];
    nextId = 1;
    form.reset();
    refresh();
    status.textContent = 'All rows and unfinished input fields cleared. Nothing was sent or saved online.';
  });
  download.addEventListener('click', () => {
    // Exporting the saved register must not look like saving an unfinished
    // Add/Edit form. Warn before issuing a file missing those unsaved changes.
    if (hasUnfinishedFormInput() && !window.confirm(
      'The TSV contains only saved review rows. Unsaved changes in the current form will NOT be included. Save this row first, or choose OK to download saved rows only.'
    )) {
      status.textContent = 'Download cancelled. Your unfinished form and saved review rows are unchanged.';
      return;
    }
    try {
      const text = exportClaimLedger(entries);
      const blob = new Blob([text], {type:'text/tab-separated-values;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'guidehollow-source-claim-ledger.tsv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = 'Download requested for ' + entries.length + ' human review rows. Check your browser downloads; this page cannot confirm the file was saved. This is not an AI truth score.';
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Export failed.';
    }
  });
  importFile.addEventListener('change', () => {
    importButton.disabled = readingImport || !importFile.files?.length;
  });
  importButton.addEventListener('click', async () => {
    // Prevent two pending reads from racing to overwrite the same register.
    if (readingImport) return;
    const selectedFile = importFile.files?.[0];
    if (!selectedFile) {
      status.textContent = 'Choose a previously downloaded GuideHollow TSV before importing.';
      return;
    }
    readingImport = true;
    importButton.disabled = true;
    try {
      if (selectedFile.size > 640000) throw new Error('The TSV file is too large for this local worksheet.');
      // File.text() reads a selected local file; it makes no server request.
      const tsv = await selectedFile.text();
      if (importFile.files?.[0] !== selectedFile) {
        status.textContent = 'File selection changed. Select Import again.';
        return;
      }
      const restored = importClaimLedgerTsv(tsv);
      // Parse/validate first and get explicit approval before replacing any work.
      const dirty = entries.length > 0 || hasUnfinishedFormInput();
      if (dirty && !window.confirm('Replace all current review rows and unfinished form input with the selected TSV? Download your current rows first if needed.')) {
        status.textContent = 'Import cancelled. Current review rows and input are unchanged.';
        return;
      }
      entries = restored;
      nextId = Math.max(...entries.map(entry => Number(entry.id.slice(1)))) + 1;
      form.reset();
      refresh();
      importFile.value = '';
      importButton.disabled = true;
      status.textContent = entries.length + ' reviewed claim(s) restored locally. Check the imported text and verdicts before continuing. No file was uploaded or saved online.';
      source.focus();
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'TSV import failed. Your existing reviews are unchanged.';
    } finally {
      readingImport = false;
      importButton.disabled = !importFile.files?.length;
    }
  });
  // A browser may display a native leave warning after a user gesture.
  // We cannot guarantee it (mobile browsers may suppress it), and we never
  // persist personal review text behind the visitor's back.
  window.addEventListener?.('beforeunload', event => {
    if (!hasReviewWork()) return;
    event.preventDefault();
    event.returnValue = '';
  });
  fields.disabled = false;
  // The file input is intentionally inert in HTML until this local-only
  // handler has been wired. Without this line every Import button remains
  // unreachable, even though its listener and parser are installed.
  importFile.disabled = false;
  importButton.disabled = true;
  refresh();
  status.textContent = 'Your entries stay on this device until you download or leave the page. No automatic verdicts.';
}
