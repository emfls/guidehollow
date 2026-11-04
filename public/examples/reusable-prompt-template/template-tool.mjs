// Original GuideHollow teaching exercise. Runs offline using Node.js built-ins.
// It preflights inputs and compares normalized actions with editor-written
// reference rows. It does NOT evaluate raw AI answers or guarantee correctness.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const tokens=['AUDIENCE','REFERENCE_DATE','LABELED_NOTES'];
const columns=['CaseID','SourceID','Action','Owner','DueDate'];

export function readCases(text) {
  if(typeof text!=='string'||text.length>50000)throw Error('Cases JSON exceeds the limit.');
  const data=JSON.parse(text);
  if(data.version!==1||!Array.isArray(data.cases)||data.cases.length<1||data.cases.length>50)
    throw Error('Expected a version-one case file containing 1–50 cases.');
  const seen=new Set();
  for(const item of data.cases) {
    if(!item||typeof item.id!=='string'||!/^C\d{2}$/.test(item.id)||seen.has(item.id))
      throw Error('Invalid or repeated case ID in JSON.');
    seen.add(item.id);
    for(const field of ['name','audience','referenceDate','notes']) {
      if(typeof item[field]!=='string')throw Error(item.id+': missing string field '+field);
    }
  }
  return data.cases;
}

function validDate(date) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
  const [y,m,d]=date.split('-').map(Number);
  const check=new Date(Date.UTC(y,m-1,d));
  return check.getUTCFullYear()===y&&check.getUTCMonth()===m-1&&check.getUTCDate()===d;
}

export function renderPrompt(template,item) {
  if(typeof template!=='string'||template.length>10000)throw Error('Template is missing or too large.');
  const matches=[...template.matchAll(/\{\{([^}]+)\}\}/g)].map(x=>x[1]);
  if(matches.length!==3||new Set(matches).size!==3||tokens.some(token=>!matches.includes(token)))
    throw Error('Template must use exactly one of each expected placeholder.');
  if(!item||typeof item.audience!=='string'||!item.audience.trim()||
     item.audience.length>120||/[\n\r\t]/.test(item.audience))
    throw Error('AUDIENCE is required, single-line, and at most 120 characters.');
  if(!validDate(item.referenceDate))throw Error('REFERENCE_DATE must be a real YYYY-MM-DD date.');
  if(typeof item.notes!=='string'||item.notes.length>10000||
    /END SOURCE NOTES|BEGIN SOURCE NOTES/i.test(item.notes))
    throw Error('Source notes must be plain, bounded data without the reserved boundary marker.');
  const values={
    AUDIENCE:item.audience,
    REFERENCE_DATE:item.referenceDate,
    LABELED_NOTES:item.notes.trim()?item.notes:'[NO NOTES SUPPLIED]'
  };
  return template.replace(/\{\{([^}]+)\}\}/g,(_,key)=>values[key]);
}

export function parseActions(tsv) {
  if(typeof tsv!=='string'||tsv.length>30000)throw Error('Action worksheet is too large.');
  const normalized=tsv.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
  if(normalized.includes('\r'))throw Error('Invalid line endings.');
  const lines=normalized.split('\n');
  if(lines.at(-1)==='')lines.pop();
  if(lines.shift()!==columns.join('\t'))throw Error('Expected the published five-column TSV header.');
  if(!lines.length||lines.length>100)throw Error('Expected 1–100 action rows.');
  const seen=new Set();
  return lines.map((line,i)=>{
    const cells=line.split('\t');
    if(cells.length!==5||cells.some(value=>!value.trim()))throw Error('Row '+(i+2)+' requires five nonempty fields.');
    const [CaseID,SourceID,Action,Owner,DueDate]=cells;
    if(!/^C\d{2}$/.test(CaseID)||!(SourceID==='NONE'||/^[A-Z]\d{2}$/.test(SourceID)))
      throw Error('Unexpected case or source ID at row '+(i+2));
    const key=CaseID+'\t'+SourceID;
    if(seen.has(key))throw Error('Duplicate action reference: '+key);
    seen.add(key);
    return {CaseID,SourceID,Action,Owner,DueDate};
  });
}

export function compareActions(referenceText,candidateText) {
  const expected=parseActions(referenceText);
  const actual=parseActions(candidateText);
  const expectedMap=new Map(expected.map(item=>[item.CaseID+'\t'+item.SourceID,item]));
  const actualMap=new Map(actual.map(item=>[item.CaseID+'\t'+item.SourceID,item]));
  const issues=[];
  for(const row of actual) {
    const id=row.CaseID+' '+row.SourceID;
    const original=expectedMap.get(row.CaseID+'\t'+row.SourceID);
    if(!original){issues.push({id,kind:'UNEXPECTED_ROW'});continue;}
    for(const field of ['Action','Owner','DueDate']){
      if(original[field]!==row[field])issues.push({id,kind:field.toUpperCase()+'_MISMATCH'});
    }
  }
  for(const row of expected) {
    if(!actualMap.has(row.CaseID+'\t'+row.SourceID))issues.push({id:row.CaseID+' '+row.SourceID,kind:'MISSING_ROW'});
  }
  return {pass:issues.length===0,rowsExpected:expected.length,rowsSubmitted:actual.length,issues};
}

function main() {
  const args=process.argv.slice(2);
  const mode=args[0];
  if(!['list','render','audit'].includes(mode)||
    (mode==='list'&&args.length!==1)||
    (mode==='render'&&args.length!==2)||
    (mode==='audit'&&args.length!==2)){
    process.stderr.write('Usage: node template-tool.mjs list\n');
    process.stderr.write('       node template-tool.mjs render C01\n');
    process.stderr.write('       node template-tool.mjs audit your-actions.tsv\n');
    process.exitCode=1;return;
  }
  try{
    const cases=readCases(readFileSync(new URL('./cases.json',import.meta.url),'utf8'));
    if(mode==='list') {
      for(const item of cases)process.stdout.write(item.id+': '+item.name+'\n');
    }else if(mode==='render') {
      const item=cases.find(x=>x.id===args[1]);
      if(!item)throw Error('Unknown case ID: '+args[1]);
      const template=readFileSync(new URL('./template.txt',import.meta.url),'utf8');
      process.stdout.write(renderPrompt(template,item));
    }else{
      const reference=readFileSync(new URL('./reviewed-actions.tsv',import.meta.url),'utf8');
      const candidate=readFileSync(resolve(args[1]),'utf8');
      const result=compareActions(reference,candidate);
      process.stdout.write('Original fictional five-case action worksheet plus one rejected-input check.\n');
      process.stdout.write('Expected rows: '+result.rowsExpected+'; submitted: '+result.rowsSubmitted+'\n');
      for(const issue of result.issues)process.stdout.write('- '+issue.id+': '+issue.kind+'\n');
      process.stdout.write(result.pass?'PASS: all normalized rows match the editorial reference.\n':
        'FAIL: '+result.issues.length+' row/field differences from the editorial reference.\n');
      process.stdout.write('LIMIT: This compares a human-transcribed worksheet with editorial rows; it does not read an AI transcript or certify fact accuracy, completeness of decisions or model reliability.\n');
      if(!result.pass)process.exitCode=2;
    }
  }catch(error){
    process.stderr.write('Input check failed: '+(error instanceof Error?error.message:'unknown error')+'\n');
    process.exitCode=1;
  }
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main();
