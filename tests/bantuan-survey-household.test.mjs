import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const dependencies={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync('modules/bantuan/dependents.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,dependencies);
const context={exports:{},require:()=>dependencies.exports};
vm.runInNewContext(ts.transpileModule(readFileSync('modules/bantuan/survey-applicant.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {isRentedHousing,surveyApplicantErrors}=context.exports;
test('survey household requires complete rows matching the count and positive rent with period',()=>{
  const member={name:'Ahmad',relationship:'Anak',gender:'laki_laki',age:12,status:'Sekolah'};
  for(const housing of ['Kontrak-sewa','Kontrak','Sewa bulanan']){
    assert.equal(isRentedHousing(housing),true);
    const data={housing,dependentCount:1,dependents:[member],rent:750000,rentPeriod:'bulan'};
    assert.equal(Object.keys(surveyApplicantErrors(data)).length,0);
    assert.ok(surveyApplicantErrors({...data,rent:0}).rent);
    assert.ok(surveyApplicantErrors({...data,rentPeriod:null}).rentPeriod);
    assert.ok(surveyApplicantErrors({...data,dependents:[]}).dependents);
    assert.ok(surveyApplicantErrors({...data,dependents:'1 anak'}).dependents);
    assert.ok(surveyApplicantErrors({...data,dependents:[{...member,name:''}]}).dependents);
  }
  assert.equal(Object.keys(surveyApplicantErrors({housing:'Menumpang',dependentCount:0,dependents:[]})).length,0);
});
