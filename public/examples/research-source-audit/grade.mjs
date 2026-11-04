// Original GuideHollow research source-audit exercise. Node.js built-ins only.
// This scores an editorially transcribed worksheet. It does not retrieve live
// vendor pages, verify true product capabilities, or run any AI model.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const LABELS=new Set(['SUPPORTED','CONTRADICTED','NOT_ESTABLISHED']);
const IDS=Array.from({length:12},(_,i)=>'C'+String(i+1).padStart(2,'0'));

export function readTable(text,headers) {
  if(typeof text!=='string'||text.length>100000)throw Error('TSV must be under 100,000 characters.');
  const lines=text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').split('\n');
  if(lines.at(-1)==='')lines.pop();
  if(lines.shift()!==headers.join('\t'))throw Error('Invalid header: expected '+headers.join(', '));
  if(lines.length!==12)throw Error('Expected exactly 12 cases.');
  const seen=new Set();
  return lines.map((line,index)=>{
    const cells=line.split('\t');
    if(cells.length!==headers.length||cells.some(cell=>!cell.trim()))
      throw Error('Row '+(index+2)+' must have '+headers.length+' nonempty fields.');
    const id=cells[0];
    if(!/^C\d{2}$/.test(id)||seen.has(id))
      throw Error('Invalid or duplicate case ID: '+id);
    seen.add(id);
    if(id!==IDS[index])throw Error('Case IDs must remain in source order: '+IDS[index]);
    return Object.fromEntries(headers.map((name,i)=>[name,cells[i]]));
  });
}

export function grade(practiceText,keyText,submittedText) {
  const questions=readTable(practiceText,['ClaimID','ClaimToAudit']);
  const key=readTable(keyText,['ClaimID','Judgment','EvidenceIDs','Reason']);
  const submitted=readTable(submittedText,['ClaimID','SubmittedJudgment']);
  const stats={match:0,wrongJudgment:0,invalidFormat:0};
  const rows=[];
  for(let i=0;i<12;i++) {
    const ref=key[i],answer=submitted[i];
    if(ref.ClaimID!==questions[i].ClaimID||answer.ClaimID!==ref.ClaimID)
      throw Error('Case IDs do not align.');
    if(!LABELS.has(ref.Judgment)||!ref.EvidenceIDs||ref.Reason.length<30)
      throw Error('Editorial answer key is invalid at '+ref.ClaimID);
    const status=!LABELS.has(answer.SubmittedJudgment)?'INVALID_FORMAT':
      answer.SubmittedJudgment===ref.Judgment?'MATCH':'WRONG_JUDGMENT';
    if(status==='MATCH')stats.match++;
    else if(status==='WRONG_JUDGMENT')stats.wrongJudgment++;
    else stats.invalidFormat++;
    rows.push({id:ref.ClaimID,status,expected:ref.Judgment});
  }
  const histogram=Object.fromEntries([...LABELS].map(label=>[label,key.filter(x=>x.Judgment===label).length]));
  if(histogram.SUPPORTED!==4||histogram.CONTRADICTED!==3||histogram.NOT_ESTABLISHED!==5)
    throw Error('Published reference distribution is inconsistent.');
  return {total:12,stats,rows};
}

function main() {
  if(process.argv.length!==3){
    process.stderr.write('Usage: node grade.mjs your-judgments.tsv\n');
    process.exitCode=1;
    return;
  }
  try {
    const questions=readFileSync(new URL('./practice.tsv',import.meta.url),'utf8');
    const key=readFileSync(new URL('./answer-key.tsv',import.meta.url),'utf8');
    const candidate=readFileSync(resolve(process.argv[2]),'utf8');
    const result=grade(questions,key,candidate);
    process.stdout.write('GuideHollow fictional research packet: offline evidence-label comparison\n');
    for(const row of result.rows){
      process.stdout.write(row.id+': '+row.status+(row.status==='MATCH'?'':' (editorial reference: '+row.expected+')')+'\n');
    }
    process.stdout.write('Exact editorial matches: '+result.stats.match+'/12; wrong valid judgments: '+
      result.stats.wrongJudgment+'; invalid format: '+result.stats.invalidFormat+'\n');
    process.stdout.write('LIMIT: The labels are invented, source-bounded editorial decisions, not AI performance scores or evidence about a real product. Review the exact supporting passages yourself.\n');
  } catch(error) {
    process.stderr.write('Grading failed: '+(error instanceof Error?error.message:'unknown error')+'\n');
    process.exitCode=1;
  }
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main();
