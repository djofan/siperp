import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(file,fetch){
 const module={exports:{}};
 const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>id==='@/lib/api-problem'?load('lib/api-problem.ts'):require(id),fetch,FormData,window:undefined});
 return module.exports;
}
const {describeApiProblem}=load('lib/api-problem.ts');
test('user messages keep the explanation without technical references',()=>{
 const requestId='270ea69f-26a9-4a7c-860d-e698acccf526';
 const error={message:'Struktur database belum sesuai.',diagnosticCode:'DB_SCHEMA_MISMATCH',requestId};
 const message=describeApiProblem({error},500);
 assert.match(message,/Struktur database/);assert.doesNotMatch(message,/DB_SCHEMA_MISMATCH|Kode:|ID:/);assert(!message.includes(requestId));
 assert.equal(describeApiProblem({error:{...error,message}},500),message);
});
test('field validation identifies the field without a diagnostic reference',()=>{
 const {fieldMessage}=load('modules/bantuan/api/client.ts');
 const text=describeApiProblem({error:{details:{password:['The password field must be at least 12 characters.']},diagnosticCode:'VALIDATION_FAILED',requestId:'test-id'}},422,'fallback',fieldMessage);
 assert.match(text,/Password minimal 12 karakter/);assert.doesNotMatch(text,/VALIDATION_FAILED|test-id|Kode:/);
 assert.match(describeApiProblem({error:{details:{name:['The name field is required.']}}},422,'fallback',fieldMessage),/Nama lengkap wajib diisi/);
});
test('Bantuan handles an HTML gateway failure as a readable HTTP error',async()=>{
 const {request}=load('modules/bantuan/api/client.ts',async()=>new Response('<h1>Bad Gateway</h1>',{status:502}));
 await assert.rejects(()=>request('staff',{method:'POST',body:'{}'}),error=>error.status===502&&/Layanan belum dapat dihubungi/.test(error.message)&&!/HTTP_502/.test(error.message));
});
test('Bantuan does not mistake an invalid success body for a saved account',async()=>{
 const {request}=load('modules/bantuan/api/client.ts',async()=>new Response('not JSON',{status:200}));
 await assert.rejects(()=>request('staff'),error=>error.status===502&&/Respons server belum dapat dibaca/.test(error.message)&&!/INVALID_API_RESPONSE/.test(error.message));
});
test('Bantuan reports network loss without promising that an unsaved account exists',async()=>{
 const {request}=load('modules/bantuan/api/client.ts',async()=>{throw Error('network');});
 await assert.rejects(()=>request('staff'),error=>error.status===0&&/Koneksi ke server terputus/.test(error.message)&&!/API_CONNECTION_FAILED/.test(error.message)&&!/Draft tetap/.test(error.message));
});
test('legacy failures and throttled responses have actionable messages',()=>{
 assert.match(describeApiProblem({error:{message:'An unexpected error occurred.'}},503),/layanan|Layanan/);
 assert.match(describeApiProblem({error:{message:'Tunggu 37 detik.',diagnosticCode:'TOO_MANY_REQUESTS'}},429),/37 detik/);
});


test('legacy validation names the actual fields and never mistakes a code for NIK',()=>{
 const {readableValidationMessage}=load('lib/api-problem.ts');
 assert.equal(readableValidationMessage('The unique code has already been taken.','uniqueCode'),'Kode unik sudah digunakan. Gunakan yang berbeda.');
 assert.match(readableValidationMessage('The unique code must be 2 digits.','uniqueCode'),/Kode unik.*2 digit/);
 const message=describeApiProblem({error:{details:{title:['The title field is required.'],email:['The email must be a valid email address.'],amount:['The amount must be an integer.']}}},422);
 for(const label of ['Judul','Email','Nominal'])assert(message.includes(label));
 assert.doesNotMatch(message,/The |HTTP_|Kode:/);
 assert.match(readableValidationMessage('The applicant.dependents.1.name field is required.','applicant.dependents.1.name'),/Nama lengkap pada baris 2 wajib diisi/);
 assert.equal(describeApiProblem({error:{message:'Unggahan gagal. (Kode: DB_BUSY; ID: private-id)'}},500),'Unggahan gagal.');
});
