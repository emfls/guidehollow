import { buildPrompt } from '../lib/tools';
const form = document.querySelector<HTMLFormElement>('#prompt-form')!;
const output = document.querySelector<HTMLTextAreaElement>('#prompt-output')!;
const status = document.querySelector<HTMLElement>('#prompt-status')!;
const copyStatus = document.querySelector<HTMLElement>('#copy-status')!;
const copy = document.querySelector<HTMLButtonElement>('#copy-prompt')!;
const download = document.querySelector<HTMLButtonElement>('#download-prompt')!;
form.addEventListener('submit', event => {
  event.preventDefault(); const values = new FormData(form);
  try { output.value = buildPrompt({goal:String(values.get('goal') ?? ''), context:String(values.get('context') ?? ''), audience:String(values.get('audience') ?? ''), constraints:String(values.get('constraints') ?? ''), format:String(values.get('format') ?? '')}); copy.disabled = download.disabled = false; status.textContent = 'Prompt ready. Review it on the right or below.'; copyStatus.textContent = ''; }
  catch (error) { status.textContent = error instanceof Error ? error.message : 'Please check your inputs.'; document.querySelector<HTMLTextAreaElement>('#goal')?.focus(); }
});
form.addEventListener('reset', () => { output.value = ''; status.textContent = 'Inputs and prompt cleared.'; copyStatus.textContent = ''; copy.disabled = download.disabled = true; });
copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(output.value); copyStatus.textContent = 'Prompt copied.'; } catch { output.focus(); output.select(); copyStatus.textContent = 'Copy unavailable. Your prompt is selected; use your device’s copy command.'; } });
download.addEventListener('click', () => { const url = URL.createObjectURL(new Blob([output.value], {type:'text/plain;charset=utf-8'})); const link = document.createElement('a'); link.href = url; link.download = 'guidehollow-prompt.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); copyStatus.textContent = 'TXT download requested.'; });
// Example data is fictional and only loads into an empty form; never replace a visitor's work.
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
  copy.disabled = download.disabled = true;
  status.textContent = 'Fictional example loaded. Select Build my prompt to see the result.';
  document.querySelector<HTMLTextAreaElement>('#goal')?.focus();
});
form.querySelector<HTMLFieldSetElement>('fieldset')!.disabled = false;
