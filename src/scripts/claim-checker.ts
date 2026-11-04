import { parseClaimCases, scoreClaimCases, VERDICTS, PRACTICE_IDS, type ClaimVerdict, type ClaimCase } from '../lib/claim-audit';

const form = document.querySelector<HTMLFormElement>('#claim-audit-form');
const questions = document.querySelector<HTMLElement>('#claim-audit-questions');
const status = document.querySelector<HTMLElement>('#claim-audit-status');
const feedback = document.querySelector<HTMLElement>('#claim-audit-results');
const sourcePanel = document.querySelector<HTMLElement>('#claim-source-notes');
const choice = document.querySelector<HTMLSelectElement>('#claim-audit-length');
const submit = document.querySelector<HTMLButtonElement>('#claim-audit-submit');
const reset = document.querySelector<HTMLButtonElement>('#claim-audit-reset');
let allCases: ClaimCase[] = [];
// One ephemeral set of answers per case ID. Switching between the five-case
// practice set and all 22 must not silently discard work already selected.
const savedAnswers = new Map<string, ClaimVerdict>();
const labelByScenario = {GARDEN:'Community garden notes',RELEASE:'Software release notes',EVENT:'Proposed event notes'};
const readable = {SUPPORTED:'Supported by the notes',CONTRADICTED:'Contradicted by the notes',UNSUPPORTED:'Not established by the notes'};

function makeQuestion(item: ClaimCase): HTMLElement {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'claim-audit-question';
  const legend = document.createElement('legend');
  legend.textContent = item.id + ' · ' + labelByScenario[item.scenario];
  fieldset.append(legend);
  const claim = document.createElement('p');
  claim.textContent = item.claim;
  fieldset.append(claim);
  const answers = document.createElement('div');
  answers.className = 'claim-audit-choices';
  for (const verdict of VERDICTS) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = item.id;
    input.id = 'answer-' + item.id + '-' + verdict.toLowerCase();
    input.value = verdict;
    input.checked = savedAnswers.get(item.id) === verdict;
    input.setAttribute('aria-label', item.id + ': ' + readable[verdict]);
    label.htmlFor = input.id;
    label.append(input, document.createTextNode(' ' + readable[verdict]));
    answers.append(label);
  }
  fieldset.append(answers);
  return fieldset;
}
function rememberVisibleAnswers(): void {
  // The old question elements still exist when a selection-change handler
  // fires. Capture them before the questions are replaced with the new set.
  for (const input of questions?.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked') ?? []) {
    if (VERDICTS.includes(input.value as ClaimVerdict)) savedAnswers.set(input.name, input.value as ClaimVerdict);
  }
}
function selected(): ClaimCase[] {
  return choice?.value === 'all' ? allCases : allCases.filter(item => PRACTICE_IDS.some(id => id === item.id));
}
function updateSelectionCount() {
  if (!form || !status) return;
  // A changed selection invalidates the previous score and its explanations.
  // Never leave old feedback visible for answers the visitor has just edited.
  feedback?.replaceChildren();
  const answered = selected().filter(item => new FormData(form).has(item.id)).length;
  const total = selected().length;
  status.textContent = answered + ' of ' + total + ' claims answered. ' +
    (answered === total ? 'All choices are selected; you can now check your answers.' : 'Read the source and select one verdict for each claim before grading.');
}
function render(preserveVisible = true) {
  if (!questions || !feedback || !status) return;
  if (preserveVisible) rememberVisibleAnswers();
  const rows = selected();
  questions.replaceChildren(...rows.map(makeQuestion));
  feedback.replaceChildren();
  updateSelectionCount();
}
function evaluate(event: SubmitEvent) {
  event.preventDefault();
  if (!form || !feedback || !status) return;
  const rows = selected();
  const data = new FormData(form);
  const answers: Record<string, ClaimVerdict | ''> = {};
  for (const item of rows) {
    const value = String(data.get(item.id) ?? '');
    answers[item.id] = VERDICTS.includes(value as ClaimVerdict) ? value as ClaimVerdict : '';
  }
  const result = scoreClaimCases(rows, answers);
  if (result.answered !== result.total) {
    feedback.replaceChildren();
    status.textContent = 'Only ' + result.answered + ' of ' + result.total + ' claims answered. Select a verdict for every claim before grading.';
    const firstMissing = rows.find(item => !answers[item.id]);
    if (firstMissing) questions?.querySelector<HTMLInputElement>('input[name="' + firstMissing.id + '"]')?.focus();
    return;
  }
  const heading = document.createElement('h3');
  heading.textContent = 'Your source-reading check: ' + result.matched + ' of ' + result.total + ' match the editorial reference.';
  const note = document.createElement('p');
  note.textContent = result.answered + ' answered. These are your comparisons with an editor-written answer key—not measured AI accuracy.';
  const list = document.createElement('ol');
  for (const item of result.results) {
    const li = document.createElement('li');
    const verdict = item.chosen ? readable[item.chosen as ClaimVerdict] : 'Not answered';
    const resultText = item.matches ? 'Matched.' : 'Check again.';
    li.textContent = item.id + ': ' + resultText + ' Your answer: ' + verdict + '. Reference: ' + readable[item.expected] + '. Reason: ' + item.reason;
    list.append(li);
  }
  feedback.replaceChildren(heading, note, list);
  status.textContent = result.matched + '/' + result.total + ' labels matched the published teaching key. Review the explanation for every mismatch.';
  feedback.scrollIntoView({behavior:'smooth',block:'start'});
}
async function init() {
  if (!form || !questions || !status || !feedback || !choice || !submit || !reset || !sourcePanel) return;
  try {
    // The source notes are already rendered into HTML from the original public
    // file during the static build. Only the grading cases require a fetch.
    // Never replace readable original notes with a loading placeholder or error.
    const rowsResponse = await fetch('/examples/claim-boundary-audit.csv',{cache:'no-cache'});
    if (!rowsResponse.ok) throw new Error('The public answer-key CSV could not be loaded.');
    allCases = parseClaimCases(await rowsResponse.text());
    submit.disabled = false;
    reset.disabled = false;
    choice.disabled = false;
    choice.addEventListener('change', () => render());
    form.addEventListener('change', () => {
      rememberVisibleAnswers();
      updateSelectionCount();
    });
    form.addEventListener('submit', evaluate);
    reset.addEventListener('click', () => {
      rememberVisibleAnswers();
      if (savedAnswers.size > 0 && !window.confirm(
        'Clear all ' + savedAnswers.size + ' selected answer(s), including those in the other practice set? This cannot be undone in the current tab.'
      )) {
        status.textContent = 'Reset cancelled. Your selected answers and feedback are unchanged.';
        return;
      }
      savedAnswers.clear();
      render(false);
    });
    render();
  } catch {
    status.textContent = 'Automatic grading is unavailable. The original source notes above are still readable. Open the downloadable answer-key CSV to review the fictional cases manually.';
  }
}
void init();
