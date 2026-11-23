import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require=createRequire(import.meta.url);
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require,URLSearchParams,Date,Map,Set,Intl,Error,Number});return exports;}
const {collectTaskRecapExport}=load("modules/tanwir/components/admin/task-recap-export.ts");
const {buildTaskRecapWorkbook}=load("modules/tanwir/components/admin/task-recap-workbook.ts");
const task={id:"t1",title:"=HYPERLINK(bad)",type:"quiz",teacher:{name:"PIC QA",code:"GTQ1"},groups:[],createdAt:"2026-11-23T00:00:00Z",deadline:"2026-11-24T10:00:00Z",originalDeadline:"2026-11-24T10:00:00Z"};
const member=(n)=>({id:`p${n}`,code:`PTQ${n}`,name:`Peserta ${n}`,active:n!==1,currentlyAssigned:n!==1,group:null,submission:n===1?{status:"approved",score:0,attemptsCount:2,isLate:true,submittedAt:"2026-11-23T01:00:00Z"}:null});
const meta=(page,last,total)=>({current_page:page,last_page:last,total,per_page:50});
test("export traverses every task and participant page without screen filters",async()=>{
 const urls=[];
 const data=await collectTaskRecapExport(async url=>{urls.push(url);const q=new URL(url,"https://test.invalid");const page=Number(q.searchParams.get("page"));
  assert.equal(q.searchParams.get("per_page"),"50");assert.equal(q.searchParams.has("q"),false);assert.equal(q.searchParams.has("group"),false);
  if(q.pathname.endsWith("task-recaps")) return {tasks:[{...task,id:`t${page}`}],meta:meta(page,2,2)};
  return {participants:page===1?Array.from({length:50},(_,i)=>member(i+1)):[member(51)],meta:meta(page,2,51)};
 });
 assert.equal(data.tasks.length,2);assert.equal(data.tasks[0].participants.length,51);assert.equal(data.tasks[1].participants.length,51);assert.equal(urls.length,6);
});
test("export rejects incomplete changed or failed requests rather than returning a partial report",async()=>{
 await assert.rejects(()=>collectTaskRecapExport(async()=>({tasks:[task],meta:meta(1,1,2)})),/belum lengkap/);
 await assert.rejects(()=>collectTaskRecapExport(async url=>{const page=Number(new URL(url,"https://test.invalid").searchParams.get("page"));return {tasks:[{...task,id:`t${page}`}],meta:meta(page,2,page===1?2:3)};}),/Data berubah/);
 await assert.rejects(()=>collectTaskRecapExport(async()=>{throw Error("Tidak berizin");}),/Tidak berizin/);
});
test("workbook retains missing inactive moved and zero-score progress as typed cells",async()=>{
 const data={startedAt:"2026-11-23T00:00:00Z",tasks:[{task,participants:[member(1),member(2)]}]};
 const Excel=require("exceljs");const wb=new Excel.Workbook();await wb.xlsx.load(await buildTaskRecapWorkbook(data));
 assert.deepEqual(wb.worksheets.map(w=>w.name),["Ringkasan peserta","Rekap tugas","Rincian progres"]);
 const detail=wb.getWorksheet("Rincian progres");assert.equal(detail.rowCount,7);assert.equal(detail.getCell("O6").value,0);assert.equal(detail.getCell("O7").value,null);
 assert.equal(detail.getCell("L6").value,"Nonaktif");assert.equal(detail.getCell("M6").value,"Tidak");assert.equal(detail.getCell("N7").value,"Belum mengumpulkan");
 assert.equal(detail.getCell("C6").value,task.title);assert.equal(detail.getCell("C6").type,Excel.ValueType.String);
 assert.equal(wb.getWorksheet("Ringkasan peserta").getCell("L7").value,1);
 assert.equal(wb.getWorksheet("Rekap tugas").getCell("K6").value,2);
});
test("an empty recap still produces a valid three-sheet workbook",async()=>{
 const data=await collectTaskRecapExport(async()=>({tasks:[],meta:meta(1,1,0)}));
 const Excel=require("exceljs");const wb=new Excel.Workbook();await wb.xlsx.load(await buildTaskRecapWorkbook(data));assert.equal(wb.worksheets.length,3);assert.equal(wb.getWorksheet("Rincian progres").getCell("A5").value,"No");
});
