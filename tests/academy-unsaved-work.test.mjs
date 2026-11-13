import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load() {
 const windowEvents = new Map(), documentEvents = new Map(), states = [];
 let cleanup, confirms = 0;
 class Anchor { constructor(href) { this.href = href; this.target = ""; } hasAttribute() { return false; } }
 const module = {exports:{}};
 const source = ts.transpileModule(fs.readFileSync("modules/academy/components/useUnsavedWork.ts", "utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const navigator = {onLine:true};
 vm.runInNewContext(source, {module,exports:module.exports,URL,HTMLAnchorElement:Anchor,navigator,
  location:{pathname:"/academy/materi",search:""},
  window:{addEventListener:(k,v)=>windowEvents.set(k,v),removeEventListener:k=>windowEvents.delete(k),confirm:()=>{confirms++;return false;}},
  document:{addEventListener:(k,v)=>documentEvents.set(k,v),removeEventListener:k=>documentEvents.delete(k)},
  require(name) { assert.equal(name,"react"); return {useRef:value=>({current:value}),useState:value=>[value,next=>states.push(next)],useCallback:fn=>fn,useEffect:fn=>{cleanup=fn();}}; }
 });
 const work = module.exports.useUnsavedWork();
 const event = (target={}) => ({target,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}});
 return {work,event,windowEvents,documentEvents,navigator,states,cleanup:()=>cleanup(),confirms:()=>confirms,Anchor};
}
test("dirty work prevents reload and accidental reset until a successful save",()=>{
 const x=load(); const clean=x.event();x.windowEvents.get("beforeunload")(clean);assert.equal(clean.prevented,false);
 x.work.markChanged();const dirty=x.event();x.windowEvents.get("beforeunload")(dirty);assert.equal(dirty.prevented,true);
 const reset=x.event();x.work.preventDraftReset(reset);assert.equal(reset.prevented,true);
 x.work.markSaved();const saved=x.event();x.windowEvents.get("beforeunload")(saved);assert.equal(saved.prevented,false);
});
test("links and logout respect cancelled confirmation while submitting own form remains allowed",()=>{
 const x=load();const form={};x.work.markChanged({currentTarget:form});
 const own=x.event(form);x.documentEvents.get("submit")(own);assert.equal(own.prevented,false);
 const foreign=x.event({});x.documentEvents.get("submit")(foreign);assert.equal(foreign.prevented,true);
 const anchor=new x.Anchor("https://academy.test/academy/kuis");
 const link=x.event({closest:selector=>selector==="a[href]"?anchor:null});x.documentEvents.get("click")(link);assert.equal(link.prevented,true);
 const logout=x.event({closest:()=>({})});x.documentEvents.get("click")(logout);assert.equal(logout.prevented,true);
 assert.equal(x.confirms(),3);
});
test("network feedback follows connectivity and listeners are removed on unmount",()=>{
 const x=load();x.navigator.onLine=false;x.windowEvents.get("offline")();assert.equal(x.states.at(-1),true);
 x.navigator.onLine=true;x.windowEvents.get("online")();assert.equal(x.states.at(-1),false);
 x.cleanup();assert.equal(x.windowEvents.size,0);assert.equal(x.documentEvents.size,0);
});

test("a response for an older submission does not clear newer unsaved edits",()=>{
 const x=load();x.work.markChanged();const version=x.work.snapshot();x.work.markChanged();x.work.markSaved(version);
 const event=x.event();x.windowEvents.get("beforeunload")(event);assert.equal(event.prevented,true);
 x.work.markSaved(x.work.snapshot());const saved=x.event();x.windowEvents.get("beforeunload")(saved);assert.equal(saved.prevented,false);
});
