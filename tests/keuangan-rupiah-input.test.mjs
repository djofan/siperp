import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { formatRupiahInput, parseRupiahInput } from '../modules/keuangan/rupiah-input.ts';
const require=createRequire(import.meta.url), React=require('react');

test('rupiah inputs group whole-rupiah strings without losing large imported digits',()=>{
  assert.equal(formatRupiahInput('4000000'),'4.000.000');
  assert.equal(formatRupiahInput('9007199254740993'),'9.007.199.254.740.993');
  for(const value of ['4000000','4.000.000','Rp 4.000.000'])assert.equal(parseRupiahInput(value),'4000000');
  assert.equal(parseRupiahInput('0004000'),'4000');
  assert.equal(parseRupiahInput(''),'');
});
test('decimal ambiguous and scientific pastes are rejected rather than silently changing the amount',()=>{
  for(const value of ['4,5','4.5','1.000,50','4,000,000','-1000','1e6','Rp nope','4.00.000'])assert.equal(parseRupiahInput(value),null,value);
});
function harness(defaultValue=''){
 const state=[],effects=[];let cursor=0;
 const hooks={...React,useState(initial){const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return [state[i],value=>{state[i]=value;}];},useRef:()=>({current:null}),useId:()=> 'money-hint',useEffect:fn=>effects.push(fn)};
 const mod={exports:{}};
 vm.runInNewContext(ts.transpileModule(readFileSync('modules/keuangan/components/RupiahInput.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:mod.exports,requestAnimationFrame:fn=>fn(),require:id=>id==='react'?hooks:id==='../rupiah-input'?{formatRupiahInput,parseRupiahInput}:require(id)});
 return {render(){cursor=0;const tree=mod.exports.RupiahInput({defaultValue});const children=tree.props.children.filter(x=>typeof x==='object');return {visible:children[0],hidden:children[1],hint:children[2]};}};
}
test('typing and pasting use a formatted visible field and a raw integer field for submission',()=>{
 const app=harness('4000000');let ui=app.render();
 assert.equal(ui.visible.props.value,'4.000.000');assert.equal(ui.hidden.props.name,'amount');assert.equal(ui.hidden.props.value,'4000000');
 ui.visible.props.onChange({currentTarget:{value:'40.000.000',selectionStart:10}});ui=app.render();assert.equal(ui.visible.props.value,'40.000.000');assert.equal(ui.hidden.props.value,'40000000');
 ui.visible.props.onPaste({preventDefault(){},clipboardData:{getData:()=> 'Rp 4.000.000'},currentTarget:{selectionStart:0,selectionEnd:ui.visible.props.value.length}});ui=app.render();assert.equal(ui.hidden.props.value,'4000000');assert.equal(ui.visible.props.value,'4.000.000');
 ui.visible.props.onPaste({preventDefault(){},clipboardData:{getData:()=> '4,5'},currentTarget:{selectionStart:0,selectionEnd:ui.visible.props.value.length}});ui=app.render();assert.equal(ui.hidden.props.value,'');assert.equal(ui.visible.props['aria-invalid'],true);assert.equal(ui.hint.props.role,'alert');
});
