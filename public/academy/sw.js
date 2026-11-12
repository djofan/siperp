/* Only public installation assets are cached. API, authenticated HTML,
   audio, questions, answers and mutation requests always use the network. */
const CACHE = "academy-pwa-public-v1";
const OFFLINE = "/academy-pwa/offline.html";
const PUBLIC_FILES = [OFFLINE, "/academy-pwa/icon-192.png", "/academy-pwa/icon-512.png", "/academy-pwa/icon-maskable.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_FILES)));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("academy-pwa-public-") && key !== CACHE).map(key => caches.delete(key)),
  )).then(() => self.clients.claim()));
});
self.addEventListener("message", event => {
  if (event.data?.type === "ACADEMY_SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (PUBLIC_FILES.includes(url.pathname) && !url.search) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(request)) || fetch(request)));
    return;
  }
  if (request.mode === "navigate" && url.pathname.startsWith("/academy/")) {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.open(CACHE)).match(OFFLINE).then(page => page || new Response(
        "Koneksi terputus. Sambungkan internet dan muat ulang.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      )),
    ));
  }
});
