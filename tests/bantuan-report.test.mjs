import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import ExcelJS from 'exceljs';
const require=createRequire(import.meta.url);
const context={exports:{},require:(name)=>name==='@/contracts/modules/bantuan'?{bantuanStatuses:{completed:'Selesai'}}:require(name),Date};
new Function('exports','require',ts.transpileModule(readFileSync('modules/bantuan/report-workbook.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(context.exports,context.require);
test('Excel preserves identifiers, numeric totals, private labels and filterable columns',async()=>{
 const bytes=await context.exports.reportWorkbook([{number:'BNT-TEST',name:'=not a formula',nik:'0123456789012345',phone:'081234567890',status:'completed',amount:1500000,paidAmount:1400000,source:'online'}],'November 2026');
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes);
 const rows=workbook.getWorksheet('Rincian pengajuan');assert.equal(rows.getCell('C2').value,'0123456789012345');assert.equal(rows.getCell('B2').value,'=not a formula');assert.equal(rows.getCell('S2').value,1500000);assert.equal(rows.getCell('L2').value,'Selesai');assert.ok(rows.autoFilter);assert.equal(workbook.getWorksheet('Ringkasan').getCell('B6').value,1400000);
});

test('recap follows the reference columns and does not label ongoing aid as delivered',async()=>{
 const rows=['completed','rejected_t1','needs_data','fund_approved','cancelled','returned'].map((status,i)=>({number:'BNT-'+i,name:'Pemohon '+i,address:'Alamat lengkap',problem:'Kebutuhan biaya',reporterName:i===0?'Pelapor contoh':null,status,createdAt:'2026-11-03',amount:1000000}));
 const logo='data:image/png;base64,'+readFileSync('public/lazsip-logo.png').toString('base64');
 const book=new ExcelJS.Workbook();await book.xlsx.load(await context.exports.reportWorkbook(rows,'November 2026',logo));
 const sheet=book.worksheets[0];assert.equal(sheet.name,'Rekap permohonan');assert.equal(sheet.getCell('C6').value,'PEMOHON (MUSTAHIK)');assert.equal(sheet.getCell('E6').value,'MASALAH YANG DIHADAPI');assert.equal(sheet.getCell('F8').value,'Pelapor contoh');
 assert.equal(sheet.getCell('G8').value,'Ya');assert.equal(sheet.getCell('H9').value,'Ya');assert.equal(sheet.getCell('I10').value,'Ya');
 for(const c of ['G11','H11','I11'])assert.equal(sheet.getCell(c).value,'');
 assert.ok(sheet.getCell('B8').value instanceof Date);assert.equal(sheet.views[0].ySplit,7);assert.equal(sheet.getImages().length,1);assert.equal(sheet.pageSetup.orientation,'landscape');assert.equal(sheet.pageSetup.printTitlesRow,'1:7');assert.equal(sheet.getCell('G8').dataValidation.type,'list');
 const empty=new ExcelJS.Workbook();await empty.xlsx.load(await context.exports.reportWorkbook([],''));assert.match(empty.worksheets[0].getCell('D8').value,/Tidak ada pengajuan/);
});
