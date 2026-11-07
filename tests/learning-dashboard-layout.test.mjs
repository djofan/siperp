import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
import test from "node:test";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
const require=createRequire(import.meta.url),ts=require("typescript");
const css=new Proxy({},{get:(_,key)=>String(key)});
const stats={participants:12,assigned:48,approved:32,pending:5,overdue:3,late:2,score:86.5};
const report={summary:stats};
let fail=false;
class ApiError extends Error{}
function load(file,deps){const context={exports:{},URLSearchParams,Intl,Date,require:id=>deps[id]??require(id)};vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,context);return context.exports;}
const reports=load("components/learning-reports/ReportPage.tsx",{"next/link":({href,children,...props})=>React.createElement("a",{href,...props},children),"@/lib/api":{ApiError,apiRequest:async()=>{if(fail)throw new ApiError("offline");return report;}},"./ReportExport":{ReportExport:()=>null},"./types":{},"./Reports.module.css":{__esModule:true,default:css}});
async function resolve(node){if(Array.isArray(node))return Promise.all(node.map(async(child,i)=>{const resolved=await resolve(child);return React.isValidElement(resolved)?React.cloneElement(resolved,{key:resolved.key??String(i)}):resolved;}));if(!React.isValidElement(node))return node;if(typeof node.type==="function")return resolve(await node.type(node.props));return React.cloneElement(node,{},await resolve(node.props.children));}
for(const module of ["ojol","tanwir"]){
 test(`${module} dashboard overview owns period filters and performance in a single full-width row`,async()=>{
   const root=reports.LearningDashboardOverview({module,from:"2026-11-01",to:"2026-11-07"});
   assert.equal(root.type,"section");assert.equal(root.props.className,"overview");
   const html=renderToStaticMarkup(await resolve(root));
   assert.match(html,new RegExp(`action="/admin/${module}"`));assert.match(html,/name="from"/);assert.match(html,/name="to"/);assert.match(html,/min="2026-11-01"/);assert.match(html,/32\/48/);assert.match(html,/86.5/);assert.match(html,/seluruh periode/);assert.equal((html.match(/class="stat"/g)||[]).length,6);
 });
}
test("performance failure renders a readable retry destination rather than zero statistics",async()=>{fail=true;try{const html=renderToStaticMarkup(await resolve(React.createElement(reports.LearningDashboardReport,{module:"ojol"})));assert.match(html,/belum dapat dimuat/);assert.match(html,/href="\/admin\/ojol\/laporan"/);assert.doesNotMatch(html,/class="stat"/);}finally{fail=false;}});
test("shared report styles use module theme surface tokens and a full-width dashboard slot",()=>{
 const styles=readFileSync("components/learning-reports/Reports.module.css","utf8");assert.doesNotMatch(styles,/var\(--surface[,)]/);assert.match(styles,/var\(--color-surface,/);assert.match(styles,/\.overview\{grid-column:1\/-1/);
 for(const module of ["ojol","tanwir"]){const page=readFileSync(`modules/${module}/admin/pages/page.tsx`,"utf8");assert.match(page,new RegExp(`<LearningDashboardOverview module="${module}"`));assert.doesNotMatch(page,/<LearningDashboardReport /);}
});
if(process.env.LEARNING_PREVIEW){
 const reportCSS=readFileSync("components/learning-reports/Reports.module.css","utf8");
 for(const module of ["ojol","tanwir"]){
 const overview=renderToStaticMarkup(await resolve(React.createElement(reports.LearningDashboardOverview,{module})));
 const reference=readFileSync(`modules/${module}/components/admin/reference.css`,"utf8");
 const body=`<header><b>${module==="ojol"?"Ojol Mengaji":"Tanwir Qurani"}</b><span>Dashboard</span></header><main class="${module}-reference-dashboard"><div>Dashboard</div>${overview}<div class="${module}-dashboard-primary"><div class="directory-summary">${["Guru","Peserta","Kelompok","Total tugas"].map((x,i)=>`<article><small>${x}</small><strong>${[10,12,4,48][i]}</strong></article>`).join("")}</div><article class="fixture-panel"><h2>Sebaran guru & peserta</h2><p>Ringkasan program</p></article></div><aside class="${module}-dashboard-rail"><article class="fixture-panel"><h2>Setoran menunggu review</h2><strong>5</strong></article></aside></main>`;
 writeFileSync(`.tmp-uat/${module}-dashboard-preview.html`,`<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pratinjau layout ${module}</title><style>*{box-sizing:border-box}body{margin:0;font:14px Arial}header{display:flex;gap:30px;padding:24px}main{padding:20px;max-width:1400px;margin:auto}a{color:inherit;text-decoration:none}h2,p{margin:0}strong{display:block}header+main>div:first-child{display:none}.directory-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.directory-summary article,.fixture-panel{background:var(--color-surface);padding:20px;border-radius:15px;min-width:0}.directory-summary strong,.fixture-panel>strong{font-size:28px;margin-top:15px}.fixture-panel{margin-top:15px}.fixture-panel h2{font-size:17px}.fixture-panel p{margin-top:12px}${reference} ${reportCSS}</style><body class="${module}-admin">${body}</body></html>`);
 }
}
