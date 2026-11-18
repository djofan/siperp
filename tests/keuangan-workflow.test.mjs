import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const require=createRequire(import.meta.url),React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
class ApiError extends Error {}
function load(file,stubs={}){const context={exports:{},FormData,require(name){if(name in stubs)return stubs[name];if(name==="next/link")return {default:({href,children,...props})=>React.createElement("a",{href,...props},children)};return require(name);}};vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);return context.exports;}

function actionHarness(failure=false){const calls=[],redirects=[];const actions=load("modules/keuangan/api/actions.ts",{"next/navigation":{redirect:url=>{redirects.push(url);throw new Error("redirect");}},"next/cache":{revalidatePath:()=>{}},"@/lib/api":{ApiError,apiRequest:async(path,init)=>{calls.push({path,...init,body:JSON.parse(init.body)});if(failure)throw new ApiError("Versi berubah");return {id:"saved"};}}});return {actions,calls,redirects};}
function form(values){const f=new FormData();for(const [key,value]of Object.entries(values)){for(const item of Array.isArray(value)?value:[value])f.append(key,String(item));}return f;}

test("expense action sends exact rupiah and retry key without client-supplied approval or identity fields",async()=>{
 const h=actionHarness();const data=form({requestId:"retry-key",amount:"9000000000000000",sourceId:"source",categoryId:"category",recipient:"Person",description:"Expense",createdBy:"forged",decision:"approved"});
 await assert.rejects(()=>h.actions.saveFinance("expense",null,{error:""},data),/redirect/);
 assert.equal(h.calls[0].body.amount,"9000000000000000");assert.equal(h.calls[0].body.requestId,"retry-key");assert.equal(h.calls[0].path,"keuangan/expenses");assert.equal(h.calls[0].method,"POST");assert.equal(h.calls[0].body.createdBy,undefined);assert.equal(h.calls[0].body.decision,undefined);assert.deepEqual(h.redirects,["/admin/keuangan/pengeluaran/saved?saved=1"]);
});

test("revisions send optimistic version and reason and failed API writes do not redirect",async()=>{
 const h=actionHarness(true);const result=await h.actions.saveFinance("expense","expense",{error:""},form({version:3,reason:"Budget corrected",amount:"500",requestId:"key"}));
 assert.equal(h.calls[0].method,"PUT");assert.equal(h.calls[0].body.version,"3");assert.equal(h.calls[0].body.reason,"Budget corrected");assert.equal(result.error,"Versi berubah");assert.equal(h.redirects.length,0);
});

test("rule action preserves multiple approvers and zero minimum as text",async()=>{
 const h=actionHarness();await assert.rejects(()=>h.actions.saveFinance("rule",null,{error:""},form({requestId:"key",minAmount:"0",maxAmount:"1000000",approverIds:["first","second"],active:"on"})),/redirect/);
 assert.deepEqual(h.calls[0].body.approverIds,["first","second"]);assert.equal(h.calls[0].body.active,true);assert.equal(h.calls[0].body.minAmount,"0");
});

const expense={id:"expense",recipient:"QA Person",description:"QA Expense",amount:"9007199254740993",sourceId:"source",categoryId:"category",source:"Fund",category:"Category",version:4,revision:2,status:"waiting",origin:"native",createdAt:"2026-11-17T00:00:00Z"};
const UI=load("modules/keuangan/components/ui.tsx");
const Form={FinanceForm:({children,label})=>React.createElement("form",null,children,React.createElement("button",null,label))};

test("large imported rupiah displays exactly and unknown dates are not fabricated",()=>{
 assert.equal(UI.rupiah("9007199254740993"),"Rp "+BigInt("9007199254740993").toLocaleString("id-ID"));assert.equal(UI.date(null),"Tidak tersedia");
});

test("expense editor requires revision reason and hides writes for read-only roles",async()=>{
 let canWrite=true;const Page=load("modules/keuangan/pages/expense-form.tsx",{"../api/overview":{getKeuanganOverview:async()=>({permissions:{writeExpenses:canWrite},readOnly:false})},"../api/workflow":{getExpense:async()=>expense,getExpenseOptions:async()=>({sources:[{id:"source",name:"Fund"}],categories:[{id:"category",name:"Category"}]})},"../components/FinanceForm":Form});
 const html=renderToStaticMarkup(await Page.ExpenseEditor({id:"expense"}));assert.match(html,/name="version" value="4"/);assert.match(html,/name="reason"/);assert.match(html,/Simpan revisi &amp; minta approval ulang/);assert.match(html,/9007199254740993/);
 canWrite=false;const denied=renderToStaticMarkup(await Page.ExpenseEditor({id:"expense"}));assert.doesNotMatch(denied,/<form/);
});

test("closed approval cannot show a decision form while own revisable decision requires reason",async()=>{
 let canDecide=false;const Page=load("modules/keuangan/pages/approval-detail.tsx",{"../api/overview":{getKeuanganOverview:async()=>({readOnly:false})},"../api/workflow":{getApproval:async()=>({id:"task",version:2,revision:2,decision:"approved",closed:false,canDecide,expense,history:[]})},"../components/FinanceForm":Form,"../components/ui":UI});
 const props={params:Promise.resolve({id:"task"}),searchParams:Promise.resolve({})};
 assert.doesNotMatch(renderToStaticMarkup(await Page.default(props)),/<form/);
 canDecide=true;const html=renderToStaticMarkup(await Page.default(props));assert.match(html,/name="reason"/);assert.match(html,/Simpan revisi keputusan/);assert.match(html,/name="version" value="2"/);
});
