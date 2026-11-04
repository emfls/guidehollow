// Original GuideHollow teaching fixture. No packages, API, uploads or AI calls.
// This checks coverage, authority labels and verbatim quotes. It CANNOT verify
// whether a free-text interpretation accurately preserves the source's meaning.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const HEADER='SourceID\tDeclaredStatus\tSourceQuote\tWorkingInterpretation';
const STATUSES=new Set(['APPROVED','PROPOSED','OPEN','EXCLUDED']);
const EXPECTED=['B1','B2','B3','B4','B5','B6','B7','B8','B9'];

export function parseBrief(sourceText) {
  if (typeof sourceText !== 'string' || sourceText.length>100000)
    throw new Error('Source must be plain text under 100,000 characters.');
  const found=new Map();
  for(const line of sourceText.replace(/\r\n/g,'\n').split('\n')) {
    if(!/^B\d+\s*\|/.test(line))continue;
    const match=line.match(/^(B\d+) \| (APPROVED|PROPOSED|OPEN|EXCLUDED) \| (.+)$/);
    if(!match)throw new Error('Malformed source record: '+line.slice(0,32));
    const [,id,status,quote]=match;
    if(found.has(id))throw new Error('Duplicate source ID: '+id);
    found.set(id,{status,quote});
  }
  if(JSON.stringify([...found.keys()])!==JSON.stringify(EXPECTED))
    throw new Error('The fictional source must contain B1 through B9 once and in order.');
  return found;
}

export function parseRegister(tsv) {
  if(typeof tsv!=='string'||tsv.length>100000)
    throw new Error('Register must be a local TSV under 100,000 characters.');
  const content=tsv.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
  if(content.includes('\r'))throw new Error('Unsupported line ending in register.');
  const lines=content.split('\n');
  if(lines.at(-1)==='')lines.pop();
  if(lines.shift()!==HEADER)throw new Error('Expected the original four-column TSV header.');
  if(!lines.length||lines.length>100)throw new Error('Register must contain 1–100 rows.');
  return lines.map((line,index)=>{
    const cells=line.split('\t');
    if(cells.length!==4||cells.some(c=>!c.trim()))
      throw new Error('Row '+(index+2)+' needs four nonempty columns.');
    return {id:cells[0],status:cells[1],quote:cells[2],interpretation:cells[3]};
  });
}

export function auditRegister(sourceText,registerText) {
  const brief=parseBrief(sourceText);
  const rows=parseRegister(registerText);
  const issues=[];
  const seen=new Set();
  for(const row of rows) {
    if(!/^B\d+$/.test(row.id)) {
      issues.push({id:row.id,kind:'INVALID_ID'});continue;
    }
    if(seen.has(row.id)) {
      issues.push({id:row.id,kind:'DUPLICATE_ID'});continue;
    }
    seen.add(row.id);
    const expected=brief.get(row.id);
    if(!expected){issues.push({id:row.id,kind:'UNKNOWN_ID'});continue;}
    if(!STATUSES.has(row.status)||row.status!==expected.status)
      issues.push({id:row.id,kind:'STATUS_MISMATCH',expected:expected.status,actual:row.status});
    if(row.quote!==expected.quote)
      issues.push({id:row.id,kind:'QUOTE_MISMATCH'});
    // Interpretation is deliberately not assessed: keywords and numeric
    // regexes cannot decide whether a requirement was fabricated.
  }
  for(const id of brief.keys()) {
    if(!seen.has(id))issues.push({id,kind:'MISSING_ID'});
  }
  return {pass:issues.length===0,sourceCount:brief.size,registerCount:rows.length,issues};
}

function main() {
  if(process.argv.length!==3){
    process.stderr.write('Usage: node audit.mjs path/to/your-register.tsv\n');
    process.exitCode=1;return;
  }
  try{
    const source=readFileSync(new URL('./project-brief-v1.txt',import.meta.url),'utf8');
    const submitted=readFileSync(resolve(process.argv[2]),'utf8');
    const r=auditRegister(source,submitted);
    process.stdout.write('GuideHollow fictional requirements source audit\n');
    process.stdout.write('Source IDs: '+r.sourceCount+'; submitted rows: '+r.registerCount+'\n');
    for(const issue of r.issues){
      process.stdout.write('- '+issue.id+': '+issue.kind+
        (issue.expected?' (expected '+issue.expected+', got '+issue.actual+')':'')+'\n');
    }
    process.stdout.write((r.pass?'PASS: all source IDs, authority labels and verbatim quotes agree.':
      'FAIL: source coverage or attribution issues found.')+'\n');
    process.stdout.write('LIMIT: This checker CANNOT validate WorkingInterpretation, approved acceptance criteria, real-world authority or AI output quality. Review the text against the original manually.\n');
    if(!r.pass)process.exitCode=2;
  }catch(error){
    process.stderr.write('Audit could not run: '+(error instanceof Error?error.message:'unknown error')+'\n');
    process.exitCode=1;
  }
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main();
