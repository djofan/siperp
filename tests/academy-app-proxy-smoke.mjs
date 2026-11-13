// Run after npm run build. Uses only a local stub API, no real accounts or database.
import http from 'node:http';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const nativeFetch=global.fetch;global.fetch=(url,options={})=>nativeFetch(url,{...options,headers:{...options.headers,'X-Forwarded-Proto':'https','X-Forwarded-Host':'erp.example.test'}});
const server=http.createServer((req,res)=>{const path=new URL(req.url,'http://localhost').pathname;let data=[];
if(path.endsWith('/availability'))data=true;
if(path.endsWith('/settings/learning'))data={csPhone:'628111186626',weights:{DAILY:35,WEEKLY:30,FINAL:35}};
if(path.endsWith('/auth/me'))data={userId:'qa',name:'Peserta QA',isSuperadmin:false,moduleSlugs:['academy'],moduleRoles:{academy:'participant'}};
if(path.endsWith('/viewer'))data={id:'qa',name:'Peserta QA',isTeacher:false,isSuperadmin:false,moduleAccess:[{role:'participant'}],academyProfile:{id:'qa-profile',nis:'QA001',mustChangePassword:false,deletedAt:null}};
if(path.endsWith('/materials'))data={items:[],total:0,page:1,pages:1};
res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data}));});
server.listen(8119,'127.0.0.1');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','-p','3109'],{cwd:process.cwd(),env:{...process.env,LARAVEL_API_URL:'http://127.0.0.1:8119/api/v1'},stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
(async()=>{try{let ready=false;for(let i=0;i<60;i++){try{await fetch('http://127.0.0.1:3109/academy-app/manifest.webmanifest');ready=true;break;}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready,logs);
let r=await fetch('http://127.0.0.1:3109/academy-app',{redirect:'manual'});if([307,308].includes(r.status)){assert.equal(new URL(r.headers.get('location'),r.url).pathname,'/academy-app/login');}else{const body=await r.text();assert.equal(r.status,200);assert(body.includes('/academy-app/login'),body.slice(-2000));}
r=await fetch('http://127.0.0.1:3109/academy-app/login');let html=await r.text();assert.equal(r.status,200);assert(html.includes('/academy-app/manifest.webmanifest'));assert(html.includes('Insan Academy'));
r=await fetch('http://127.0.0.1:3109/academy-app/beranda',{headers:{Cookie:'sip_session=qa-only'}});html=await r.text();assert.equal(r.status,200,html.slice(-2000));assert(html.includes('Ahlan wa sahlan, Peserta QA'));assert(html.includes('Navigasi cepat Academy'));assert(html.includes('href="/academy-app/materi"'));assert(!html.includes('href="/academy/materi"'));
r=await fetch('http://127.0.0.1:3109/academy/masuk');assert.equal(r.status,200);html=await r.text();assert(html.includes('/academy/manifest.webmanifest'));
r=await fetch('http://127.0.0.1:3109/academy-app/sw.js');assert.equal(r.status,200);assert((await r.text()).includes('academy-app-public-v1'));
r=await fetch('http://127.0.0.1:3109/academy-app/login?terdaftar=1');html=await r.text();assert.equal(r.status,200);assert(html.includes('Pendaftaran berhasil'));
r=await fetch('http://127.0.0.1:3109/academy-app/beranda',{headers:{Cookie:'sip_session=qa-only',RSC:'1'}});assert.equal(r.status,200);assert(r.headers.get('content-type').includes('text/x-component'));
console.log('PASS: TLS-terminated loopback production guest redirect, app login, authenticated shared dashboard, app navigation, web login and service worker.');
}catch(e){console.error(e.message);console.error(logs);process.exitCode=1;}finally{child.kill();server.close();}})();
