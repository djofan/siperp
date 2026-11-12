import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync('modules/payment/api/openGatewayCheckout.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(fetch){const exports={};vm.runInNewContext(source,{exports,fetch,URL,Error});return exports.openGatewayCheckout;}
test('opens an existing gateway transaction directly without another checkout creation',async()=>{
 const calls=[];const open=load(async(...args)=>{calls.push(args);return {ok:true,json:async()=>({url:'https://payment.ipaymu.com/#/session'})};});
 assert.equal(await open('tx-123'),'https://payment.ipaymu.com/#/session');
 assert.equal(calls.length,1);assert.equal(calls[0][0],'/api/payment/gateway-session/tx-123');assert.equal(calls[0][1].method,'POST');
});
test('propagates safe gateway diagnostics so retries keep the existing transaction',async()=>{
 const open=load(async()=>({ok:false,json:async()=>({error:{message:'Sesi sedang diproses. Jangan membuat transaksi ulang.'}})}));
 await assert.rejects(open('tx-123'),/Sesi sedang diproses/);
});
for(const url of ['javascript:alert(1)','https://ipaymu.com.evil.test/payment/x','https://my.ipaymu.com@evil.test/x','http://payment.ipaymu.com/#/x',null])test(`rejects invalid redirect ${url}`,async()=>{
 const open=load(async()=>({ok:true,json:async()=>({url})}));await assert.rejects(open('tx-123'),/Alamat pembayaran tidak valid/);
});
test('non-JSON gateway failure gives an actionable error',async()=>{
 const open=load(async()=>({ok:false,json:async()=>{throw new Error('HTML');}}));await assert.rejects(open('tx-123'),/transaksi yang sama/);
});
