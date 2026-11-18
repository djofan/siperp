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


test("exam duration edits use a single total-minute input including durations over sixty minutes", () => {
  const context = {exports:{},require(name){
    if(name === "../ui/FieldCompat") return {
      FormField: ({children,label}) => React.createElement("label",null,label,children),
      Input: props => React.createElement("input",props),
    };
    return require(name);
  }};
  vm.runInNewContext(compile("modules/academy/components/admin/ExamDurationField.tsx"),context);
  const html = renderToStaticMarkup(React.createElement(context.exports.ExamDurationField,{initialMinutes:90}));
  assert.match(html,/name="timeLimitMinutes"/);
  assert.match(html,/value="90"/);
  assert.match(html,/max="1440"/);
  assert.equal((html.match(/<input /g) ?? []).length,1);
  assert.doesNotMatch(html,/Jam|hours/);
});


test("desktop and mobile exams preserve admin order and stable numbering", async () => {
  const quizzes = [
    {id:"first",title:"Materi Pertama",releaseDay:3,closesAt:new Date("2020-01-01"),attempts:[{isCompleted:true}]},
    {id:"second",title:"Materi Kedua",releaseDay:1,closesAt:new Date("2099-01-01"),attempts:[]},
    {id:"third",title:"Materi Ketiga",releaseDay:2,closesAt:new Date("2098-01-01"),attempts:[]},
  ].map(item => ({...item,kind:"DAILY",timeLimitMinutes:4,_count:{questions:2}}));
  const context={exports:{},Date,Intl,Map,require(name){
    if(name.includes("AcademyNavigation")) return {default:({children,href,...props})=>React.createElement("a",{href,...props},children)};
    if(name.includes("api/access")) return {requireAcademyParticipant:async()=>({academyProfile:{id:"participant"}})};
    if(name.includes("api/courses")) return {listParticipantQuizzes:async()=>quizzes};
    if(name.includes("learner-cohorts")) return {learnerCohorts:async()=>[{id:"cohort",joined:true,current:true}]};
    if(name === "../../components/ui") return {PageHeading:({children})=>React.createElement("h1",null,children),EmptyState:()=>null};
    return require(name);
  }};
  vm.runInNewContext(compile("modules/academy/pages/kuis/page.tsx"),context);
  const html=renderToStaticMarkup(await context.exports.default());
  const desktop=html.slice(html.indexOf('class="hidden sm:block"'));
  assert.ok(desktop.indexOf("Materi Pertama") < desktop.indexOf("Materi Kedua"));
  assert.ok(desktop.indexOf("Materi Kedua") < desktop.indexOf("Materi Ketiga"));
  const mobile=html.slice(0,html.indexOf('class="hidden sm:block"'));
  assert.ok(mobile.indexOf("Materi Pertama") < mobile.indexOf("Materi Kedua"));
  assert.ok(mobile.indexOf("Materi Kedua") < mobile.indexOf("Materi Ketiga"));
  for (const [title,number] of [["Materi Pertama",1],["Materi Kedua",2],["Materi Ketiga",3]]) {
    for (const section of [desktop,mobile]) {
      const cards=section.match(/<article[\s\S]*?<\/article>/g) ?? [];
      const card=cards.find(card=>card.includes(title));
      assert.ok(card?.includes(`Ujian Harian ${number}`));
    }
  }
});
