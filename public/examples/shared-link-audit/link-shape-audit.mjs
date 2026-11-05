// GuideHollow original local exercise: URL shape, not trust, access or revocation.
// No network, URL opening, private sharing-link lookup or account integration.
// Input examples are explicitly synthetic. Never paste real private share URLs
// into a support ticket or untrusted checker.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const CASE_IDS=Array.from({length:14},(_,i)=>'C'+String(i+1).padStart(2,'0'));
const LABELS=new Set(['CONVERSATION_PATTERN','TASK_PATTERN','REJECT']);

export function classifyShape(input) {
  if(typeof input!=='string'||input.length<8||input.length>500||
     input.trim()!==input||/[\x00-\x1f\x7f]/.test(input))
    return {classification:'REJECT',reason:'INVALID_INPUT'};
  let u;
  try { u=new URL(input); }
  catch { return {classification:'REJECT',reason:'INVALID_URL'}; }
  if(u.username||u.password)return {classification:'REJECT',reason:'USERINFO_NOT_ALLOWED'};
  if(u.protocol!=='https:')return {classification:'REJECT',reason:'HTTPS_REQUIRED'};
  if(u.hostname!=='chatgpt.com')return {classification:'REJECT',reason:'HOST_MISMATCH'};
  if(u.port)return {classification:'REJECT',reason:'UNEXPECTED_PORT'};
  if(u.search)return {classification:'REJECT',reason:'QUERY_NOT_ALLOWED'};
  if(u.hash)return {classification:'REJECT',reason:'FRAGMENT_NOT_ALLOWED'};
  const m=u.pathname.match(/^\/(share|s)\/([A-Za-z0-9_-]{4,128})$/);
  if(!m)return {classification:'REJECT',reason:'PATH_NOT_CANONICAL'};
  if(m[1]==='share')return {classification:'CONVERSATION_PATTERN',reason:'MATCH_CONVERSATION'};
  return {classification:'TASK_PATTERN',reason:'MATCH_TASK'};
}

export function parseTable(text,headers) {
  if(typeof text!=='string'||text.length>50000)throw Error('Expected a small local TSV input.');
  const str=text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
  if(str.includes('\r'))throw Error('Unsupported line ending.');
  const lines=str.split('\n');
  if(lines.at(-1)==='')lines.pop();
  if(lines.shift()!==headers.join('\t'))throw Error('Unexpected TSV columns.');
  if(lines.length!==CASE_IDS.length)throw Error('Expected exactly fourteen cases.');
  const observed=new Set();
  return lines.map((line,i)=>{
    const cells=line.split('\t');
    if(cells.length!==headers.length||cells.some(cell=>!cell.trim()))
      throw Error('Every TSV row needs '+headers.length+' nonempty fields.');
    const id=cells[0];
    if(observed.has(id)||id!==CASE_IDS[i])throw Error('Duplicate or out-of-order CaseID at row '+(i+2));
    observed.add(id);
    return Object.fromEntries(headers.map((name,j)=>[name,cells[j]]));
  });
}

export function scanCandidates(data) {
  const rows=parseTable(data,['CaseID','SyntheticURL']);
  return rows.map(row=>({id:row.CaseID,...classifyShape(row.SyntheticURL)}));
}

export function gradeWorksheet(inputs,worksheet) {
  const expected=scanCandidates(inputs);
  const submitted=parseTable(worksheet,['CaseID','YourClassification']);
  const stats={matches:0,wrongValid:0,invalidFormat:0};
  const cases=expected.map((row,i)=>{
    if(row.id!==submitted[i].CaseID)throw Error('Case order must match the source.');
    const supplied=submitted[i].YourClassification;
    const outcome=!LABELS.has(supplied)?'INVALID_FORMAT':
      row.classification===supplied?'MATCH':'WRONG_VALID';
    if(outcome==='MATCH')stats.matches++;
    if(outcome==='WRONG_VALID')stats.wrongValid++;
    if(outcome==='INVALID_FORMAT')stats.invalidFormat++;
    return {...row,outcome};
  });
  return {cases,stats};
}

function main() {
  const mode=process.argv[2],file=process.argv[3];
  if(!['scan','grade'].includes(mode)||process.argv.length!==5){
    process.stderr.write('Usage: node link-shape-audit.mjs scan synthetic-links.tsv\n');
    process.stderr.write('   or: node link-shape-audit.mjs grade your-worksheet.tsv\n');
    process.exitCode=1;return;
  }
  try {
    const synthetic=readFileSync(new URL('./synthetic-links.tsv',import.meta.url),'utf8');
    if(mode==='scan'){
      const cases=scanCandidates(readFileSync(resolve(file),'utf8'));
      for(const c of cases)process.stdout.write(c.id+'\t'+c.classification+'\t'+c.reason+'\n');
      const valid=cases.filter(c=>c.classification!=='REJECT').length;
      process.stdout.write('Recognized conversation/task shapes: '+valid+'/14; rejected shapes: '+(14-valid)+'/14\n');
    }else{
      const result=gradeWorksheet(synthetic,readFileSync(resolve(file),'utf8'));
      for(const c of result.cases)process.stdout.write(c.id+': '+c.outcome+' (expected '+c.classification+')\n');
      process.stdout.write('Matches: '+result.stats.matches+'/14; wrong valid labels: '+result.stats.wrongValid+
        '; invalid format: '+result.stats.invalidFormat+'\n');
    }
    process.stdout.write('LIMIT: This is a STRICT synthetic URL-shape exercise, not proof that any link exists, is safe, belongs to ChatGPT, is still accessible, or has been revoked. Never follow untrusted links merely because their shape matches.\n');
  }catch(error){
    process.stderr.write('Local audit failed: '+(error instanceof Error?error.message:'unknown error')+'\n');
    process.exitCode=1;
  }
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main();
