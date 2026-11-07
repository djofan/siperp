import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
const require=createRequire(import.meta.url),ts=require("typescript");
async function clickReminder({status="survey_assigned",people=[{id:"v1",name:"Suparta",role:"verifier",current:true,hasWhatsapp:true}],failure=false}={}){
  const calls=[],redirects=[],state=[];
  const jsx=(type,props)=>({type,props});
  const context={exports:{},window:{location:{assign:url=>redirects.push(url)}},require:id=>{
    if(id==="react")return {useState:value=>{const i=state.length;state.push(value);return [value,next=>{state[i]=next;}];}};
    if(id==="react/jsx-runtime")return {jsx,jsxs:jsx};
    if(id==="lucide-react")return {Bell:"bell",LoaderCircle:"loader",ExternalLink:"external"};
    if(id.includes("contracts"))return {bantuanRoles:{}};
    if(id.includes("permissions"))return {hasAnyRole:()=>true};
    if(id.includes("api/client"))return {request:async(path,options)=>{calls.push({path,options});if(failure)throw new Error("Gagal memuat");return options?{recipients:[{id:"v1",url:"https://wa.me/628123?text=pesan"}]}:{task:"Survei",recipients:people};}};
    return {default:{}};
  }};
  vm.runInNewContext(ts.transpileModule(readFileSync("modules/bantuan/components/ApplicationReminder.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,context);
  const tree=context.exports.ApplicationReminder({row:{id:"a1",name:"Pemohon",status},viewer:{role:"call_center"}});
  await tree.props.children[0].props.onClick();
  return {calls,redirects,state};
}
test("one assigned recipient opens WhatsApp with prepared message directly",async()=>{
  const {calls,redirects}=await clickReminder();assert.equal(calls.length,2);assert.equal(calls[1].options.method,"POST");assert.deepEqual(JSON.parse(calls[1].options.body).recipientIds,["v1"]);assert.deepEqual(redirects,["https://wa.me/628123?text=pesan"]);
});
test("approval stages keep the recipient choice without preparing notifications",async()=>{
  for(const status of ["review1","survey_submitted","review2","bypass_review"]){const {calls,redirects}=await clickReminder({status});assert.equal(calls.length,1);assert.equal(redirects.length,0);}
});
test("missing number or failed request never redirects or posts reminder",async()=>{
  for(const input of [{people:[{id:"v1",name:"Suparta",role:"verifier",current:true,hasWhatsapp:false}]},{failure:true}]){const {calls,redirects,state}=await clickReminder(input);assert.equal(calls.length,1);assert.equal(redirects.length,0);assert.ok(state[1]);}
});
test("multiple current contacts are not selected arbitrarily",async()=>{
  const {calls,redirects}=await clickReminder({people:[{id:"v1",current:true,hasWhatsapp:true},{id:"v2",current:true,hasWhatsapp:true}]});assert.equal(calls.length,1);assert.equal(redirects.length,0);
});
