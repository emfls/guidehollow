import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {buildPrompt} from '../src/lib/tools.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

function createPromptBuilder(approveInitially=false) {
  let approve=approveInitially,confirmations=0,downloadRequests=0;
  const make=(value='')=>({
    value,disabled:false,textContent:'',events:{},focused:false,
    addEventListener(name,listener){this.events[name]=listener;},
    focus(){this.focused=true;},
    select(){this.selected=true;},
  });
  const fields=Object.fromEntries(['goal','context','audience','constraints','format'].map(name=>[name,make()]));
  const fieldset=make();fieldset.disabled=true;
  const form=make();
  form.querySelector=selector=>selector==='fieldset'?fieldset:null;
  form.querySelectorAll=selector=>{
    assert.equal(selector,'input,textarea');
    return Object.values(fields);
  };
  const output=make(),status=make(),copyStatus=make(),copy=make(),download=make(),example=make();
  output.disabled=true;copy.disabled=true;download.disabled=true;
  const elements={
    '#prompt-form':form,'#prompt-output':output,'#prompt-status':status,
    '#copy-status':copyStatus,'#copy-prompt':copy,'#download-prompt':download,
    '#load-prompt-example':example,
    ...Object.fromEntries(Object.entries(fields).map(([name,field])=>['#'+name,field])),
  };
  const script=ts.transpileModule(read('src/scripts/prompt-builder.ts'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  const sandbox={
    exports:{},Error,
    require(id){assert.equal(id,'../lib/tools');return {buildPrompt};},
    document:{
      querySelector:selector=>elements[selector]??null,
      createElement:tag=>({
        tagName:tag,click(){downloadRequests++;},
      }),
    },
    window:{confirm(message){confirmations++;assert.match(message,/draft|fields/);return approve;}},
    FormData:class {constructor(){ } get(name){return fields[name]?.value??null;}},
    navigator:{clipboard:{writeText:async()=>{}}},
    Blob:class {},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},setTimeout(){},
  };
  vm.runInNewContext(script,sandbox,{filename:'prompt-builder-client.js'});
  return {
    form,fields,fieldset,output,status,copyStatus,copy,download,example,
    get confirmations(){return confirmations;},
    get downloadRequests(){return downloadRequests;},
    approveNext(value){approve=value;},
    editSource(name,value){fields[name].value=value;form.events.input();},
    editOutput(value){output.value=value;output.events.input();},
    submit(){
      let prevented=false;
      form.events.submit({preventDefault(){prevented=true;}});
      assert.equal(prevented,true);
    },
    reset(){
      let prevented=false;
      form.events.reset({preventDefault(){prevented=true;}});
      if(!prevented) for(const f of Object.values(fields))f.value='';
      return !prevented;
    }
  };
}

test('the existing empty-to-generated workflow still works and enables export',()=>{
  const env=createPromptBuilder();
  assert.equal(env.fieldset.disabled,false);
  env.editSource('goal','Write a short fictional summary');
  env.submit();
  assert.match(env.output.value,/Write a short fictional summary/);
  assert.equal(env.output.disabled,false);
  assert.equal(env.copy.disabled,false);
  assert.equal(env.download.disabled,false);
  assert.equal(env.confirmations,0,'First build must not ask a needless question');
  env.submit();
  assert.equal(env.confirmations,0,'Rebuilding an untouched draft must remain one click');
});

test('rebuilding a manually edited draft requires confirmation and cancellation retains it',()=>{
  const env=createPromptBuilder();
  env.editSource('goal','Write a fictional summary');
  env.submit();
  env.editOutput('My hand-written paragraph with unique wording.');
  env.submit();
  assert.equal(env.confirmations,1);
  assert.equal(env.output.value,'My hand-written paragraph with unique wording.');
  assert.equal(env.copy.disabled,false);
  assert.equal(env.download.disabled,false);
  assert.match(env.status.textContent,/Rebuild cancelled/);
  env.approveNext(true);
  env.submit();
  assert.equal(env.confirmations,2);
  assert.match(env.output.value,/Write a fictional summary/);
  assert.doesNotMatch(env.output.value,/hand-written/);
  assert.equal(env.copy.disabled,false);
});

test('changing the source invalidates export and rejecting a rebuild keeps the edited reference',()=>{
  const env=createPromptBuilder();
  env.editSource('goal','Draft a prompt');
  env.submit();
  env.editOutput('Hand edited draft with a caveat.');
  env.editSource('audience','Independent reviewers');
  assert.equal(env.download.disabled,true);
  assert.equal(env.copy.disabled,true);
  env.submit();
  assert.equal(env.confirmations,1);
  assert.equal(env.output.value,'Hand edited draft with a caveat.');
  assert.equal(env.download.disabled,true,'Declined rebuild must not make stale output exportable');
  env.approveNext(true);
  env.submit();
  assert.match(env.output.value,/Independent reviewers/);
  assert.equal(env.download.disabled,false);
});

test('Reset refuses to discard source fields or an edited draft without consent',()=>{
  const env=createPromptBuilder();
  env.editSource('goal','Confidential working draft');
  env.submit();
  env.editOutput('Edited wording must remain');
  assert.equal(env.reset(),false);
  assert.equal(env.confirmations,1);
  assert.equal(env.fields.goal.value,'Confidential working draft');
  assert.equal(env.output.value,'Edited wording must remain');
  assert.equal(env.output.disabled,false);
  assert.match(env.status.textContent,/Reset cancelled/);
  env.approveNext(true);
  assert.equal(env.reset(),true);
  assert.equal(env.confirmations,2);
  assert.equal(env.fields.goal.value,'');
  assert.equal(env.output.value,'');
  assert.equal(env.output.disabled,true);
  assert.equal(env.download.disabled,true);
  assert.match(env.status.textContent,/Inputs and prompt cleared/);
  assert.equal(env.reset(),true,'Empty reset should be one click');
  assert.equal(env.confirmations,2,'No confirmation for an empty form');
});

test('Reset also protects incomplete source-only drafts without a built output',()=>{
  const env=createPromptBuilder();
  env.editSource('context','Unsaved context I typed first');
  assert.equal(env.reset(),false);
  assert.equal(env.fields.context.value,'Unsaved context I typed first');
  env.approveNext(true);
  assert.equal(env.reset(),true);
  assert.equal(env.fields.context.value,'');
});

test('fictional example does not overwrite personally entered fields or a manual draft',()=>{
  const env=createPromptBuilder();
  env.editSource('goal','Personal draft');
  env.example.events.click();
  assert.equal(env.fields.goal.value,'Personal draft');
  assert.match(env.status.textContent,/Your work was kept/);
  assert.equal(env.confirmations,0);
});

test('public help describes actual destructive action consent rather than suggesting Reset is immediate',()=>{
  const page=read('src/pages/tools/ai-prompt-builder.astro');
  const script=read('src/scripts/prompt-builder.ts');
  assert(page.includes('If you edited the draft, rebuilding asks before replacing it'));
  assert(page.includes('Reset clears both the fields and the draft after you confirm'));
  assert(script.includes('hasUnfinishedWork()'));
  assert(script.includes("form.addEventListener('reset', event => {"));
  assert(script.includes('event.preventDefault()'));
  assert(script.includes('outputEdited = false;'));
  assert(!/fetch\s*\(/.test(script));
  assert(!/localStorage|sessionStorage/.test(script));
});
