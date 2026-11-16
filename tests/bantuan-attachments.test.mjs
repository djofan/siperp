import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(file,imports={}){
 const sandbox={exports:{},File,Error,require:id=>imports[id]};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,sandbox);
 return sandbox.exports;
}
const attachments=load('modules/bantuan/attachments.ts');
const photos=load('modules/bantuan/api/photos.ts',{'../attachments':attachments,'../photo-location':{readPhotoLocation:()=>{throw new Error('Documents must not enter the photo/GPS pipeline');}}});
test('PDF Word and spreadsheets preserve original bytes and do not enter photo conversion or GPS extraction',async()=>{
 for(const [name,type] of [['proposal.pdf','application/pdf'],['proposal.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],['biaya.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']]){
  const file=new File([new Uint8Array(3*1024*1024)],name,{type});
  const result=await photos.preparePhotoUpload(file,{latitude:-6,longitude:106,source:'device'});
  assert.equal(result.file,file);assert.equal(result.file.size,file.size);assert.equal(result.location,null);
 }
});
test('the 10 MiB limit is enforced before queueing without accepting executable extensions',()=>{
 assert.doesNotThrow(()=>attachments.validateAttachment(new File([new Uint8Array(10*1024*1024)],'ukuran-pas.pdf')));
 assert.throws(()=>attachments.validateAttachment(new File([new Uint8Array(10*1024*1024+1)],'besar.pdf')),/10 MB/);
 for(const name of ['script.php','page.html','script.svg','macro.docm','program.exe'])assert.throws(()=>attachments.validateAttachment(new File(['test'],name)),/format/);
 assert.throws(()=>attachments.validateAttachment(new File([],'kosong.pdf')),/kosong/);
});
