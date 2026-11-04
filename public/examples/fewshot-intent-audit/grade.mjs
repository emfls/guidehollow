// GuideHollow original classification exercise. Node.js built-ins only.
// This audits a submitted TSV against editor-written references; it never
// calls an AI provider, uploads personal text or evaluates a live model.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const LABELS = new Set(['REQUEST','IDEA','STATUS','UNCLEAR']);

export function readTable(text, headers) {
  if (typeof text !== 'string' || text.length > 100000)
    throw new Error('TSV must be plain text under 100,000 characters.');
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g,'\n');
  if (normalized.includes('\r')) throw new Error('Unsupported line endings.');
  const lines = normalized.split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines.shift() !== headers.join('\t'))
    throw new Error('Expected TSV header: '+headers.join(', '));
  if (!lines.length) throw new Error('TSV must contain records.');
  const seen = new Set();
  return lines.map((line,index) => {
    const cells = line.split('\t');
    if (cells.length !== headers.length || cells.some(cell=>!cell))
      throw new Error('Row '+(index+2)+' requires '+headers.length+' nonempty columns.');
    const id = cells[0];
    if (!/^C\d{2}$/.test(id) || seen.has(id))
      throw new Error('Invalid or repeated case ID at row '+(index+2));
    seen.add(id);
    return Object.fromEntries(headers.map((header,i)=>[header,cells[i]]));
  });
}

export function evaluate(blindText, keyText, outputText) {
  const blind = readTable(blindText,['CaseID','FeedbackMessage']);
  const key = readTable(keyText,['CaseID','ExpectedLabel','Reason']);
  const outputs = readTable(outputText,['CaseID','ModelOutput']);
  if (blind.length !== 12 || key.length !== 12 || outputs.length !== 12)
    throw new Error('All three files must have exactly 12 cases.');
  const counts = {matched:0,wrongLabel:0,invalidFormat:0};
  const labels = new Map([...LABELS].map(label=>[label,0]));
  const results = [];
  for (let i=0;i<blind.length;i++) {
    const {CaseID:id,FeedbackMessage:message} = blind[i];
    const reference = key[i];
    const submission = outputs[i];
    if (reference.CaseID !== id || submission.CaseID !== id)
      throw new Error('Case IDs must match the published blind sheet in order: '+id);
    if (message.trim().length < 8 || !LABELS.has(reference.ExpectedLabel) || reference.Reason.length < 20)
      throw new Error('Published reference is incomplete: '+id);
    labels.set(reference.ExpectedLabel,labels.get(reference.ExpectedLabel)+1);
    const answer = submission.ModelOutput;
    const result = !LABELS.has(answer) ? 'INVALID_FORMAT' :
      answer === reference.ExpectedLabel ? 'MATCH' : 'WRONG_LABEL';
    if(result==='MATCH')counts.matched++;
    else if(result==='WRONG_LABEL')counts.wrongLabel++;
    else counts.invalidFormat++;
    results.push({id,result,expected:reference.ExpectedLabel});
  }
  if ([...labels.values()].some(count=>count!==3))
    throw new Error('The editorial answer key must contain three references per label.');
  return {total:blind.length,counts,results};
}

function main() {
  if (process.argv.length !== 3) {
    process.stderr.write('Usage: node grade.mjs your-predictions.tsv\n');
    process.exitCode=1;
    return;
  }
  try {
    const input=readFileSync(resolve(process.argv[2]),'utf8');
    const blind=readFileSync(new URL('./blind-test.tsv',import.meta.url),'utf8');
    const key=readFileSync(new URL('./answer-key.tsv',import.meta.url),'utf8');
    const result=evaluate(blind,key,input);
    process.stdout.write('GuideHollow fictional intent-classification reference audit\n');
    for(const row of result.results) {
      // Do not print arbitrary user-supplied text to the terminal.
      const hint=row.result==='MATCH'?'':' (editorial reference: '+row.expected+')';
      process.stdout.write(row.id+': '+row.result+hint+'\n');
    }
    process.stdout.write('Exact matches: '+result.counts.matched+'/'+result.total+
      '; wrong valid labels: '+result.counts.wrongLabel+
      '; invalid output format: '+result.counts.invalidFormat+'\n');
    process.stdout.write('This is a local comparison with fictional editorial labels, not observed AI accuracy.\n');
  } catch(error) {
    process.stderr.write('Audit failed: '+(error instanceof Error?error.message:'unknown error')+'\n');
    process.exitCode=1;
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main();
