import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const code="1234567890abcdef1234";
function load(status=200){
 let calls=0;
 class ApiError extends Error { constructor(status){super("backend");this.status=status;} }
 const module={exports:{}};
 const source=ts.transpileModule(fs.readFileSync("modules/lazsip/affiliate/referral-route.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,URL,Response,encodeURIComponent,require(name){
  if(name==="next/server")return {NextResponse:{redirect:(url,status)=>new Response(null,{status,headers:{Location:url.toString()}})}};
  if(name==="@/lib/api")return {ApiError,apiRequest:async path=>{calls++;assert.equal(path,`lazsip/affiliate/referrals/${code}`);if(status!==200)throw new ApiError(status);return {referralCode:code};}};
  throw new Error(name);
 }});
 return {get:module.exports.GET,calls:()=>calls};
}
test("verified referral redirects only to same-origin zakat with its random code",async()=>{
 const x=load();const response=await x.get(new Request(`https://example.test/lazsip/r/${code}?next=https://other.test`),{params:Promise.resolve({code})});
 assert.equal(response.status,307);assert.equal(response.headers.get("Location"),`https://example.test/lazsip/zakat?ref=${code}`);assert.equal(response.headers.get("Cache-Control"),"no-store");assert.equal(x.calls(),1);
});
test("malformed codes never reach the API",async()=>{
 const x=load();const response=await x.get(new Request("https://example.test/lazsip/r/invalid"),{params:Promise.resolve({code:"invalid"})});
 assert.equal(response.status,404);assert.equal(x.calls(),0);
});
test("invalid or inactive links are rejected and provider outages never report a valid referral",async()=>{
 for(const [status,expected]of [[404,404],[503,503]]){const x=load(status);const response=await x.get(new Request(`https://example.test/lazsip/r/${code}`),{params:Promise.resolve({code})});assert.equal(response.status,expected);assert.equal(response.headers.has("Location"),false);}
});
