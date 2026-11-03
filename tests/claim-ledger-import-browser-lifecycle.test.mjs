import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {makeLedgerEntry,replaceLedgerEntry,exportClaimLedger,importClaimLedgerTsv} from '../src/lib/claim-ledger.ts';

const script=readFileSync(new URL('../src/scripts/custom-claim-ledger.ts',import.meta.url),'utf8');
const page=readFileSync(new URL('../src/pages/tools/claim-checker.astro',import.meta.url),'utf8');
const base={
  source:'Fictional notebook',claim:'The meeting is confirmed.',
  passage:'The venue is not yet confirmed.',
  verdict:'CONTRADICTED',note:'The source explicitly says the venue is still undecided.',
};

function makeControl(value='') {
  const events={};
  return {
    value,disabled:false,events,
    addEventListener(type,fn){events[type]=fn;},
    focus(){this.focused=true;},
  };
}

function createInteractiveLedger(confirmFn=()=>true) {
  const fields=makeControl();fields.disabled=true;
  const source=makeControl(),claim=makeControl(),passage=makeControl(),verdict=makeControl(),note=makeControl();
  const save=makeControl(),cancel=makeControl(),download=makeControl(),clear=makeControl();
  save.textContent='Add reviewed claim';cancel.disabled=true;
  download.disabled=true;clear.disabled=true;
  const form=makeControl();
  const fieldMap={'fieldset':fields,'#personal-source':source,'#personal-claim':claim,
    '#personal-passage':passage,'#personal-verdict':verdict,'#personal-note':note,
    '#personal-ledger-save':save,'#personal-ledger-cancel-edit':cancel};
  form.querySelector=selector=>fieldMap[selector]??null;
  form.reset=()=>{
    form.events.reset?.();
    for(const field of [source,claim,passage,verdict,note])field.value='';
  };
  const status=makeControl(),records=makeControl(),importFile=makeControl(),importButton=makeControl();
  records.children=[];records.replaceChildren=(...children)=>{records.children=children;};
  importFile.disabled=true;importButton.disabled=true;importFile.files=[];
  let selectedValue='';
  Object.defineProperty(importFile,'value',{get:()=>selectedValue,set(v){selectedValue=v;if(!v)importFile.files=[];}});
  const bySelector={
    '#personal-claim-form':form,'#personal-ledger-status':status,
    '#personal-ledger-entries':records,'#personal-ledger-download':download,
    '#personal-ledger-clear':clear,'#personal-ledger-import-file':importFile,
    '#personal-ledger-import':importButton,
  };
  const createElement=tag=>({
    tagName:tag,children:[],textContent:'',
    append(...nodes){this.children.push(...nodes);},
    setAttribute(name,value){this[name]=value;},
    addEventListener(type,fn){this.events??={};this.events[type]=fn;},
  });
  let confirmations=0, downloads=0;
  const sandbox={
    exports:{},
    Error,
    require(name){
      assert.equal(name,'../lib/claim-ledger');
      return {makeLedgerEntry,replaceLedgerEntry,exportClaimLedger,importClaimLedgerTsv};
    },
    document:{
      querySelector:selector=>bySelector[selector]??null,
      createElement,
      createTextNode:text=>({textContent:text}),
    },
    window:{confirm:message=>{confirmations++;return confirmFn(message);}},
    Blob:class {constructor() {downloads++;}},
    URL:{createObjectURL:()=> 'blob:testing',revokeObjectURL(){}},
    setTimeout(){},
  };
  const js=ts.transpileModule(script,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(js,sandbox,{filename:'compiled-local-ledger.js'});
  return {
    form,fields,source,claim,passage,verdict,note,save,cancel,download,clear,records,status,importFile,importButton,
    get confirmations(){return confirmations;},get downloads(){return downloads;},
    selectFile(file){importFile.files=[file];importFile.value='nonempty';importFile.events.change();},
    clickImport(){return importButton.events.click();},
    submit(values){Object.assign(source,{value:values.source});Object.assign(claim,{value:values.claim});
      Object.assign(passage,{value:values.passage});Object.assign(verdict,{value:values.verdict});
      Object.assign(note,{value:values.note});
      form.events.submit({preventDefault(){}});
    },
  };
}

function testFile(rows){
  const data=exportClaimLedger(rows);
  return {size:new TextEncoder().encode(data).length,text:async()=>data};
}

test('the actual compiled browser controller unlocks file input after handlers are installed',()=>{
  assert.match(page,/id="personal-ledger-import-file"[^>]*disabled/,'No-JS HTML must be inert');
  assert.match(page,/id="personal-ledger-import" disabled/);
  const env=createInteractiveLedger();
  assert.equal(env.fields.disabled,false,'Manual form is enabled after JS initialization');
  assert.equal(env.importFile.disabled,false,'The file picker was previously stranded disabled');
  assert.equal(env.importButton.disabled,true,'Import action remains unavailable before choosing a file');
  assert.equal(typeof env.importButton.events.click,'function');
  assert.equal(typeof env.importFile.events.change,'function');
});

test('import from a real TSV export restores rows, then saving a new row continues after the highest ID',async()=>{
  const env=createInteractiveLedger();
  const rows=[makeLedgerEntry(base,1),makeLedgerEntry({
    ...base,claim:'No location name has been set.',passage:'',verdict:'UNSUPPORTED',
  },5)];
  env.selectFile(testFile(rows));
  assert.equal(env.importButton.disabled,false);
  await env.clickImport();
  assert.equal(env.records.children.length,2);
  assert.equal(env.records.children[0].children[0].textContent,'R001 · CONTRADICTED');
  assert.equal(env.records.children[1].children[0].textContent,'R005 · UNSUPPORTED');
  assert.match(env.status.textContent,/2 reviewed claim\(s\) restored locally/);
  assert.equal(env.importButton.disabled,true);
  assert.equal(env.importFile.disabled,false,'Picker stays usable for subsequent sessions');
  assert.equal(env.confirmations,0,'No confirmation needed for a completely empty worksheet');
  env.submit({...base,claim:'The schedule is finalized.'});
  assert.equal(env.records.children.length,3);
  assert.equal(env.records.children[2].children[0].textContent,'R006 · CONTRADICTED');
  assert.equal(env.download.disabled,false);
  assert.equal(env.downloads,0);
});

test('invalid TSV and refused confirmation both preserve unsaved rows and form input',async()=>{
  let allowed=false;
  const env=createInteractiveLedger(()=>allowed);
  env.submit(base);
  env.source.value='Unfinished private note';
  env.claim.value='Do not overwrite my draft';
  env.selectFile({size:20,text:async()=> 'wrong file type'});
  await env.clickImport();
  assert.equal(env.records.children.length,1);
  assert.equal(env.source.value,'Unfinished private note');
  assert.match(env.status.textContent,/Not a GuideHollow claim-ledger export/);
  const replacement=[makeLedgerEntry({...base,claim:'Changed in downloaded file'},8)];
  env.selectFile(testFile(replacement));
  await env.clickImport();
  assert.equal(env.confirmations,1);
  assert.equal(env.records.children[0].children[0].textContent,'R001 · CONTRADICTED');
  assert.equal(env.claim.value,'Do not overwrite my draft');
  assert.match(env.status.textContent,/Import cancelled/);
  allowed=true;
  await env.clickImport();
  assert.equal(env.records.children[0].children[0].textContent,'R008 · CONTRADICTED');
  assert.equal(env.source.value,'');
  assert.equal(env.confirmations,2);
});

test('the asynchronous file chooser rejects a stale selection and blocks duplicate reads',async()=>{
  const env=createInteractiveLedger();
  const entries=[makeLedgerEntry(base,1)];
  const delayed=testFile(entries);
  let resolveText,reads=0;
  delayed.text=()=>{reads++;return new Promise(resolve=>{resolveText=resolve;});};
  env.selectFile(delayed);
  const first=env.clickImport();
  assert.equal(env.importButton.disabled,true,'Button disabled while browser is reading the file');
  await env.clickImport();
  assert.equal(reads,1,'Rapid repeated clicks must not start a second read');
  const next=testFile([makeLedgerEntry({...base,source:'Second file'},3)]);
  env.selectFile(next);
  assert.equal(env.importButton.disabled,true,'Changing selection during a pending read does not enable re-entrant import');
  resolveText(await testFile(entries).text());
  await first;
  assert.equal(env.records.children.length,0,'Old selection must not restore anything');
  assert.match(env.status.textContent,/File selection changed/);
  assert.equal(env.importButton.disabled,false,'After stale read, the new selected file can be imported');
  await env.clickImport();
  assert.equal(env.records.children.length,1);
  assert.equal(env.records.children[0].children[0].textContent,'R003 · CONTRADICTED');
});


test('destructive clear requires approval and does not erase a stored row or unfinished draft when cancelled',()=>{
  let approve=false;
  const env=createInteractiveLedger(()=>approve);
  env.submit(base);
  env.source.value='Work in progress';
  env.claim.value='Unsaved claim';
  env.clear.events.click();
  assert.equal(env.confirmations,1);
  assert.equal(env.records.children.length,1);
  assert.equal(env.source.value,'Work in progress');
  assert.equal(env.claim.value,'Unsaved claim');
  assert.match(env.status.textContent,/Clear cancelled/);
  approve=true;
  env.clear.events.click();
  assert.equal(env.confirmations,2);
  assert.equal(env.records.children.length,0);
  assert.equal(env.source.value,'');
  assert.equal(env.claim.value,'');
  assert.match(env.status.textContent,/All rows and unfinished input fields cleared/);
});

test('editing another review does not silently destroy an unfinished form draft',()=>{
  let approve=false;
  const env=createInteractiveLedger(()=>approve);
  env.submit(base);
  env.source.value='Unfinished source';
  env.claim.value='Draft to preserve';
  const edit=env.records.children[0].children[4];
  assert.equal(edit.textContent,'Edit R001');
  edit.events.click();
  assert.equal(env.confirmations,1);
  assert.equal(env.source.value,'Unfinished source');
  assert.equal(env.claim.value,'Draft to preserve');
  assert.equal(env.save.textContent,'Add reviewed claim');
  assert.equal(env.records.children[0].children[0].textContent,'R001 · CONTRADICTED');
  approve=true;
  edit.events.click();
  assert.equal(env.confirmations,2);
  assert.equal(env.source.value,base.source);
  assert.equal(env.claim.value,base.claim);
  assert.equal(env.save.textContent,'Save revised claim R001');
});

test('removing one reviewed claim requires consent and preserves the form draft if refused',()=>{
  let approve=false;
  const env=createInteractiveLedger(()=>approve);
  env.submit(base);
  env.source.value='Draft source';
  const remove=env.records.children[0].children[5];
  assert.equal(remove.textContent,'Remove R001');
  remove.events.click();
  assert.equal(env.confirmations,1);
  assert.equal(env.records.children.length,1);
  assert.equal(env.source.value,'Draft source');
  assert.match(env.status.textContent,/Removal cancelled/);
  approve=true;
  remove.events.click();
  assert.equal(env.confirmations,2);
  assert.equal(env.records.children.length,0);
  assert.equal(env.source.value,'Draft source','Unrelated unfinished form fields remain untouched');
  assert.match(env.status.textContent,/R001 removed/);
});

test('empty worksheet may be cleared without nuisance confirmation',()=>{
  const env=createInteractiveLedger(()=>false);
  env.clear.events.click();
  assert.equal(env.confirmations,0);
  assert.match(env.status.textContent,/All rows and unfinished input fields cleared/);
});
