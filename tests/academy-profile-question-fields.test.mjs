import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
function compile(file, overrides){
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,FormData,require:name=>Object.hasOwn(overrides,name)?overrides[name]:require(name)});
 return exports;
}
const form=({children,label})=>React.createElement('form',null,children,React.createElement('button',null,label));
const ui={inputClass:'input',PageHeading:({title,children})=>React.createElement('header',null,React.createElement('h1',null,title),children)};
const profile={name:'Peserta',email:'participant@example.test',phone:'6281234567890',address:'Alamat peserta',profession:'Guru',expertise:'Mengajar',nis:'PAZ001',code:'PAZ001',gender:'IKHWAN',cohortName:'Angkatan 1'};
test('profile renders required profession and optional expertise populated from the own profile',async()=>{
 const page=compile('modules/academy/pages/akun/page.tsx',{
  '@/modules/academy/pwa/server-navigation':{academyServerHref:async path=>path},
  'next/navigation':{redirect(){throw new Error('unexpected redirect');}},
  '../../api/access':{getAcademyUser:async()=>({academyProfile:{id:'self',mustChangePassword:false}})},
  '../../api/actions':{updateAcademyProfile:()=>{},changeAcademyPassword:()=>{}},
  '../../components/ActionForm':{ActionForm:form},
  '../../components/ui/PasswordField':{PasswordField:props=>React.createElement('input',props)},
  '../../components/ui':ui,
  '@/lib/api':{apiRequest:async path=>{assert.equal(path,'academy/profile');return profile;}},
 }).default;
 const html=renderToStaticMarkup(await page());
 const profession=html.match(/<input[^>]*id="profile-profession"[^>]*>/)?.[0];
 const expertise=html.match(/<textarea[^>]*id="profile-expertise"[^>]*>[\s\S]*?<\/textarea>/)?.[0];
 assert.ok(profession);assert.match(profession,/required=""/);assert.match(profession,/value="Guru"/);assert.match(profession,/maxLength="191"/);
 assert.ok(expertise);assert.doesNotMatch(expertise,/required=/);assert.match(expertise,/Mengajar/);
});
test('new question form collects a required bounded topic title before the question',async()=>{
 const page=compile('modules/academy/pages/tanya-jawab/baru/page.tsx',{
  '@/modules/academy/pwa/AcademyNavigation':{default:({children,...props})=>React.createElement('a',props,children)},
  '@/modules/academy/api/page-data':{academyPage:async()=>({enrollments:[{course:{id:'course',title:'Angkatan 1'}}]})},
  '../../../api/access':{requireAcademyProfile:async()=>({profileId:'self'})},
  '../../../api/discussion-actions':{askParticipantQuestion:()=>{}},
  '../../../components/ActionForm':{ActionForm:form},'../../../components/ui':ui,
 }).default;
 const html=renderToStaticMarkup(await page());
 const title=html.match(/<input[^>]*name="title"[^>]*>/)?.[0];
 assert.ok(title);assert.match(title,/required=""/);assert.match(title,/minLength="3"/);assert.match(title,/maxLength="191"/);
 assert.ok(html.indexOf('name="title"')<html.indexOf('name="question"'));
});
test('profile server action forwards profession and optional expertise to Laravel',async()=>{
 let saved;let authorized=false;
 class ApiError extends Error{}
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync('modules/academy/api/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
  exports,FormData,require:name=>name==='@/lib/api'?{ApiError,apiRequest:async(path,options)=>{saved={path,options};}}:name==='./access'?{requireAcademyProfile:async()=>{authorized=true;}}:name==='next/cache'?{revalidatePath:()=>{}}:{},
 });
 const data=new FormData();for(const key of ['name','email','phone','address','profession','expertise'])data.set(key,profile[key]);
 assert.equal((await exports.updateAcademyProfile({error:''},data)).error,'');
 assert.equal(authorized,true);assert.equal(saved.path,'academy/profile');assert.equal(saved.options.method,'PUT');
 const body=JSON.parse(saved.options.body);assert.equal(body.profession,'Guru');assert.equal(body.expertise,'Mengajar');
 data.set('expertise','');await exports.updateAcademyProfile({error:''},data);assert.equal(JSON.parse(saved.options.body).expertise,'');
});
