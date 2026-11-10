import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const require=createRequire(import.meta.url),ts=require('typescript');
test('photo rotation controls cannot submit the surrounding survey form on the first click',()=>{
 const state=[];let cursor=0;const body={},jsx=(type,props)=>({type,props});
 const context={exports:{},document:{body},require:id=>{
  if(id==='react')return {useState:initial=>{const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],v=>state[i]=typeof v==='function'?v(state[i]):v];}};
  if(id==='react-dom')return {createPortal:(child,target)=>({child,target})};
  if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(id==='./ui')return {Button:'button',Dialog:'dialog'};
  return {default:{}};
 }};
 vm.runInNewContext(ts.transpileModule(readFileSync('modules/bantuan/components/PhotoViewer.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
 const render=()=>{cursor=0;return context.exports.PhotoViewer({src:'/private/photo',title:'Foto survei',onClose(){}});};
 const first=render();assert.equal(first.target,body);
 const buttons=first.child.props.children[0].props.children;
 for(const button of buttons)assert.equal(button.props.type,'button');
 buttons[1].props.onClick();assert.equal(state[0],90);
 buttons[0].props.onClick();assert.equal(state[0],0);
 buttons[0].props.onClick();assert.equal(state[0],-90);
 render().child.props.children[0].props.children[2].props.onClick();assert.equal(state[0],0);
});
