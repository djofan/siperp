/* Cache only the public offline page and icons. Authenticated HTML, API and photos always use network. */
const CACHE = "bantuan-pwa-shell-v1";
const OFFLINE = "/bantuan-app/offline.html";
const PUBLIC_FILES = [OFFLINE,"/bantuan-app/icon-192.png","/bantuan-app/icon-512.png","/bantuan-app/icon-maskable.png"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC_FILES)));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("bantuan-pwa-shell-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting();});
self.addEventListener("fetch",event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=="GET"||url.origin!==self.location.origin)return;
  if(PUBLIC_FILES.includes(url.pathname)&&!url.search){event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request))||fetch(request)));return;}
  if(request.mode==="navigate"&&url.pathname.startsWith("/bantuan-app/")) {
    event.respondWith(fetch(request).catch(async()=>{const page=await caches.match(OFFLINE);return page||new Response("Koneksi terputus. Sambungkan internet dan muat ulang.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});}));
  }
});
