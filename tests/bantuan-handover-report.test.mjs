import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync('modules/bantuan/handover-report.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
test('handover report includes delivery evidence and education receipts without mixing identity and survey photos',()=>{
 const documents=['ktp','handover','kk','certificate','survey_recipient','receipt','transfer','education_other','supporting'].map((kind,index)=>({id:String(index),kind,caption:'Caption '+kind}));
 const chosen=context.exports.handoverDocuments(documents);
 assert.deepEqual(Array.from(chosen,d=>d.kind),['handover','certificate','receipt','education_other']);
 assert.equal(documents.length,9);
 assert.equal(chosen[0].caption,'Caption handover');
 assert.equal(context.exports.handoverDocuments([]).length,0);
});
