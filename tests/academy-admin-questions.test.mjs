import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require = createRequire(import.meta.url);
const React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
const question = {id:"private-question",title:"Zakat penghasilan",question:"Question for ustadz",answer:null,createdAt:new Date("2026-11-17T00:00:00Z"),profile:{user:{name:"Participant"}},course:{title:"Zakat",cohort:{title:"Angkatan 1"}}};

function load(file, detail=false, denied=false, title=question.title) {
  const calls=[];
  const context={exports:{},Date,require(name){
    if(name.includes("admin-access")) return {requireAcademyAdmin:async()=>{calls.push("admin-guard");if(denied)throw new Error("forbidden");}};
    if(name.endsWith("/api/access")) return {requireAcademyTeacher:async()=>{throw new Error("wrong guard");}};
    if(name.includes("page-data")) return {academyPage:async path=>{calls.push(path);return detail?{...question,title}:{items:[{...question,title}],total:1,page:1,pages:1};}};
    if(name.includes("AcademyNavigation")) return {default:({href,children,...props})=>React.createElement("a",{href,...props},children)};
    if(name.includes("TeacherSessions")) return {TeacherSessions:()=>null};
    if(name.includes("TeacherPagination")) return {TeacherPagination:({base})=>React.createElement("a",{href:base+"?page=2"},"Next")};
    if(name.endsWith("/components/ui")) return {PageHeading:({title,children})=>React.createElement("header",null,title,children),inputClass:"input"};
    if(name.includes("admin-question-actions"))return {answerAdminDiscussion:()=>{}};
    if(name.includes("teacher-actions"))return {answerTeacherDiscussion:()=>{}};
    if(name.includes("CopyQuestion"))return {CopyQuestion:({text})=>React.createElement("button",null,"Copy "+text)};
    if(name.includes("ActionForm"))return {ActionForm:({children,label})=>React.createElement("form",null,children,React.createElement("button",null,label))};
    return require(name);
  }};
  vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
  return {exports:context.exports,calls};
}

test("admin question table keeps links and pagination inside the admin workspace",async()=>{
  const h=load("modules/academy/pages/pengajar/pertanyaan/page.tsx");
  const html=renderToStaticMarkup(await h.exports.QuestionsPanel({admin:true,searchParams:Promise.resolve({tab:"jadwal"})}));
  assert.equal(h.calls[0],"admin-guard");
  assert.match(html,/Tanya Ustadz/);
  assert.match(html,/Zakat penghasilan/);
  assert.match(html,/href="\/admin\/academy\/pertanyaan\/private-question\?page=1"/);
  assert.match(html,/href="\/admin\/academy\/pertanyaan\?page=2"/);
  assert.doesNotMatch(html,/Jadwal sesi langsung/);
});

test("admin can copy a private question and submit the ustadz answer from its detail",async()=>{
  const h=load("modules/academy/pages/pengajar/pertanyaan/[id]/page.tsx",true);
  const html=renderToStaticMarkup(await h.exports.AnswerPanel({admin:true,params:Promise.resolve({id:question.id}),searchParams:Promise.resolve({page:"2"})}));
  assert.equal(h.calls[0],"admin-guard");
  assert.match(html,/Copy Zakat penghasilan\n\nQuestion for ustadz/);
  assert.match(html,/Jawaban dari ustadz/);
  assert.match(html,/Sampaikan jawaban ke peserta/);
  assert.match(html,/href="\/admin\/academy\/pertanyaan\?page=2"/);
});

test("a rejected admin guard prevents loading private question data",async()=>{
  const h=load("modules/academy/pages/pengajar/pertanyaan/page.tsx",false,true);
  await assert.rejects(()=>h.exports.QuestionsPanel({admin:true,searchParams:Promise.resolve({})}),/forbidden/);
  assert.deepEqual(h.calls,["admin-guard"]);
});


test("legacy questions remain readable without a title",async()=>{
  const h=load("modules/academy/pages/pengajar/pertanyaan/[id]/page.tsx",true,false,null);
  const html=renderToStaticMarkup(await h.exports.AnswerPanel({admin:true,params:Promise.resolve({id:question.id}),searchParams:Promise.resolve({})}));
  assert.match(html,/Pertanyaan peserta/);assert.match(html,/Copy Question for ustadz/);
});
