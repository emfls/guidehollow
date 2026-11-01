import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import {effectiveTheme,oppositeTheme,themeActionLabel} from '../src/lib/theme-controls.ts';

const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');

test('theme labels describe the next action under explicit and system preferences',()=>{
  assert.equal(effectiveTheme(undefined,true),'dark');
  assert.equal(effectiveTheme(undefined,false),'light');
  assert.equal(effectiveTheme('light',true),'light');
  assert.equal(effectiveTheme('dark',false),'dark');
  assert.equal(effectiveTheme('corrupt',true),'dark');
  assert.equal(oppositeTheme('dark'),'light');
  assert.equal(oppositeTheme('light'),'dark');
  assert.equal(themeActionLabel('dark'),'Switch to light theme');
  assert.equal(themeActionLabel('light'),'Switch to dark theme');
});

function createScriptEnvironment() {
  const classes = new Set();
  const root={dataset:{},classList:{add:(name)=>classes.add(name)}};
  let toggleClick,systemChange;
  const attrs=new Map();
  const toggle={
    title:'',
    setAttribute:(name,value)=>attrs.set(name,value),
    addEventListener:(name,fn)=>{if(name==='click')toggleClick=fn;},
  };
  const system={matches:true,addEventListener:(name,fn)=>{if(name==='change')systemChange=fn;}};
  const saved=[];
  const selected={range:null,cleared:false};
  const selection={
    removeAllRanges:()=>{selected.cleared=true;},
    addRange:(range)=>{selected.range=range;},
  };
  const range={selected:null,selectNodeContents(node){this.selected=node;}};
  let clipboardDenied=true;
  const clipboardText=[];
  const timers=new Map();let timerId=0;
  const fakeDocument={
    documentElement:root,
    querySelector:(selector)=>selector==='#theme-toggle'?toggle:null,
    querySelectorAll:()=>[],
    addEventListener:()=>{},
    createRange:()=>range,
  };
  const sandbox={
    exports:{},
    require:(id)=>{
      assert.equal(id,'../lib/theme-controls');
      return {effectiveTheme,oppositeTheme,themeActionLabel};
    },
    document:fakeDocument,
    window:{matchMedia:()=>system,getSelection:()=>selection},
    navigator:{clipboard:{writeText:async(text)=>{
      if(clipboardDenied)throw new Error('NotAllowedError');
      clipboardText.push(text);
    }}},
    localStorage:{setItem:(key,value)=>saved.push([key,value])},
    setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},
    clearTimeout:id=>timers.delete(id),
  };
  const script=ts.transpileModule(read('src/scripts/site.ts'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  vm.runInNewContext(script,sandbox,{filename:'site-controls-test.js'});
  return {
    root,classes,toggle,attrs,system,saved,selected,range,clipboardText,timers,
    clickTheme:()=>toggleClick?.(),
    changeSystem:()=>systemChange?.(),
    allowClipboard:()=>{clipboardDenied=false;},
    copyText:sandbox.exports.copyText,
  };
}

test('theme control starts with correct label and updates after clicks and system changes',()=>{
  const env=createScriptEnvironment();
  assert(env.classes.has('has-theme-control'));
  assert.equal(env.attrs.get('aria-label'),'Switch to light theme');
  assert.equal(env.toggle.title,'Switch to light theme');
  env.clickTheme();
  assert.equal(env.root.dataset.theme,'light');
  assert.equal(env.attrs.get('aria-label'),'Switch to dark theme');
  assert.equal(env.toggle.title,'Switch to dark theme');
  assert.equal(JSON.stringify(env.saved),JSON.stringify([['gh-theme','light']]));
  delete env.root.dataset.theme;
  env.system.matches=false;
  env.changeSystem();
  assert.equal(env.attrs.get('aria-label'),'Switch to dark theme');
  env.system.matches=true;
  env.changeSystem();
  assert.equal(env.attrs.get('aria-label'),'Switch to light theme');
});

test('copy permission failure selects code and a successful retry really writes text',async()=>{
  const env=createScriptEnvironment();
  const code={textContent:'SELECT * FROM fictional_table;'};
  const button={textContent:'Copy',parentElement:{querySelector:(selector)=>selector==='code'?code:null}};
  await env.copyText(code.textContent,button);
  assert.equal(env.range.selected,code,'Fallback must select the actual code');
  assert.equal(env.selected.range,env.range);
  assert.equal(env.selected.cleared,true);
  assert.equal(button.textContent,'Selected — press Ctrl/Cmd+C');
  assert.equal(env.clipboardText.length,0,'Do not falsely say Copied when clipboard was denied');
  env.allowClipboard();
  await env.copyText(code.textContent,button);
  assert.equal(button.textContent,'Copied');
  assert.equal(JSON.stringify(env.clipboardText),JSON.stringify([code.textContent]));
  assert.equal(env.timers.size,1);
  const [,timer]=[...env.timers][0];
  assert.equal(timer.ms,3000);
  timer.fn();
  assert.equal(button.textContent,'Copy');
});

test('disabled JavaScript does not leave an inert theme button visible',()=>{
  const css=read('src/styles/global.css');
  const layout=read('src/layouts/Base.astro');
  const script=read('src/scripts/site.ts');
  assert(css.includes('#theme-toggle{display:none}'));
  assert(css.includes('.has-theme-control #theme-toggle{display:inline-flex'));
  assert(script.indexOf("themeToggle.addEventListener('click'") < script.indexOf("classList.add('has-theme-control')"));
  assert(layout.includes('<kbd>Ctrl/⌘ K</kbd>'));
  assert(layout.includes('id="theme-toggle"'));
  assert(!layout.includes('has-theme-control'),'Server HTML must not advertise a theme interaction before JS wires it');
});
