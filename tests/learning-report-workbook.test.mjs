import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import ExcelJS from 'exceljs';

const require=createRequire(import.meta.url);
function load(path,dependencies={}){
 const exports={};
 const source=readFileSync(new URL(`../components/learning-reports/${path}.ts`,import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>dependencies[name]??require(name),URLSearchParams,Date,Buffer});
 return exports;
}
const types=load('types');
const {buildReportWorkbook}=load('workbook',{'./types':types});
test('Excel report keeps participant metrics, filters, null grades and readable table controls',async()=>{
 const row={id:'1',name:'Peserta Uji',code:'PTQ001',active:1,group_name:'Kelompok Bogor',assigned:3,submitted:2,approved:1,pending:1,rejected:0,missing:1,overdue:1,on_time:1,late:1,score:null,completion:33.3,last_submission:null};
 const bytes=await buildReportWorkbook('tanwir','from=2026-11-01&group=bogor',[row]);
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes);
 const sheet=workbook.getWorksheet('Performa peserta');
 assert.equal(sheet.getCell('C6').value,'Peserta Uji');
 assert.equal(sheet.getCell('F6').value,3);
 assert.equal(sheet.getCell('O6').value,null);
 assert.equal(sheet.getCell('P6').value,33.3);
 assert.equal(sheet.getCell('Q6').value,'Perlu perhatian');
 assert.match(sheet.getCell('A2').value,/from=2026-11-01/);
 assert.equal(sheet.views[0].state,'frozen');
 assert.equal(sheet.getCell('C6').border.bottom.style,'thin');
 assert.ok(sheet.getTable('PerformaPeserta'));
});
test('Excel export also opens with no matching participants',async()=>{
 const bytes=await buildReportWorkbook('ojol','q=missing',[]);
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes);
 assert.match(workbook.getWorksheet(1).getCell('A1').value,/OJOL MENGAJI/);
});
