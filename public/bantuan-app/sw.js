/* Cache only the public offline page and icons. Authenticated HTML, API and photos always use network. */
const CACHE = "bantuan-pwa-shell-dashboard-v1";
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

// FCM Web registration uses this existing worker. Receive the standard Push API
// payload directly so Firebase cannot auto-display a message before session checks.
self.addEventListener("message",event=>{
  if(event.data?.type==="BANTUAN_PUSH_CAPABILITIES")event.ports?.[0]?.postMessage({pushVersion:2});
});
self.addEventListener("push",event=>{
  event.waitUntil((async()=>{
    let payload;try{payload=event.data?.json();}catch{return;}
    const data=payload?.data;
    if(data?.type!=="bantuan_pwa"||typeof data.binding!=="string"||typeof data.notification_id!=="string")return;
    try {
      const response=await fetch("/api/bantuan/pwa/push-context",{credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json"}});
      if(!response.ok)return;
      const {data:context}=await response.json();
      // Drop already queued messages after logout, account switch or access revocation.
      if(!context?.enabled||!context.registered||context.binding!==data.binding)return;
      await self.registration.showNotification("Bantuan SIP",{
        body:"Ada pembaruan bantuan. Buka aplikasi untuk melihatnya.",
        icon:"/bantuan-app/icon-192.png",badge:"/bantuan-app/icon-192.png",
        tag:"bantuan-"+data.notification_id,
        data:{type:"bantuan_pwa"},
      });
      for(const client of await self.clients.matchAll({type:"window",includeUncontrolled:true})){
        const url=new URL(client.url);
        if(url.origin===self.location.origin&&url.pathname.startsWith("/bantuan-app/"))client.postMessage({type:"BANTUAN_PUSH_RECEIVED"});
      }
    }catch{/* Fail closed when the live session cannot be checked. */}
  })());
});
self.addEventListener("notificationclick",event=>{
  if(event.notification.data?.type!=="bantuan_pwa")return;
  event.notification.close();
  event.waitUntil((async()=>{
    const target=new URL("/bantuan-app/notifikasi",self.location.origin).href;
    for(const client of await self.clients.matchAll({type:"window",includeUncontrolled:true})){
      const url=new URL(client.url);
      if(url.origin===self.location.origin&&url.pathname.startsWith("/bantuan-app/")){
        await client.navigate(target);await client.focus();return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
