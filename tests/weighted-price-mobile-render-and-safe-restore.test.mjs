import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {auditWeightedPriceCsv} from '../src/lib/weighted-price.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('src/pages/tools/weighted-price-checker.astro');
const css=read('src/styles/global.css');
const example=read('public/examples/weighted-price-sample.csv').trimEnd();

function fakeElement(tag) {
  return {
    tagName:tag,textContent:'',className:'',id:'',tabIndex:-1,scope:'',
    children:[],attributes:{},
    append(...nodes){this.children.push(...nodes);},
    replaceChildren(...nodes){this.children=nodes;},
    setAttribute(name,value){this.attributes[name]=value;},
    createTHead(){
      const thead=fakeElement('thead');
      thead.insertRow=()=>{const tr=fakeElement('tr');thead.append(tr);return tr;};
      this.append(thead);return thead;
    },
    createTBody(){
      const tbody=fakeElement('tbody');
      tbody.insertRow=()=>{const tr=fakeElement('tr');tr.insertCell=()=>{const td=fakeElement('td');tr.append(td);return td;};tbody.append(tr);return tr;};
      this.append(tbody);return tbody;
    },
  };
}

function runningPage(confirmInitially=false) {
  const input=fakeElement('textarea'); input.value=example;input.events={};input.addEventListener=(name,fn)=>input.events[name]=fn;
  const form=fakeElement('form');form.events={};form.addEventListener=(name,fn)=>form.events[name]=fn;
  const status=fakeElement('p'),summary=fakeElement('p'),result=fakeElement('div');
  summary.textContent='Calculation not run yet.';
  const calculate=fakeElement('button'),restore=fakeElement('button');
  calculate.disabled=true;restore.disabled=true;restore.events={};
  restore.addEventListener=(name,fn)=>restore.events[name]=fn;
  const nodeMap={
    '#weighted-price-form':form,'#weighted-price-csv':input,'#weighted-price-status':status,
    '#weighted-price-summary':summary,'#weighted-price-results':result,
    '#calculate-weighted-price':calculate,'#reset-weighted-price':restore,
  };
  let approve=confirmInitially,confirmations=0;
  const sandbox={
    exports:{},Error,
    require(id){assert.equal(id,'../../lib/weighted-price');return {auditWeightedPriceCsv};},
    document:{
      querySelector:selector=>nodeMap[selector]??null,
      createElement:fakeElement,
      createTextNode:text=>({textContent:text}),
    },
    window:{confirm(message){confirmations++;assert.match(message,/replaces your current CSV text/);return approve;}},
  };
  const source=page.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert(source,'The weighted-audit client script should be available in its real Astro page');
  const compiled=ts.transpileModule(source,{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  vm.runInNewContext(compiled,sandbox,{filename:'weighted-audit-client.js'});
  return {
    input,form,status,summary,result,calculate,restore,
    get confirmations(){return confirmations;},
    approveNext(value){approve=value;},
    enter(text){input.value=text;input.events.input();},
    calculateNow(){let prevented=false;form.events.submit({preventDefault(){prevented=true;}});assert(prevented);},
    restoreSample(){restore.events.click();}
  };
}

test('production weighted-price script renders both real reconciled tables inside focusable named scroll regions',()=>{
  const env=runningPage();
  assert.equal(env.calculate.disabled,false);
  assert.equal(env.restore.disabled,false);
  env.calculateNow();
  assert.match(env.summary.textContent,/8 rows · 27 units · 530.00 revenue · 19.63 revenue per unit/);
  assert.equal(env.result.children.length,6,'three summaries plus two headings and two scroll regions, as actual DOM children');
  const regions=env.result.children.filter(node=>node.className==='audit-table-scroll');
  assert.equal(regions.length,2);
  const headings=env.result.children.filter(node=>node.tagName==='h3');
  assert.equal(headings.length,2);
  for(const [index,region] of regions.entries()){
    assert.equal(region.tabIndex,0);
    assert.equal(region.attributes.role,'region');
    assert.equal(region.attributes['aria-labelledby'],headings[index].id);
    assert.equal(region.children[0].tagName,'table');
    assert(region.children[0].children.some(part=>part.tagName==='thead'));
    assert(region.children[0].children.some(part=>part.tagName==='tbody'));
  }
  const rowBody=regions[1].children[0].children[1];
  assert.equal(rowBody.children.length,8);
  assert.equal(rowBody.children[0].children.length,5);
  assert.equal(rowBody.children[0].children[0].textContent,'L-101');
  assert.equal(rowBody.children[0].children[4].textContent,'100.00');
});

test('a custom CSV is preserved if the visitor declines to restore the example',()=>{
  const env=runningPage(false);
  env.calculateNow();
  const edited=example.replace('L-102,Web,4,25','L-102,Web,40,25');
  env.enter(edited);
  assert.match(env.summary.textContent,/Not calculated for the current CSV/);
  env.calculateNow();
  assert.match(env.summary.textContent,/63 units · 1,430.00 revenue/);
  const oldResults=env.result.children;
  const oldSummary=env.summary.textContent;
  env.restoreSample();
  assert.equal(env.confirmations,1);
  assert.equal(env.input.value,edited);
  assert.equal(env.summary.textContent,oldSummary);
  assert.equal(env.result.children,oldResults,'Declining restore must not erase or recalculate current results');
  assert.match(env.status.textContent,/Restore cancelled/);
  env.approveNext(true);
  env.restoreSample();
  assert.equal(env.confirmations,2);
  assert.equal(env.input.value,example);
  assert.equal(env.summary.textContent,'Calculation not run yet.');
  assert.equal(env.result.children.length,0);
});

test('empty input and unchanged example restore without an unnecessary confirmation',()=>{
  const env=runningPage(false);
  env.restoreSample();
  assert.equal(env.confirmations,0);
  assert.equal(env.input.value,example);
  env.enter('');
  env.restoreSample();
  assert.equal(env.confirmations,0);
  assert.equal(env.input.value,example);
});

test('custom channel and line values are rendered as text cells, not HTML',()=>{
  const env=runningPage();
  env.enter('LineID,Channel,Units,UnitPrice\n"<img src=x onerror=alert(1)>","<script>not executed</script>",3,0.10');
  env.calculateNow();
  assert.match(env.summary.textContent,/3 units · 0.30 revenue/);
  const regions=env.result.children.filter(node=>node.className==='audit-table-scroll');
  assert.equal(regions.length,2);
  const channel=regions[0].children[0].children[1].children[0].children[0];
  const rowLine=regions[1].children[0].children[1].children[0].children[0];
  assert.equal(channel.textContent,'<script>not executed</script>');
  assert.equal(rowLine.textContent,'<img src=x onerror=alert(1)>');
  assert.equal(channel.children.length,0);
  assert.equal(rowLine.children.length,0);
});

test('mobile styles protect the audit grid and permit tab-accessible horizontal scrolling',()=>{
  assert.match(css,/\.tool-workspace\{grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)\}/);
  assert.match(css,/\.tool-form,\.tool-output\{min-width:0\}/);
  assert.match(css,/\.audit-table-scroll\{[^}]*overflow-x:auto/);
  assert.match(css,/\.audit-table-scroll:focus-visible\{outline:/);
  assert.match(css,/@media\(max-width:800px\)\{\.tool-workspace\{grid-template-columns:minmax\(0,1fr\)\}\}/);
  assert(page.includes('Both result tables are keyboard-focusable scroll regions'));
  assert(page.includes('Restoring the example asks for confirmation'));
  assert(page.includes('id="calculate-weighted-price" disabled'));
  assert(page.includes('id="reset-weighted-price" disabled'));
});
