// Original GuideHollow offline scoped-edit workbench. Node.js built-ins only.
// This protects literal approved lines and minimal output shape.
// It does NOT know whether edited questions are true, suitable or approved.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const labels=['- Problem: ','- Confirmed facts: ','- Missing details: '];

function readLines(text) {
  if(typeof text!=='string'||text.length>20000)throw Error('Expected a plain-text file under 20,000 characters.');
  if(text.includes('\r')||text.includes('\uFEFF'))throw Error('Use LF line endings and no byte-order mark to make comparisons unambiguous.');
  const finalNewline=text.endsWith('\n');
  const lines=(finalNewline?text.slice(0,-1):text).split('\n');
  if(lines.length!==3)throw Error('Expected exactly three labeled bullets; no extra heading or commentary.');
  for(let i=0;i<3;i++) {
    if(!lines[i].startsWith(labels[i])||lines[i].length===labels[i].length)
      throw Error('Missing or reordered required label at bullet '+(i+1));
  }
  return {lines,finalNewline};
}

function readReplacement(text) {
  if(typeof text!=='string'||text.length>2000)throw Error('Replacement exceeds the 2,000-character training limit.');
  if(text.includes('\r')||text.includes('\uFEFF'))throw Error('Replacement has invalid control or newline encoding.');
  const replacement=text.endsWith('\n')?text.slice(0,-1):text;
  if(!replacement||replacement.includes('\n')||replacement.includes('\t'))
    throw Error('Replacement must be one nonempty line without tab characters.');
  if((replacement.match(/\?/g)||[]).length!==2)
    throw Error('Replacement must contain exactly two question marks.');
  return replacement;
}

export function assemble(approved,replacement) {
  const {lines,finalNewline}=readLines(approved);
  const updated=[lines[0],lines[1],labels[2]+readReplacement(replacement)].join('\n');
  return updated+(finalNewline?'\n':'');
}

export function check(approved,candidate) {
  const baseline=readLines(approved);
  let revision;
  try { revision=readLines(candidate); }
  catch(error) {return {pass:false,problem:'OUTPUT_SHAPE',detail:String(error.message)};}
  if(baseline.finalNewline!==revision.finalNewline)
    return {pass:false,problem:'NEWLINE_DRIFT'};
  if(baseline.lines[0]!==revision.lines[0]||baseline.lines[1]!==revision.lines[1])
    return {pass:false,problem:'FROZEN_TEXT_DRIFT'};
  try{readReplacement(revision.lines[2].slice(labels[2].length));}
  catch(error){return {pass:false,problem:'EDIT_SHAPE',detail:String(error.message)};}
  return {pass:true,problem:null};
}

function main(){
  const [operation,approvedFile,otherFile]=process.argv.slice(2);
  if(!['assemble','check'].includes(operation)||!approvedFile||!otherFile||process.argv.length!==5) {
    process.stderr.write('Usage: node scoped-edit.mjs assemble approved-answer.txt replacement-questions.txt\n');
    process.stderr.write('   or: node scoped-edit.mjs check approved-answer.txt candidate-revised.txt\n');
    process.exitCode=1;return;
  }
  try{
    const original=readFileSync(resolve(approvedFile),'utf8');
    const other=readFileSync(resolve(otherFile),'utf8');
    if(operation==='assemble'){
      // No model is allowed to retype the frozen lines: reuse the exact input.
      process.stdout.write(assemble(original,other));
    }else{
      const verdict=check(original,other);
      process.stdout.write(verdict.pass?
        'PASS: frozen lines, three labels, two question marks and LF convention match.\n':
        'FAIL: '+verdict.problem+(verdict.detail?' — '+verdict.detail:'')+'\n');
      process.stdout.write('LIMIT: This check cannot establish whether the new questions are factually supported or approved. Read the original source note.\n');
      if(!verdict.pass)process.exitCode=2;
    }
  }catch(error){
    process.stderr.write('Cannot process input: '+(error instanceof Error?error.message:'unknown error')+'\n');
    process.exitCode=1;
  }
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main();
