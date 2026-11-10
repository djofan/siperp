import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(file,requireFn,extras={}){const context={exports:{},require:requireFn,...extras};vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);return context.exports;}
const stages=load('modules/bantuan/manual-process.ts',()=>({}));
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const result=find(child,predicate);if(result)return result;}return null;}
function setup(role='call_center'){
 const states=[],calls=[];let cursor=0,reloads=0;const jsx=(type,props)=>({type,props});
 const row={id:'case-1',name:'Pemohon',number:'BNT-TEST',status:'survey_assignment',version:7,applicant:{street:'Jalan Cempaka Bogor'},documents:[]};
 const component=load('modules/bantuan/components/ManualProcessPanel.tsx',id=>{
  if(id==='react')return {useEffect:()=>{},useRef:()=>({current:null}),useState:initial=>{const index=cursor++;if(!(index in states))states[index]=initial;return [states[index],v=>states[index]=typeof v==='function'?v(states[index]):v];}};
  if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(id==='../manual-process')return stages;
  if(id==='../permissions')return {rolesOf:p=>p.roles??[p.role],hasAnyRole:(p,roles)=>roles.includes(p.role)};
  if(id==='../api/client')return {RequestError:class extends Error{},request:async(path,options)=>{calls.push({path,payload:JSON.parse(options.body)});return {};}};
  if(id.includes('contracts'))return {bantuanStatuses:{survey_assignment:'Menunggu Verifikator'}};
  if(id==='./VerifierPicker')return {VerifierPicker:'picker'};
  if(id==='./IntakeForm')return {Fields:'fields',applicantFields:[]};
  return {default:{}};
 },{FormData:class{constructor(form){this.data=form.data;}get(key){return this.data[key]??null;}has(key){return key in this.data;}},requestAnimationFrame:fn=>fn(),Date});
 return {calls,row,get reloads(){return reloads;},render(){cursor=0;return component.ManualProcessPanel({row,viewer:{id:'cc',name:'Pencatat',role},staff:[],reload(){reloads++;}});}};
}
test('manual assignment works with zero verifier accounts and records the external actor separately',async()=>{
 const h=setup();find(h.render(),n=>n.type==='button').props.onClick();let tree=h.render();
 const picker=find(tree,n=>n.type==='picker');assert.equal(picker.props.required,false);assert.equal(picker.props.name,'actorId');
 assert.ok(find(tree,n=>n.type==='input'&&n.props.name==='actorName'));
 const form=find(tree,n=>n.type==='form');form.props.onSubmit({preventDefault(){},currentTarget:{reportValidity:()=>true,data:{actorName:'Suparta eksternal',actorPhone:'08123456789',channel:'telegram',date:'2026-11-10',note:'Laporan melalui Telegram',surveyAddress:'Jalan Cempaka Bogor'}}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.calls[0].path,'applications/case-1/manual-processes');assert.equal(h.calls[0].payload.version,7);assert.equal(h.calls[0].payload.manual.actorId,null);assert.equal(h.calls[0].payload.manual.name,'Suparta eksternal');assert.equal(h.calls[0].payload.action,'assign_survey');assert.equal(h.reloads,1);
 assert.equal(setup('verifier').render(),null);
});
test('available manual actions follow the current stage and stop after completion',()=>{
 assert.equal(stages.manualStages.survey_assigned[0].action,'survey_submit');assert.equal(stages.manualStages.survey_cc_review[0].action,'survey_review_submit');assert.equal(stages.manualStages.disbursed[0].action,'handover');assert.equal(stages.manualStages.completed,undefined);
});
