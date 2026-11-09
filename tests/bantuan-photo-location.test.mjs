import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import Ajv from 'ajv';

const context={exports:{},require:createRequire(import.meta.url),FormData,encodeURIComponent};
vm.runInNewContext(ts.transpileModule(readFileSync('modules/bantuan/photo-location.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,context);
const {photoMapUrl,appendPhotoLocation,readPhotoLocation}=context.exports;

test('OpenAPI photo location schema allows legacy null and rejects incomplete or invalid pins',()=>{
  const document=JSON.parse(readFileSync('api/docs/openapi.json','utf8'));
  const validate=new Ajv({strict:false}).compile(document.components.schemas.BantuanPhotoLocation);
  assert.equal(validate(null),true);
  assert.equal(validate({latitude:0,longitude:0,source:'device',accuracy:null}),true);
  assert.equal(validate({latitude:0,source:'exif'}),false);
  assert.equal(validate({latitude:100,longitude:0,source:'exif'}),false);
  assert.equal(validate({latitude:0,longitude:0,source:'device',url:'https://example.org'}),false);
});

function gpsPhoto(){
  // Synthetic TIFF/EXIF with GPS S 6°12', E 106°48'; no personal image data.
  const bytes=new Uint8Array(128),v=new DataView(bytes.buffer);
  const u16=(at,n)=>v.setUint16(at,n,true),u32=(at,n)=>v.setUint32(at,n,true);
  bytes.set([73,73]);u16(2,42);u32(4,8);u16(8,1);
  u16(10,0x8825);u16(12,4);u32(14,1);u32(18,26);
  u16(26,4);
  for(const [i,tag,type,count,value] of [[0,1,2,2,83],[1,2,5,3,80],[2,3,2,2,69],[3,4,5,3,104]]){
    const p=28+i*12;u16(p,tag);u16(p+2,type);u32(p+4,count);u32(p+8,value);
  }
  [6,12,0,106,48,0].forEach((n,i)=>{u32(80+i*8,n);u32(84+i*8,1);});
  return new File([bytes],'gps.tif');
}

test('reads original EXIF GPS before photo compression',async()=>{
  const point=await readPhotoLocation(gpsPhoto());
  assert.equal(point.source,'exif');
  assert.ok(Math.abs(point.latitude+6.2)<0.000001);
  assert.ok(Math.abs(point.longitude-106.8)<0.000001);
});
test('missing and malformed metadata return no pin, never a fabricated location',async()=>{
  assert.equal(await readPhotoLocation(new File(['not-exif'],'photo.jpg')),null);
  assert.equal(photoMapUrl(null),null);
  assert.equal(photoMapUrl({latitude:91,longitude:1,source:'exif'}),null);
  assert.equal(photoMapUrl({latitude:1,longitude:'javascript:alert(1)',source:'exif'}),null);
});
test('only validated coordinate links and multipart fields are generated',()=>{
  const location={latitude:0,longitude:106.8,source:'device',accuracy:25};
  assert.equal(photoMapUrl(location),'https://www.google.com/maps/search/?api=1&query=0%2C106.8');
  const body=new FormData();appendPhotoLocation(body,location);
  assert.equal(body.get('location[latitude]'),'0');
  assert.equal(body.get('location[source]'),'device');
  assert.equal(body.get('location[accuracy]'),'25');
  const empty=new FormData();appendPhotoLocation(empty,null);
  assert.equal([...empty.keys()].length,0);
});

test('photo pin labels distinguish metadata from upload position and old photos show no link',()=>{
  const link={exports:{},require:id=>id.endsWith('.css')?{default:{pin:'pin'}}:id==='../photo-location'?context.exports:createRequire(import.meta.url)(id)};
  vm.runInNewContext(ts.transpileModule(readFileSync('modules/bantuan/components/PhotoLocationLink.tsx','utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},
  }).outputText,link);
  const render=location=>renderToStaticMarkup(createElement(link.exports.PhotoLocationLink,{location}));
  assert.equal(render(null),'');
  assert.match(render({latitude:-6,longitude:106,source:'exif'}),/GPS dari metadata foto/);
  const device=render({latitude:-6,longitude:106,source:'device',accuracy:30});
  assert.match(device,/bukan lokasi pengambilan/);
  assert.match(device,/noopener noreferrer/);
  assert.match(device,/no-referrer/);
});

test('encrypted upload queue keeps photo coordinates through compression and sends the original source on retry',async()=>{
  const saved=new Map(),sent=[],navigator={onLine:false};
  const location={latitude:-6.2,longitude:106.8,source:'device',accuracy:20};
  class Reader {
    readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{this.result=`data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`;this.onload();});}
  }
  let fail=true;
  class Xhr {
    upload={};status=201;
    open(){} setRequestHeader(){}
    send(body){sent.push(body);if(fail){this.status=503;this.responseText='{}';fail=false;}queueMicrotask(()=>this.onload());}
  }
  class RequestError extends Error {constructor(message,status){super(message);this.status=status;}}
  const queue={exports:{},File,FileReader:Reader,FormData,XMLHttpRequest:Xhr,navigator,atob,crypto,Date,Error,
    require:id=>({
      './vault':{draftsWithPrefix:async()=>[...saved.values()],putDraft:async(_owner,key,value)=>saved.set(key,structuredClone(value)),removeDraft:async()=>{}},
      './photos':{preparePhotoUpload:async(file,point)=>({file:new File(['compressed'],'small.jpg',{type:'image/jpeg'}),location:point})},
      './client':{RequestError},'../photo-location':context.exports,
    })[id]};
  vm.runInNewContext(ts.transpileModule(readFileSync('modules/bantuan/api/photo-queue.ts','utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText,queue);
  await queue.exports.addPhotos('owner','application','survey_front',[new File(['original'],'house.jpg',{type:'image/jpeg'})],['House'],location);
  navigator.onLine=true;
  await queue.exports.pumpPhotos('owner','application');
  const item=queue.exports.photoSnapshot('owner','application')[0];
  assert.equal(item.status,'error');
  assert.deepEqual(saved.values().next().value.location,location);
  await queue.exports.retryPhoto('owner','application',item.id);
  // retryPhoto starts the pump in the background.
  for(let i=0;i<20&&sent.length<2;i++)await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(sent.length,2);
  assert.equal(sent[1].get('location[source]'),'device');
  assert.equal(sent[1].get('location[latitude]'),'-6.2');
});
