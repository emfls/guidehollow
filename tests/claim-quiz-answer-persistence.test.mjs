import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseClaimCases,scoreClaimCases,VERDICTS,PRACTICE_IDS} from '../src/lib/claim-audit.ts';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const cases=parseClaimCases(read('public/examples/claim-boundary-audit.csv'));

function element(tag) {
  const node={
    tagName:tag,children:[],events:{},attributes:{},textContent:'',disabled:false,
    append(...items){this.children.push(...items);},
    replaceChildren(...items){this.children=items;},
    addEventListener(type,fn){this.events[type]=fn;},
    setAttribute(key,value){this.attributes[key]=value;},
    focus(){this.focused=true;},
    scrollIntoView(){this.scrolled=true;},
    querySelectorAll(selector){
      const nodes=[];
      const visit=n=>{
        if(n.tagName==='input'&&n.type==='radio')nodes.push(n);
        for(const child of n.children??[])visit(child);
      };
      visit(this);
      if(selector==='input[type="radio"]:checked')return nodes.filter(n=>n.checked);
      throw new Error('Unrecognized querySelectorAll: '+selector);
    },
    querySelector(selector){
      const name=selector.match(/^input\[name="([^"]+)"\]$/)?.[1];
      if(!name)throw new Error('Unrecognized querySelector: '+selector);
      return this.querySelectorAll('input[type="radio"]:checked').find(n=>n.name===name)
        ?? (()=>{const all=[];const visit=n=>{if(n.tagName==='input'&&n.name===name)all.push(n);for(const child of n.children??[])visit(child);};visit(this);return all[0]??null;})();
    },
  };
  return node;
}

async function quiz({approve=false,failFetch=false}={}) {
  const form=element('form'),questions=element('div'),status=element('p'),feedback=element('div');
  const sourcePanel=element('pre'),choice=element('select'),submit=element('button'),reset=element('button');
  choice.value='sample';submit.disabled=true;reset.disabled=true;choice.disabled=true;
  const nodes={
    '#claim-audit-form':form,'#claim-audit-questions':questions,'#claim-audit-status':status,
    '#claim-audit-results':feedback,'#claim-source-notes':sourcePanel,
    '#claim-audit-length':choice,'#claim-audit-submit':submit,'#claim-audit-reset':reset,
  };
  let confirmations=0,fetchCount=0,allow=approve;
  const formData=class {
    constructor(){this.values=new Map(questions.querySelectorAll('input[type="radio"]:checked').map(n=>[n.name,n.value]));}
    has(name){return this.values.has(name);}
    get(name){return this.values.get(name)??null;}
  };
  const script=ts.transpileModule(read('src/scripts/claim-checker.ts'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  const sandbox={
    exports:{},Error,
    require(name){
      assert.equal(name,'../lib/claim-audit');
      return {parseClaimCases,scoreClaimCases,VERDICTS,PRACTICE_IDS};
    },
    document:{querySelector:selector=>nodes[selector]??null,createElement:element,
      createTextNode:text=>({textContent:text})},
    FormData:formData,
    window:{confirm(message){confirmations++;assert.match(message,/Clear all \d+ selected answer/);return allow;}},
    fetch:async url=>{
      fetchCount++;assert.equal(url,'/examples/claim-boundary-audit.csv');
      return {ok:!failFetch,text:async()=>read('public/examples/claim-boundary-audit.csv')};
    },
  };
  vm.runInNewContext(script,sandbox,{filename:'claim-quiz-controller.js'});
  await new Promise(done=>setImmediate(done));
  const inputs=()=>questions.querySelectorAll('input[type="radio"]:checked');
  return {
    form,questions,status,feedback,choice,submit,reset,sourcePanel,
    get confirmations(){return confirmations;},get fetchCount(){return fetchCount;},
    approveNext(value){allow=value;},
    currentChoices(){return Object.fromEntries(inputs().map(node=>[node.name,node.value]));},
    select(id,value){
      const candidates=[];const visit=node=>{
        if(node.tagName==='input'&&node.name===id)candidates.push(node);
        for(const child of node.children??[])visit(child);
      };visit(questions);
      assert.equal(candidates.length,3,'This case must exist in current selection: '+id);
      for(const n of candidates)n.checked=(n.value===value);
      form.events.change();
    },
    switchTo(value){choice.value=value;choice.events.change();},
    grade(){
      let prevented=false;
      form.events.submit({preventDefault(){prevented=true;}});
      assert(prevented,'Grade must never submit the page');
    },
    startOver(){reset.events.click();},
  };
}

test('the compiled quiz controller retains selected five-case answers when expanding to all 22 and returning',async()=>{
  const env=await quiz();
  assert.equal(env.fetchCount,1);
  assert.equal(env.choice.disabled,false);
  assert.equal(env.submit.disabled,false);
  assert.equal(env.reset.disabled,false);
  env.select('G04','SUPPORTED');
  env.select('R02','CONTRADICTED');
  assert.match(env.status.textContent,/2 of 5 claims answered/);
  env.switchTo('all');
  assert.equal(env.questions.children.length,22);
  assert.equal(env.currentChoices().G04,'SUPPORTED');
  assert.equal(env.currentChoices().R02,'CONTRADICTED');
  assert.match(env.status.textContent,/2 of 22 claims answered/);
  env.select('G01','UNSUPPORTED');
  env.switchTo('sample');
  assert.equal(env.questions.children.length,5);
  assert.equal(env.currentChoices().G04,'SUPPORTED');
  env.switchTo('all');
  assert.equal(env.currentChoices().G01,'UNSUPPORTED','Answers hidden in the five-case view persist in the all-case view');
  assert.equal(env.currentChoices().G04,'SUPPORTED');
  assert.equal(env.confirmations,0,'Changing practice set is non-destructive and should not ask for confirmation');
});

test('editing answers invalidates any previous scoring while keeping other answers',async()=>{
  const env=await quiz();
  for(const id of PRACTICE_IDS)env.select(id,cases.find(x=>x.id===id).expected);
  assert.match(env.status.textContent,/5 of 5 claims answered/);
  env.grade();
  assert.equal(env.feedback.children.length,3);
  assert.match(env.status.textContent,/5\/5 labels matched/);
  env.select('G04','SUPPORTED');
  assert.equal(env.feedback.children.length,0,'A changed answer removes stale scoring');
  assert.equal(env.currentChoices().G06,cases.find(x=>x.id==='G06').expected);
  env.grade();
  assert.match(env.status.textContent,/4\/5 labels matched/);
  env.switchTo('all');
  assert.equal(env.feedback.children.length,0);
  env.switchTo('sample');
  assert.equal(env.currentChoices().G04,'SUPPORTED','Changed answers must stay changed across set switches');
});

test('Try again cancel preserves all answers and scored explanations; confirmed reset clears hidden answers too',async()=>{
  const env=await quiz();
  for(const id of PRACTICE_IDS)env.select(id,cases.find(x=>x.id===id).expected);
  env.grade();
  const scored=env.feedback.children;
  env.switchTo('all');
  env.select('G01','SUPPORTED');
  env.switchTo('sample');
  env.grade();
  const stableFeedback=env.feedback.children;
  env.startOver();
  assert.equal(env.confirmations,1);
  assert.equal(env.feedback.children,stableFeedback,'Cancelled reset may not erase scored feedback');
  assert.equal(env.currentChoices().G04,cases.find(x=>x.id==='G04').expected);
  assert.match(env.status.textContent,/Reset cancelled/);
  env.approveNext(true);
  env.startOver();
  assert.equal(env.confirmations,2);
  assert.deepEqual(env.currentChoices(),{});
  assert.equal(env.feedback.children.length,0);
  assert.match(env.status.textContent,/0 of 5 claims answered/);
  env.switchTo('all');
  assert.deepEqual(env.currentChoices(),{},'Hidden 22-case choices must also be cleared on intentional reset');
  assert.match(env.status.textContent,/0 of 22 claims answered/);
  env.startOver();
  assert.equal(env.confirmations,2,'Empty set reset needs no confirmation');
  assert.equal(scored.length,3,'Reference-scoring UI remained available before clearing');
});

test('question fetch failure keeps original source and never enables dead controls',async()=>{
  const env=await quiz({failFetch:true});
  assert.equal(env.choice.disabled,true);
  assert.equal(env.submit.disabled,true);
  assert.equal(env.reset.disabled,true);
  assert.match(env.status.textContent,/original source notes above are still readable/);
  assert.equal(env.sourcePanel.textContent,'');
  assert.equal(env.fetchCount,1);
});

test('the public tool explains cross-view persistence and explicit reset consent',()=>{
  const ui=read('src/pages/tools/claim-checker.astro');
  const controller=read('src/scripts/claim-checker.ts');
  assert(ui.includes('Your selected answers stay in this browser tab'));
  assert(ui.includes('“Try again” clears answers in both sets only after you confirm'));
  assert(ui.includes('id="claim-audit-reset" disabled>Try again — clear answers'));
  assert(controller.includes('const savedAnswers = new Map<string, ClaimVerdict>()'));
  assert(controller.includes('rememberVisibleAnswers()'));
  assert(controller.includes('savedAnswers.clear()'));
  assert(controller.includes('render(false)'));
  assert(!controller.includes('localStorage'));
  assert(!controller.includes('sessionStorage'));
  assert(!controller.includes('innerHTML'));
});
