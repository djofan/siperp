import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function moduleAt(path, require = () => { throw Error('unexpected import'); }) {
 const mod = { exports: {} };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,require,Headers,URL,Response,process});
 return mod.exports;
}
const nav = moduleAt('modules/academy/pwa/navigation.ts');
test('app paths preserve nested routes, queries and web boundaries',()=>{
 assert.equal(nav.canonicalAcademyPath('/academy-app'),'/academy/lanjut');
 assert.equal(nav.canonicalAcademyPath('/academy-app/login'),'/academy/masuk');
 assert.equal(nav.canonicalAcademyPath('/academy-app/beranda'),'/academy/belajar');
 for(const path of ['/academy/kuis/id/percobaan/a?x=1#soal','/academy/materi/id']) assert.equal(nav.academyHref(path,'/academy-app'),path.replace('/academy','/academy-app'));
 assert.equal(nav.academyHref('/academy/masuk?next=x','/academy-app'),'/academy-app/login?next=x');
 for(const path of ['/admin/academy','/api/academy','https://other.test/academy','//other.test/academy','/academy-other']) assert.equal(nav.academyHref(path,'/academy-app'),path);
 assert.equal(nav.isAcademyAppPath('/academy-app-other'),false);
 assert.equal(nav.academyHref('/academy/materi','/academy'),'/academy/materi');
});
test('proxy marks app requests without an absolute self-proxy or forged surface header',async()=>{
 const response={rewrite:(url,opts)=>({kind:'rewrite',url,opts}),next:opts=>({kind:'next',opts}),redirect:()=>({kind:'redirect'})};
 const {proxy}=moduleAt('proxy.ts',id=>id==='next/server'?{NextResponse:response}:id.includes('pwa/navigation')?nav:{SESSION_COOKIE_NAME:'session',verifySessionToken:async()=>null});
 for(const method of ['GET','POST']){
 const url=new URL('https://example.test/academy-app/kuis/id?x=1');url.clone=()=>new URL(url);
 const result=await proxy({nextUrl:url,headers:new Headers({'x-siperp-academy-surface':'web'}),method});
 assert.equal(result.kind,'next');assert.equal(url.pathname,'/academy-app/kuis/id');assert.equal(url.search,'?x=1');assert.equal(result.opts.request.headers.get(nav.academySurfaceHeader),'app');
 }
 for(const path of ['/academy/materi','/academy-app/sw.js','/academy-app/manifest.webmanifest','/academy-app/offline.html']){
 const result=await proxy({nextUrl:{pathname:path},headers:new Headers({'x-siperp-academy-surface':'app'})});
 assert.equal(result.kind,'next');assert.equal(result.opts.request.headers.get(nav.academySurfaceHeader),path.startsWith('/academy-app/')?'app':'web');
 }
});
test('app manifest launches inside its own scope',()=>{
 const {academyAppManifest:m}=moduleAt('modules/academy/pwa/manifest.ts');
 assert.equal(m.scope,'/academy-app/');assert.equal(m.start_url,'/academy-app/lanjut');
 assert(m.shortcuts.every(s=>s.url.startsWith(m.scope)));
});
function worker(fail=false){
 const handlers={},written=[],deleted=[];
 const cache={addAll:async files=>written.push(...files),match:async()=>new Response('offline')};
 vm.runInNewContext(fs.readFileSync('public/academy-app/sw.js','utf8'),{URL,Response,fetch:async()=>{if(fail)throw Error('offline');return new Response('live');},caches:{open:async()=>cache,keys:async()=>['academy-app-public-old','academy-pwa-public-old','bantuan-shell'],delete:async k=>deleted.push(k)},self:{location:{origin:'https://example.test'},clients:{claim:async()=>{}},skipWaiting(){},addEventListener:(k,fn)=>handlers[k]=fn}});
 return {handlers,written,deleted};
}
test('app worker isolates caches and never caches private content',async()=>{
 const w=worker();let pending;
 w.handlers.install({waitUntil:p=>pending=p});await pending;
 assert(w.written.every(p=>p==='/academy-app/offline.html'||p.startsWith('/academy-pwa/icon-')));
 w.handlers.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(w.deleted,['academy-app-public-old']);
 for(const [path,method,mode] of [['/api/academy/files/id','GET','cors'],['/academy-app/kuis/id','POST','navigate'],['/bantuan-app','GET','navigate'],['/academy/materi','GET','navigate'],['/academy-app/kuis','GET','cors']]){
 let intercepted=false;w.handlers.fetch({request:{url:'https://example.test'+path,method,mode},respondWith(){intercepted=true;}});assert.equal(intercepted,false,path);
 }
 for(const fail of [false,true]){const x=worker(fail);let result;x.handlers.fetch({request:{url:'https://example.test/academy-app/materi',method:'GET',mode:'navigate'},respondWith:p=>result=p});assert.equal(await(await result).text(),fail?'offline':'live');assert.equal(x.written.length,0);}
});

test('Academy aliases use path-only rewrites behind TLS and preserve static app assets',async()=>{
 const config=moduleAt('next.config.ts').default;
 const routes=await config.rewrites();
 const aliases=routes.afterFiles.filter(route=>route.source.startsWith('/academy-app'));
 assert.deepEqual(JSON.parse(JSON.stringify(aliases)),[
 {source:'/academy-app',destination:'/academy/lanjut'},
 {source:'/academy-app/login',destination:'/academy/masuk'},
 {source:'/academy-app/beranda',destination:'/academy/belajar'},
 {source:'/academy-app/:path*',destination:'/academy/:path*'}]);
 assert(aliases.every(route=>route.destination.startsWith('/')&&!route.destination.startsWith('//')));
 assert(!routes.beforeFiles.some(route=>route.source.startsWith('/academy-app')));
 const headers=await config.headers();assert(headers.some(route=>route.source==='/academy-app/:path*'&&route.headers.some(header=>header.key==='Cache-Control'&&header.value.includes('no-store'))));
});
