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

const expense={programId:"program",program:"Program QA",requestedOn:"2026-11-19",recipientIdentity:null,treasurerId:"treasury",treasurer:"Bendahara QA",createdBy:"Admin QA",signoffs:[],id:"expense",recipient:"QA Person",description:"QA Expense",amount:"9007199254740993",sourceId:"source",categoryId:"category",source:"Fund",category:"Category",version:4,revision:2,status:"waiting",origin:"native",createdAt:"2026-11-17T00:00:00Z"};
const UI=load("modules/keuangan/components/ui.tsx");
const Money=load("modules/keuangan/components/RupiahInput.tsx",{"../rupiah-input":load("modules/keuangan/rupiah-input.ts")});
const Form={FinanceForm:({children,label})=>React.createElement("form",null,children,React.createElement("button",null,label))};

test("large imported rupiah displays exactly and unknown dates are not fabricated",()=>{
 assert.equal(UI.rupiah("9007199254740993"),"Rp "+BigInt("9007199254740993").toLocaleString("id-ID"));assert.equal(UI.date(null),"Tidak tersedia");
});

test("expense editor requires revision reason and hides writes for read-only roles",async()=>{
 let canWrite=true;const Page=load("modules/keuangan/pages/expense-form.tsx",{"../api/overview":{getKeuanganOverview:async()=>({permissions:{writeExpenses:canWrite},readOnly:false})},"../api/workflow":{getExpense:async()=>expense,getExpenseOptions:async()=>({sources:[{id:"source",name:"Fund"}],categories:[{id:"category",name:"Category"}],programs:[{id:"program",name:"Program QA"}],treasurers:[{id:"treasury",name:"Bendahara QA"}]})},"../components/FinanceForm":Form,"../components/RupiahInput":Money,"../components/ApplicationFields":{treasuryLabel:name=>name}});
 const html=renderToStaticMarkup(await Page.ExpenseEditor({id:"expense"}));assert.match(html,/name="version" value="4"/);assert.match(html,/name="reason"/);assert.match(html,/Simpan revisi &amp; ajukan kembali/);assert.match(html,/9007199254740993/);
 canWrite=false;const denied=renderToStaticMarkup(await Page.ExpenseEditor({id:"expense"}));assert.doesNotMatch(denied,/<form/);
});

test("closed approval cannot show a decision form while own revisable decision requires reason",async()=>{
 let canDecide=false;const Page=load("modules/keuangan/pages/approval-detail.tsx",{"../api/overview":{getKeuanganOverview:async()=>({readOnly:false})},"../api/workflow":{getApproval:async()=>({id:"task",version:2,revision:2,decision:"approved",closed:false,canDecide,expense,history:[]})},"../components/FinanceForm":Form,"../components/ui":UI,"../components/ApplicationFields":{ApplicationFields:()=>null}});
 const props={params:Promise.resolve({id:"task"}),searchParams:Promise.resolve({})};
 assert.doesNotMatch(renderToStaticMarkup(await Page.default(props)),/<form/);
 canDecide=true;const html=renderToStaticMarkup(await Page.default(props));assert.match(html,/name="reason"/);assert.match(html,/Simpan revisi keputusan/);assert.match(html,/name="version" value="2"/);
});


test("application action retains chosen program date treasury and recipient identity but ignores forged signoffs",async()=>{
 const h=actionHarness();await assert.rejects(()=>h.actions.saveFinance("expense",null,{error:""},form({requestId:"key",sourceId:"s",categoryId:"c",programId:"p",requestedOn:"2026-11-19",treasurerId:"treasury",recipientIdentity:"Private QA identity",amount:"123456",description:"Purpose",signoffs:"approved"})),/redirect/);
 assert.equal(h.calls[0].body.programId,"p");assert.equal(h.calls[0].body.requestedOn,"2026-11-19");assert.equal(h.calls[0].body.treasurerId,"treasury");assert.equal(h.calls[0].body.recipientIdentity,"Private QA identity");assert.equal(h.calls[0].body.signoffs,undefined);
});

test("print document preserves exact amounts actual status and unknown legacy dates without write privileges",async()=>{
 const fields=load("modules/keuangan/components/ApplicationFields.tsx");
 const Page=load("modules/keuangan/pages/expense-print.tsx",{"next/navigation":{notFound:()=>{throw new Error("not found");}},"../api/overview":{getKeuanganOverview:async()=>({role:"finance_admin"})},"../api/workflow":{getExpense:async()=>({...expense,requestedOn:null,status:"waiting",createdBy:null,signoffs:[{name:"Bendahara QA",decision:"waiting",closed:false}]})},"../components/PrintButton":{PrintButton:()=>React.createElement("button",null,"Cetak / Simpan PDF")},"../components/ApplicationFields":fields,"../components/ui":UI});
 const html=renderToStaticMarkup(await Page.default({params:Promise.resolve({id:"expense"})}));
 assert.match(html,/Bendahara QA/);assert.match(html,/Belum tercatat \(data lama\)/);assert.match(html,/Pengajuan Keuangan/);assert.match(html,/9\.007\.199\.254\.740\.993/);assert(!html.includes('method="post"'));
 assert.equal(fields.applicationDate("2026-11-19").includes("Kamis"),true);
 const css=readFileSync("modules/keuangan/styles/workflow.css","utf8");assert.match(css,/@media print/);assert.match(css,/finance-print-toolbar/);assert.match(css,/size:A4/);
});


test("sending an unassigned expense creates an approval request without submitting changed money or a forged decision",async()=>{
 const h=actionHarness();await assert.rejects(()=>h.actions.saveFinance("approval-request","old-expense",{error:""},form({requestId:"key",version:1,treasurerId:"treasury",reason:"Pengajuan lama ke Bendahara",amount:"999",decision:"approved"})),/redirect/);
 assert.equal(h.calls[0].path,"keuangan/expenses/old-expense/approval-requests");assert.equal(h.calls[0].body.version,"1");assert.equal(h.calls[0].body.treasurerId,"treasury");assert.equal(h.calls[0].body.amount,undefined);assert.equal(h.calls[0].body.decision,undefined);assert.deepEqual(h.redirects,["/admin/keuangan/pengeluaran/saved?saved=1"]);
});


test("treasury cannot open print documents or see printing and history actions on a decision",async()=>{
 let fetched=false;
 const Print=load("modules/keuangan/pages/expense-print.tsx",{"next/navigation":{notFound:()=>{throw new Error("not found");}},"../api/overview":{getKeuanganOverview:async()=>({role:"treasurer"})},"../api/workflow":{getExpense:async()=>{fetched=true;return expense;}},"../components/PrintButton":{PrintButton:()=>null},"../components/ApplicationFields":{ApplicationFields:()=>null},"../components/ui":UI});
 await assert.rejects(()=>Print.default({params:Promise.resolve({id:"expense"})}),/not found/);
 assert.equal(fetched,false);
 const Page=load("modules/keuangan/pages/approval-detail.tsx",{"../api/overview":{getKeuanganOverview:async()=>({role:"treasurer",readOnly:false})},"../api/workflow":{getApproval:async()=>({id:"task",version:2,revision:2,decision:"waiting",canDecide:true,expense,history:[]})},"../components/FinanceForm":Form,"../components/ui":UI,"../components/ApplicationFields":{ApplicationFields:()=>null}});
 const html=renderToStaticMarkup(await Page.default({params:Promise.resolve({id:"task"}),searchParams:Promise.resolve({})}));
 assert.doesNotMatch(html,/Cetak pengajuan|Lihat pengajuan &amp; riwayat|<h2>Riwayat/);
 assert.match(html,/Simpan keputusan/);
 assert.match(html,/name="decision"/);
});
