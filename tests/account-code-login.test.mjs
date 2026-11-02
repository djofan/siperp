import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";

const require=createRequire(import.meta.url),ts=require("typescript"),React=require("react");
const {renderToStaticMarkup}=require("react-dom/server");
function load(filename, overrides={},cache=new Map()){
  const full=path.resolve(filename);
  if(cache.has(full))return cache.get(full).exports;
  const module={exports:{}};cache.set(full,module);
  const localRequire=id=>{
    if(id==="@/lib/session"&&Object.hasOwn(overrides,"session"))return{SESSION_COOKIE_NAME:"sip_session",verifySessionToken:async()=>overrides.session};
    if(id==="react"&&overrides.react)return overrides.react;
    if(id==="next/navigation")return{useRouter:()=>({replace(){},push(){},refresh(){}})};
    if(id==="next/link")return{__esModule:true,default:({children,...props})=>React.createElement("a",props,children)};
    if(id.endsWith(".css"))return{__esModule:true,default:new Proxy({},{get:(_,key)=>key})};
    if(id.startsWith(".")||id.startsWith("@/")){
      const root=id.startsWith("@/")?path.resolve(id.slice(2)):path.resolve(path.dirname(full),id);
      return load([root,root+".ts",root+".tsx"].find(p=>existsSync(p)),overrides,cache);
    }
    return require(id);
  };
  const code=ts.transpileModule(readFileSync(full,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  class TestFormData{constructor(form){this.values=form.values;}get(key){return this.values[key]??null;}}
  vm.runInNewContext(code,{module,exports:module.exports,require:localRequire,fetch:overrides.fetch,FormData:TestFormData,URL,window:{location:{assign(){}}}},{filename:full});
  return module.exports;
}
function findForm(node){
  if(!node||typeof node!=="object")return null;
  if(node.type==="form")return node;
  return [node.props?.children].flat(Infinity).map(findForm).find(Boolean);
}

test("every login screen asks for a code and never offers email fallback",()=>{
  const cases=[
    ["components/admin-shell/LoginForm.tsx","LoginForm",{}],
    ["components/auth/ParticipantLoginForm.tsx","ParticipantLoginForm",{moduleSlug:"academy",successHref:"/academy/lanjut"}],
    ["components/auth/ParticipantLoginForm.tsx","ParticipantLoginForm",{moduleSlug:"teknisi",successHref:"/teknisi/panel"}],
    ["modules/tanwir/components/site/LoginForm.tsx","LoginForm",{}],
    ["modules/ojol/components/site/LoginForm.tsx","LoginForm",{}],
  ];
  for(const[file,name,props]of cases){
    const html=renderToStaticMarkup(React.createElement(load(file)[name],props));
    assert.match(html,/Kode akun/,file);
    assert.match(html,/<input[^>]*name="code"/,file);
    assert.match(html,/autoComplete="username"/,file);
    assert.doesNotMatch(html,/type="email"|name="email"|menggunakan email/,file);
  }
});

test("all login forms submit the normalized code and the unchanged password",async()=>{
  for(const module of ["core","academy","teknisi","tanwir","ojol"]){
    const calls=[];
    let index=0;
    const states=module==="core"?[" sip-000123 "," exact password "]:[];
    const react={...React,useState:initial=>[index<states.length?states[index++]:(typeof initial==="function"?initial():initial),()=>{}]};
    const fetch=async(url,options)=>{calls.push([url,JSON.parse(options.body)]);return{ok:true,json:async()=>({data:{},nextPath:module==="teknisi"?"/teknisi/panel":"/academy/lanjut",redirectTo:"/"+module})};};
    const file=module==="core"?"components/admin-shell/LoginForm.tsx":["academy","teknisi"].includes(module)?"components/auth/ParticipantLoginForm.tsx":`modules/${module}/components/site/LoginForm.tsx`;
    const exports=load(file,{react,fetch});
    const component=exports.ParticipantLoginForm??exports.LoginForm;
    const form=findForm(component({moduleSlug:module,successHref:"/academy/lanjut"}));
    await form.props.onSubmit({preventDefault(){},currentTarget:{values:{code:" sip-000123 ",password:" exact password "}}});
    assert.equal(calls.length,1,module);
    assert.deepEqual(calls[0][1],{code:"SIP-000123",password:" exact password "},module);
  }
});

test("Core creates regular AMSIP admins and does not expose a second-superadmin switch",()=>{
  const {AkunForm}=load("components/admin-shell/AkunForm.tsx");
  const html=renderToStaticMarkup(React.createElement(AkunForm,{modules:[{id:"sip",name:"SIP"}]}));
  assert.match(html,/Kode admin AMSIP/);
  assert.match(html,/SASIP01/);
  assert.doesNotMatch(html,/Jadikan superadmin|Otomatis akses semua modul/);
});

test("module account management shows only the authorized roles and native registration links",()=>{
  const {ModuleAccounts}=load("components/admin-shell/ModuleAccounts.tsx");
  const simple=renderToStaticMarkup(React.createElement(ModuleAccounts,{initial:{modules:[{id:"sip",name:"SIP",slug:"sip",roles:{editor:"Editor konten"},links:[]}],accounts:[]}}));
  assert.match(simple,/Buat akun operasional SIP/);
  assert.match(simple,/value="editor"/);
  assert.doesNotMatch(simple,/value="admin"|name="isSuperadmin"|name="moduleIds"/);
  const native=renderToStaticMarkup(React.createElement(ModuleAccounts,{initial:{modules:[{id:"bantuan",name:"Bantuan",slug:"bantuan",roles:{},links:[{label:"Kelola tim Bantuan",href:"/admin/bantuan/tim"}]}],accounts:[]}}));
  assert.match(native,/href="\/admin\/bantuan\/tim"/);
  assert.doesNotMatch(native,/<form/);
});

test("the real proxy permits admin account management but still denies foreign modules and superadmin pages",async()=>{
  const {NextRequest}=require("next/server");
  const admin={userId:"admin",name:"Admin",code:"AMSIP0001",isSuperadmin:false,moduleSlugs:["sip"],moduleRoles:{sip:"admin"}};
  for(const [session,target,status] of [[admin,"/admin/akun-modul",200],[admin,"/admin/modul",200],[admin,"/admin/lazsip",307],[admin,"/admin/super",307],[{...admin,moduleRoles:{sip:"editor"}},"/admin/akun-modul",307]]){
    const {proxy}=load("proxy.ts",{session});
    const response=await proxy(new NextRequest("http://localhost:3000"+target,{headers:{cookie:"sip_session=test"}}));
    assert.equal(response.status,status,target);
  }
});
