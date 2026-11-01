import { buildPrompt } from '../lib/tools';

const form = document.querySelector<HTMLFormElement>('#prompt-form')!;
const output = document.querySelector<HTMLTextAreaElement>('#prompt-output')!;
const status = document.querySelector<HTMLElement>('#prompt-status')!;
const copyStatus = document.querySelector<HTMLElement>('#copy-status')!;
const copy = document.querySelector<HTMLButtonElement>('#copy-prompt')!;
const download = document.querySelector<HTMLButtonElement>('#download-prompt')!;

// A generated prompt may be edited freely. If the source fields change after
// generation, retain the visitor's draft without allowing an outdated export.
let outputIsCurrent = false;
function updateExportActions() {
  const enabled = outputIsCurrent && !output.disabled && output.value.trim().length > 0;
  copy.disabled = !enabled;
  download.disabled = !enabled;
}

form.addEventListener('input', () => {
  if (!outputIsCurrent) return;
  outputIsCurrent = false;
  updateExportActions();
  status.textContent = 'Inputs changed. Your previous draft is kept below, but it is now out of date. Build again before copying or downloading.';
  copyStatus.textContent = '';
});

form.addEventListener('submit', event => {
  event.preventDefault();
  const values = new FormData(form);
  try {
    const generated = buildPrompt({
      goal: String(values.get('goal') ?? ''),
      context: String(values.get('context') ?? ''),
      audience: String(values.get('audience') ?? ''),
      constraints: String(values.get('constraints') ?? ''),
      format: String(values.get('format') ?? ''),
    });
    output.value = generated;
    output.disabled = false;
    outputIsCurrent = true;
    updateExportActions();
    status.textContent = 'Prompt ready. You can edit the generated draft before copying or downloading.';
    copyStatus.textContent = '';
  } catch (error) {
    outputIsCurrent = false;
    updateExportActions();
    status.textContent = (error instanceof Error ? error.message : 'Please check your inputs.') + ' Any earlier draft remains visible but cannot be exported until a successful rebuild.';
    document.querySelector<HTMLTextAreaElement>('#goal')?.focus();
  }
});

output.addEventListener('input', () => {
  updateExportActions();
  copyStatus.textContent = '';
  status.textContent = outputIsCurrent
    ? 'Edited draft ready. Check the final wording before copying or downloading.'
    : 'Your edited draft remains visible, but the source inputs changed. Build again before exporting.';
});

form.addEventListener('reset', () => {
  output.value = '';
  output.disabled = true;
  outputIsCurrent = false;
  updateExportActions();
  status.textContent = 'Inputs and prompt cleared.';
  copyStatus.textContent = '';
});

copy.addEventListener('click', async () => {
  if (!outputIsCurrent || !output.value.trim()) return;
  try {
    await navigator.clipboard.writeText(output.value);
    copyStatus.textContent = 'Your current edited draft was copied.';
  } catch {
    output.focus();
    output.select();
    copyStatus.textContent = 'Copy unavailable. Your current draft is selected; use your device’s copy command.';
  }
});

download.addEventListener('click', () => {
  if (!outputIsCurrent || !output.value.trim()) return;
  const url = URL.createObjectURL(new Blob([output.value], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'guidehollow-prompt.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  copyStatus.textContent = 'TXT download requested for your current edited draft.';
});

// The example never replaces the visitor's source fields or an edited draft.
document.querySelector<HTMLButtonElement>('#load-prompt-example')?.addEventListener('click', () => {
  const fields = ['goal', 'context', 'audience', 'constraints', 'format'] as const;
  if (fields.some(id => document.querySelector<HTMLInputElement | HTMLTextAreaElement>('#' + id)?.value.trim()) || output.value.trim()) {
    status.textContent = 'Your work was kept. Use Reset before loading the example.';
    return;
  }
  const example = {
    goal: 'Write a friendly community garden meeting invitation',
    context: 'Fictional approved notes: Saturday at 10 a.m. Bring a notebook. We will choose a planting schedule. The location has not been confirmed.',
    audience: 'Neighbors who have not attended before',
    constraints: 'Keep only confirmed facts. Do not invent a location or organizer. Mark the missing location [TO CONFIRM].',
    format: 'A friendly invitation under 70 words',
  };
  for (const id of fields) {
    const field = document.querySelector<HTMLInputElement | HTMLTextAreaElement>('#' + id);
    if (field) field.value = example[id];
  }
  outputIsCurrent = false;
  updateExportActions();
  status.textContent = 'Fictional example loaded. Select Build my prompt to see the result.';
  document.querySelector<HTMLTextAreaElement>('#goal')?.focus();
});

form.querySelector<HTMLFieldSetElement>('fieldset')!.disabled = false;
