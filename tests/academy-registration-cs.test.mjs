import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function nodes(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }
for (const open of [true, false]) test('public registration directs to CS without account fields, intake open='+open, async () => {
 const mod = { exports: {} };
 const source = ts.transpileModule(fs.readFileSync('modules/academy/pages/daftar/page.tsx','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(source,{module:mod,exports:mod.exports,encodeURIComponent,require(id){
  if(id==='react/jsx-runtime')return require(id);
  if(id.includes('pwa/AcademyNavigation'))return {default:'a'};
  if(id.includes('pwa/server-navigation'))return {academyServerHref:async path=>path,getAcademyBasePath:async()=>'/academy'};
  if(id==='next/navigation')return {redirect(){throw Error('unexpected redirect');}};
  if(id.endsWith('/api/access'))return {getAcademyUser:async()=>null};
  if(id.endsWith('/api/auth-navigation'))return {};
  if(id.endsWith('/api/learning'))return {getIntake:async()=>({cohort:open?{title:'Angkatan Tes'}:null,filled:0,full:false}),getLearningSettings:async()=>({csPhone:'628111186626',...(open?{csContacts:[{name:'CS Ikhwan',phone:'628111186626'},{name:'Admin Akhwat',phone:'6281234567890'}]}:{})})};
  throw Error(id);
 }});
 const tree=await mod.exports.default();const all=nodes(tree);
 assert(!all.some(node=>['form','input','textarea','select'].includes(node.type)));
 const cs=all.find(node=>typeof node.props?.href==='string'&&node.props.href.startsWith('https://wa.me/'));
 assert.equal(all.filter(node=>typeof node.props?.href==='string'&&node.props.href.startsWith('https://wa.me/')).length,open?2:1);
 assert(cs);assert.equal(new URL(cs.props.href).pathname,'/628111186626');
 assert(new URL(cs.props.href).searchParams.get('text').includes('pendaftaran'));
 assert(all.some(node=>node.type==='a'&&node.props.href==='/academy/masuk'));
});
