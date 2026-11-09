import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
const require=createRequire(import.meta.url),ts=require("typescript");
function setup(failure=false){
  const state=[],calls=[],portals=[];let cursor=0;
  const body={name:"body"},jsx=(type,props)=>({type,props});
  const context={exports:{},Error,document:{body},window:{location:{assign(){}}},require:id=>{
    if(id==="react")return {useState:initial=>{const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],next=>state[i]=typeof next==="function"?next(state[i]):next];}};
    if(id==="react-dom")return {createPortal:(child,target)=>{const value={type:"portal",child,target};portals.push(value);return value;}};
    if(id==="react/jsx-runtime")return {jsx,jsxs:jsx};
    if(id==="./ui")return {Dialog:"dialog"};
    if(id.includes("contracts"))return {bantuanRoles:{approver:"Approver",chair:"Ketua Yayasan"}};
    if(id.includes("permissions"))return {hasAnyRole:()=>true};
    if(id.includes("api/client"))return {request:async(url,options)=>{calls.push({url,options});if(failure)throw Error("Tidak dapat memuat petugas");return options?{task:"Review awal",recipients:[{id:"a1",name:"Penyetuju",url:"https://wa.me/628123"}]}:{task:"Review awal",recipients:[{id:"a1",name:"Penyetuju",role:"approver",current:true,hasWhatsapp:true}]};}};
    if(id==="lucide-react")return {Bell:"bell",LoaderCircle:"loader",ExternalLink:"external"};
    return {default:{}};
  }};
  vm.runInNewContext(ts.transpileModule(readFileSync("modules/bantuan/components/ApplicationReminder.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
  return {calls,portals,body,render(){cursor=0;return context.exports.ApplicationReminder({row:{id:"r1",name:"Pemohon",number:"BNT-TEST",status:"review1"},viewer:{role:"call_center"}});}};
}
function find(tree,predicate){if(!tree||typeof tree!=="object")return null;if(predicate(tree))return tree;for(const child of [tree.props?.children].flat(Infinity)){const value=find(child,predicate);if(value)return value;}return null;}
test("recipient choices and successful result are portaled outside the table, and cancel closes them",async()=>{
  const h=setup();let root=h.render();await root.props.children[0].props.onClick();root=h.render();
  let portal=h.portals.at(-1);assert.equal(portal.target,h.body);assert.equal(portal.child.type,"dialog");assert.equal(portal.child.props.title,"Pilih penerima pengingat");
  assert.equal(find(root,n=>n.type==="textarea"),null,"No textarea can stretch the table row");
  assert.ok(find(portal.child,n=>n.type==="textarea"));
  await find(portal.child,n=>n.type==="button"&&typeof n.props.children==="string"&&n.props.children.startsWith("Siapkan pesan")).props.onClick();
  h.render();portal=h.portals.at(-1);assert.equal(portal.child.props.title,"Pengingat siap dikirim");assert.ok(find(portal.child,n=>n.type==="a"&&n.props.href==="https://wa.me/628123"));
  const sent=JSON.parse(h.calls[1].options.body);assert.deepEqual(sent.recipientIds,["a1"]);assert.equal(sent.status,"review1");
  portal.child.props.onClose();root=h.render();assert.ok(!root.props.children[1]);
});
test("loading errors use the same popup instead of expanding the row",async()=>{
  const h=setup(true);await h.render().props.children[0].props.onClick();const root=h.render();
  assert.equal(find(root,n=>n.props?.role==="alert"),null);
  const portal=h.portals.at(-1);assert.equal(portal.target,h.body);assert.equal(find(portal.child,n=>n.props?.role==="alert").props.children,"Tidak dapat memuat petugas");
});
