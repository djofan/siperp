import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
import test from "node:test";
const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function harness(fetch){
 const state=[];let cursor=0,refreshes=0;
 const load=(file,imports)=>{const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,fetch,Intl,require:id=>imports[id]??require(id)});return exports;};
 const problem=load('lib/api-problem.ts',{});
 const component=load('modules/lazsip/components/admin/CampaignHistoryPanel.tsx',{
  react:{...React,useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],v=>{state[i]=v;}];}},
  'next/navigation':{useRouter:()=>({refresh(){refreshes++;}})},'@/lib/api-problem':problem,
  '@/lib/utils':{cn:(...values)=>values.filter(Boolean).join(' ')},'@/components/ui/panel':{panelClasses:v=>v},
  '@/modules/lazsip/components/admin/LoadingButton':{LoadingButton:({children,loading,...props})=>React.createElement('button',{...props,disabled:loading},children)},
 }).CampaignHistoryPanel;
 const render=()=>{cursor=0;return component({campaignId:'campaign',currentAmount:0,targetAmount:1000,history:[]});};
 return {state,render,get refreshes(){return refreshes;}};
}
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}return null;}
test('structured API rejections stay readable inside the manual balance form without losing inputs',async()=>{
 const h=harness(async()=>({ok:false,status:422,json:async()=>({error:{message:'Isi nomor WhatsApp atau email yang valid.',code:'VALIDATION_FAILED',requestId:'diagnostic-test'}})}));
 h.render();h.state[1]='500000';h.state[3]='Donatur pengujian';
 await find(h.render(),node=>node.type==='form').props.onSubmit({preventDefault(){}});
 const html=renderToStaticMarkup(h.render());assert.match(html,/role="alert"/);assert.match(html,/Isi nomor WhatsApp atau email yang valid/);assert.match(html,/diagnostic-test/);assert.equal(h.state[1],'500000');assert.equal(h.state[3],'Donatur pengujian');assert.equal(h.refreshes,0);
});
test('failed connections release the save button and tell users to verify history before retrying',async()=>{
 const h=harness(async()=>{throw new Error('offline');});h.render();h.state[1]='500000';await find(h.render(),node=>node.type==='form').props.onSubmit({preventDefault(){}});
 const html=renderToStaticMarkup(h.render());assert.match(html,/Periksa riwayat dan saldo/);assert.equal(h.state[6],false);assert.equal(h.state[1],'500000');assert.equal(h.refreshes,0);
});
test('successful manual recording refreshes only after server success',async()=>{
 let input;const h=harness(async(_url,options)=>{input=JSON.parse(options.body);return{ok:true};});h.render();h.state[1]='500000';h.state[3]='Donatur pengujian';await find(h.render(),node=>node.type==='form').props.onSubmit({preventDefault(){}});assert.equal(input.amount,500000);assert.equal(h.refreshes,1);assert.equal(h.state[1],'');
});
