import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require=createRequire(import.meta.url), React=require("react"), {renderToStaticMarkup}=require("react-dom/server");
const compile=file=>ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const helpers={exports:{}};vm.runInNewContext(compile("modules/academy/today-window.ts"),helpers);
const {currentActivity}=helpers.exports;
const item={id:"m1",title:"Materi berjalan",opensAt:"2026-12-06T10:00:00.000Z",closesAt:"2026-12-07T10:00:00.000Z",number:1};
const initial={serverNow:"2026-12-06T11:00:00.000Z",nextChangeAt:item.closesAt,material:item,exam:null};
function harness(){
  const state=[],effects=[],timers=[],calls=[];let cursor=0,elapsed=0;
  const hooks={...React,useState(value){const i=cursor++;if(!(i in state))state[i]=typeof value==="function"?value():value;return [state[i],value=>{state[i]=typeof value==="function"?value(state[i]):value;}];},useEffect(fn){effects.push(fn);}};
  const context={exports:{},performance:{now:()=>elapsed},AbortController,Date,Number,Math,
    setInterval:(fn,ms)=>{const timer={fn,ms};timers.push(timer);return timer;},clearInterval(){},
    setTimeout:(fn,ms)=>{const timer={fn,ms,boundary:true};timers.push(timer);return timer;},clearTimeout(){},
    document:{visibilityState:"visible",addEventListener(){},removeEventListener(){}},window:{addEventListener(){},removeEventListener(){}},
    fetch:async(...args)=>{calls.push(args);return {ok:false};},
    require(id){if(id==="react")return hooks;if(id==="../today-window")return helpers.exports;if(id.includes("AcademyNavigation"))return {__esModule:true,default:({children,...props})=>React.createElement("a",props,children)};return require(id);}};
  vm.runInNewContext(compile("modules/academy/components/TodayActivities.tsx"),context);
  return {state,effects,timers,calls,advance(ms){elapsed=ms;},render(feed=initial){cursor=0;return renderToStaticMarkup(context.exports.TodayActivities({initial:feed}));}};
}
test("dashboard windows include opening, exclude closing, and never expose upcoming or malformed items",()=>{
  assert.equal(currentActivity(item,Date.parse(item.opensAt)-1),null);
  assert.equal(currentActivity(item,Date.parse(item.opensAt)),item);
  assert.equal(currentActivity(item,Date.parse(item.closesAt)),null);
  assert.equal(currentActivity({...item,closesAt:"invalid"},Date.parse(initial.serverNow)),null);
});
test("dashboard displays the current single material and preserves links to full history",()=>{
  const h=harness(),html=h.render();
  assert.match(html,/Materi berjalan/);assert.match(html,/Semua materi/);assert.match(html,/Semua ujian/);
  assert.doesNotMatch(html,/Akan datang|tenggat terdekat/);
});
test("a dashboard card expires on a server-clock boundary even if refreshing fails",async()=>{
  const h=harness();h.render();const cleanup=h.effects[0]();
  const boundary=h.timers.find(timer=>timer.boundary);
  h.advance(Date.parse(item.closesAt)-Date.parse(initial.serverNow)+40);boundary.fn();
  await new Promise(resolve=>setImmediate(resolve));
  const html=h.render();assert.doesNotMatch(html,/Materi berjalan/);assert.match(html,/Semua materi/);
  assert.equal(h.calls[0][0],"/api/academy/learning/today");assert.equal(h.calls[0][1].cache,"no-store");
  assert.equal(h.calls[0][1].credentials,"same-origin");cleanup();
});
test("completed current exams remain visible until their deadline with a result link",()=>{
  const h=harness(),html=h.render({...initial,exam:{...item,id:"q1",title:"Ujian berjalan",kind:"DAILY",completed:true}});
  assert.match(html,/Ujian berjalan/);assert.match(html,/lihat hasil ujian/);
});
