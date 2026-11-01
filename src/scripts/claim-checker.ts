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
    input.value = verdict;
    label.append(input, document.createTextNode(' ' + readable[verdict]));
    answers.append(label);
  }
  fieldset.append(answers);
  return fieldset;
}
function selected(): ClaimCase[] {
  return choice?.value === 'all' ? allCases : allCases.filter(item => PRACTICE_IDS.some(id => id === item.id));
}
function render() {
  if (!questions || !feedback || !status) return;
  const rows = selected();
  questions.replaceChildren(...rows.map(makeQuestion));
  feedback.replaceChildren();
  status.textContent = rows.length + ' fictional claims ready. Read the source notes, choose a verdict for each claim, then check your answers.';
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
    const [rowsResponse,notesResponse] = await Promise.all([
      fetch('/examples/claim-boundary-audit.csv',{cache:'no-cache'}),
      fetch('/examples/claim-boundary-source-notes.txt',{cache:'no-cache'}),
    ]);
    if (!rowsResponse.ok || !notesResponse.ok) throw new Error('The public source files could not be loaded.');
    allCases = parseClaimCases(await rowsResponse.text());
    sourcePanel.textContent = await notesResponse.text();
    submit.disabled = false;
    reset.disabled = false;
    choice.disabled = false;
    choice.addEventListener('change', render);
    form.addEventListener('submit', evaluate);
    reset.addEventListener('click',render);
    render();
  } catch {
    status.textContent = 'Interactive cases could not be loaded. Use the original downloadable CSV and source notes linked below to review the exercise manually.';
  }
}
void init();
