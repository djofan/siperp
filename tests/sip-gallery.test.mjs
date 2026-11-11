import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const nativeRequire=createRequire(import.meta.url),cache=new Map();
function load(filename){
 const full=path.resolve(filename);if(cache.has(full))return cache.get(full).exports;
 const mod={exports:{}};cache.set(full,mod);
 const require=id=>{
  if(id.endsWith('.css'))return {__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})};
  if(id.startsWith('.')||id.startsWith('@/')){const root=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(full),id);return load([root,root+'.ts',root+'.tsx'].find(candidate=>existsSync(candidate)));}
  return nativeRequire(id);
 };
 vm.runInNewContext(ts.transpileModule(readFileSync(full,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{module:mod,exports:mod.exports,require,Date,Intl},{filename:full});return mod.exports;
}
const {PenyaluranBantuanCard}=load('modules/sip/components/PenyaluranBantuanCard.tsx');
const content={title:'Bantuan pengobatan',description:'Penyaluran bantuan kesehatan',image:null,location:'Bogor',date:new Date('2026-11-11T00:00:00Z')};
for(const gallery of [null,undefined,[]])test(`renders legacy SIP distribution with ${String(gallery)} gallery`,()=>{
 const html=renderToStaticMarkup(React.createElement(PenyaluranBantuanCard,{...content,documentationPhotos:gallery}));
 assert.match(html,/Bantuan pengobatan/);assert.doesNotMatch(html,/Lihat galeri/);
});
test('renders the gallery when distribution photos exist',()=>{
 const html=renderToStaticMarkup(React.createElement(PenyaluranBantuanCard,{...content,documentationPhotos:[{id:'photo-1',image:'/uploads/sip/test.webp',caption:'Penyerahan bantuan'}]}));
 assert.match(html,/Lihat galeri/);assert.match(html,/Penyerahan bantuan/);
});
