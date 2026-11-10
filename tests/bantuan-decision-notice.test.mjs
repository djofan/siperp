import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const require=createRequire(import.meta.url),ts=require('typescript');
const context={exports:{},require:()=>({default:{}})};
vm.runInNewContext(ts.transpileModule(readFileSync('modules/bantuan/components/DecisionNotice.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
const note=context.exports.decisionNote;
const event=(action,to_status,reason)=>({action,to_status,reason});
test('shows the latest relevant reason and hides outdated decisions after resubmission',()=>{
 const events=[event('request_data','needs_data','Lengkapi KTP'),event('comment','needs_data','Komentar lain'),event('request_data','needs_data','Perbaiki nomor HP')];
 assert.equal(note({status:'needs_data',events}).reason,'Perbaiki nomor HP');
 assert.equal(note({status:'review1',events}),undefined);
 assert.equal(note({status:'completed',events}),undefined);
 for(const [status,action] of [['rejected_t1','review1_reject'],['rejected_t2','review_reject'],['survey_assigned','survey_again']])assert.equal(note({status,events:[event(action,status,'Alasan keputusan')]}).reason,'Alasan keputusan');
 assert.equal(note({status:'rejected_t2',events:[event('review_reject','rejected_t2','  ')]}),undefined);
});
