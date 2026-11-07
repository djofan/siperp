import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
const require=createRequire(import.meta.url), ts=require("typescript"), React=require("react");
const {renderToStaticMarkup}=require("react-dom/server");
function harness(file, overrides={}) {
  const state=[],effects=[];let cursor=0;
  const hooks={...React,useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],next=>state[i]=typeof next==="function"?next(state[i]):next];},useRef:()=>({current:null}),useMemo:fn=>fn(),useEffect:fn=>effects.push(fn)};
  const context={exports:{},AbortController,Intl,window:{setInterval:()=>1,clearInterval(){}},document:{visibilityState:"visible",addEventListener(){},removeEventListener(){}},fetch:overrides.fetch,require(id){
    if(id==="react")return hooks;
    if(id==="next/link")return {__esModule:true,default:({children,...props})=>React.createElement("a",props,children)};
    if(id==="next/navigation")return {useRouter:()=>({push(){}})};
    if(id.endsWith(".css"))return {__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})};
    if(id==="../format"||id.includes("components/format"))return {formatRupiah:n=>`Rp${n.toLocaleString("id-ID")}`};
    if(id.includes("feeCalculation"))return {calculateFee:m=>m?.feeAmount??0};
    if(id.includes("uniqueCode"))return {applyUniqueCode:n=>n};
    if(id.includes("donorIdentity"))return {};
    return require(id);
  }};
  vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
  return {state,effects,render(name,props){cursor=0;effects.length=0;return context.exports[name](props);}};
}
function find(node,predicate){if(!node||typeof node!=="object")return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const match=find(child,predicate);if(match)return match;}return null;}
test("donation and zakat defer iPaymu fees without a zero-fee guarantee or cover-fee checkbox",()=>{
  for(const name of ["DonationForm","ZakatPaymentForm"]){
    const h=harness(`modules/lazsip/components/sections/${name}.tsx`);
    const tree=h.render(name,{campaignId:"c1",uniqueCode:"001",feeRefs:[{method:"iPaymu",feeAmount:4000,feePercentage:0}]});
    const html=renderToStaticMarkup(tree);
    assert.match(html,/Mengikuti iPaymu/);assert.match(html,/Nominal diteruskan ke iPaymu/);
    assert.doesNotMatch(html,/Tambahkan Rp|tersalurkan 100%|Ditanggung LAZSIP/);
    assert.equal(find(tree,n=>n.type==="input"&&n.props.type==="checkbox"&&n.props.checked===true),null);
  }
});
test("bell loads authenticated LAZSIP activity, displays status and destinations, and closes",async()=>{
  const calls=[];
  const h=harness("modules/lazsip/components/admin/LazsipNotifications.tsx",{fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({data:{counts:{pendingTransactions:2},newApplicants:1,recent:[{id:"t1",donorName:"Donatur Uji",label:"Zakat Maal",amount:100000,status:"paid",createdAt:"2026-11-07T01:00:00Z"}]}})};}});
  let tree=h.render("LazsipNotifications",{pendingCount:2});
  find(tree,n=>n.type==="button").props.onClick();
  tree=h.render("LazsipNotifications",{pendingCount:2});const cleanup=h.effects[0]();
  await new Promise(resolve=>setImmediate(resolve));
  tree=h.render("LazsipNotifications",{pendingCount:2});const html=renderToStaticMarkup(tree);
  assert.equal(calls[0].url,"/api/lazsip/dashboard?limit=8&days=1");assert.equal(calls[0].options.cache,"no-store");
  assert.match(html,/3 perlu dipantau/);assert.match(html,/Donatur Uji/);assert.match(html,/Lunas/);assert.match(html,/href="\/admin\/lazsip\/pendaftar"/);
  find(tree,n=>n.type==="button"&&n.props["aria-label"]==="Tutup notifikasi").props.onClick();
  assert.equal(h.state[0],false);cleanup();
});
test("bell reports API failure without inventing successful transactions",async()=>{
  const h=harness("modules/lazsip/components/admin/LazsipNotifications.tsx",{fetch:async()=>({ok:false})});
  find(h.render("LazsipNotifications",{pendingCount:0}),n=>n.type==="button").props.onClick();
  h.render("LazsipNotifications",{pendingCount:0});const cleanup=h.effects[0]();await new Promise(resolve=>setImmediate(resolve));
  const html=renderToStaticMarkup(h.render("LazsipNotifications",{pendingCount:0}));assert.match(html,/role="alert"/);assert.doesNotMatch(html,/Belum ada transaksi masuk/);cleanup();
});
