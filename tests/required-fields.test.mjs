import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const sandbox={exports:{},require:id=>id==='./RupiahNumberInput'?{RupiahNumberInput:()=>null}:id==='@/lib/utils'?{cn:(...values)=>values.filter(Boolean).join(' ')}:require(id)};
vm.runInNewContext(ts.transpileModule(readFileSync('components/ui/FormField.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
const {FormField,Input,Select}=sandbox.exports;
const html=(props,child)=>renderToStaticMarkup(React.createElement(FormField,{label:'Nama',htmlFor:'nama',...props},child));
test('required inputs, selects and nested controls get one visible marker; optional controls get none',()=>{
 for(const child of [React.createElement(Input,{id:'nama',required:true}),React.createElement(Select,{id:'nama',required:true},React.createElement('option',null,'Pilihan')),React.createElement('div',null,React.createElement('textarea',{id:'nama',required:true}))]){
  const output=html({},child);assert.match(output,/aria-hidden="true"[^>]*>\*<\/span>/);assert.equal(output.match(/>\*<\/span>/g)?.length,1);
 }
 assert.doesNotMatch(html({},React.createElement(Input,{id:'nama'})),/>\*</);
 assert.doesNotMatch(html({required:false},React.createElement(Input,{id:'nama',required:false})),/>\*</);
 assert.match(html({required:true},React.createElement('input',{id:'nama'})),/>\*</);
 assert.equal((html({label:'Nama *',required:true},React.createElement('input',{id:'nama'})).match(/\*/g)||[]).length,1);
});
