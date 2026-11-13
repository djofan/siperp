import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function nodes(node){if(!node||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(nodes);return [node,...nodes(node.props?.children)];}
function render(base,role='Peserta'){
 const mod={exports:{}};
 const mocks={react:{useState:()=>[false,()=>{}]},'@/modules/academy/pwa/AcademyNavigation':{default:'a'},'../pwa/AcademyNavigation':{useAcademyBasePath:()=>base},'../pwa/navigation':{canonicalAcademyPath:path=>path},'next/navigation':{usePathname:()=>'/academy/catatan'},'./ui/button':{Button:'button'},'./ui/badge':{Badge:'span'},'./ui/sheet':{Sheet:'div',SheetContent:'mobile-drawer',SheetTitle:'h2',SheetDescription:'p',SheetTrigger:'div'},'./ui/utils':{cn:(...values)=>values.filter(Boolean).join(' ')},'./LogoutButton':{LogoutButton:'button'}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('modules/academy/components/DashboardChrome.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:mod,exports:mod.exports,require:id=>Object.hasOwn(mocks,id)?mocks[id]:require(id)});
 const paths=['belajar','materi','catatan','kuis','progres','peringkat','sertifikat','tanya-jawab','akun'];
 return mod.exports.DashboardChrome({groups:[{items:paths.map(path=>({href:'/academy/'+path,label:path}))}],userName:'QA',role,children:'Content'});
}
const links=node=>nodes(node).filter(n=>n.type==='a').map(n=>n.props.href);
test('app mobile drawer keeps secondary menus while desktop and bottom bar retain primary links',()=>{
 const all=nodes(render('/academy-app'));
 const drawer=all.find(n=>n.type==='mobile-drawer');
 const desktop=all.find(n=>n.type==='aside');
 for(const path of ['belajar','materi','kuis','akun']){assert(!links(drawer).includes('/academy/'+path));assert(links(desktop).includes('/academy/'+path));}
 for(const path of ['catatan','progres','peringkat','sertifikat','tanya-jawab'])assert(links(drawer).includes('/academy/'+path));
 assert(links(drawer).includes('/lazsip/donasi'));
 const bottom=all.find(n=>n.props?.['aria-label']==='Navigasi cepat Academy');
 assert.deepEqual(links(bottom),['/academy/belajar','/academy/materi','/academy/kuis','/academy/akun']);
});
test('web and teacher drawers retain complete navigation when no participant bottom bar is shown',()=>{
 for(const [base,role] of [['/academy','Peserta'],['/academy-app','Pengajar']]){
 const all=nodes(render(base,role));const drawer=all.find(n=>n.type==='mobile-drawer');
 for(const path of ['belajar','materi','kuis','akun'])assert(links(drawer).includes('/academy/'+path));
 assert(!all.some(n=>n.props?.['aria-label']==='Navigasi cepat Academy'));
 }
});
