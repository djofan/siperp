import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source = fs.readFileSync("public/academy/sw.js", "utf8");
function worker(fail = false) {
  const handlers = {}, writes = [], deleted = [];
  const cache = { addAll: async files => writes.push(...files), match: async () => new Response("offline") };
  const context = { URL, Response,
    fetch: async () => { if (fail) throw new Error("offline"); return new Response("private response"); },
    caches: { open: async () => cache, keys: async () => ["academy-pwa-public-old", "bantuan-pwa-shell-v1"], delete: async key => { deleted.push(key); } },
    self: { location: { origin: "https://erp.example.test" }, clients: { claim: async () => {} }, skipWaiting() {}, addEventListener: (type, callback) => { handlers[type] = callback; } },
  };
  vm.runInNewContext(source, context);
  return { handlers, writes, deleted };
}
test("Academy worker caches only public assets and never deletes another module cache", async () => {
  const w = worker();
  let pending;
  w.handlers.install({ waitUntil: promise => { pending = promise; } }); await pending;
  assert(w.writes.every(path => path.startsWith("/academy-pwa/")));
  w.handlers.activate({ waitUntil: promise => { pending = promise; } }); await pending;
  assert.deepEqual(w.deleted, ["academy-pwa-public-old"]);
});
test("private API, audio, mutations and another PWA are not intercepted", () => {
  const w = worker();
  for (const [url, method, mode] of [
    ["/api/academy/learning/discussions", "GET", "cors"],
    ["/api/academy/files/private-id", "GET", "cors"],
    ["/academy/kuis/attempt", "POST", "navigate"],
    ["/bantuan-app/notifikasi", "GET", "navigate"],
    ["/academy-pwa/icon-192.png?private=1", "GET", "cors"],
  ]) {
    let intercepted = false;
    w.handlers.fetch({ request: { url: "https://erp.example.test" + url, method, mode }, respondWith() { intercepted = true; } });
    assert.equal(intercepted, false, url);
  }
});
test("Academy navigations use live network responses and generic offline fallback", async () => {
  for (const fail of [false, true]) {
    const w = worker(fail); let response;
    w.handlers.fetch({ request: { url: "https://erp.example.test/academy/kuis", method: "GET", mode: "navigate" }, respondWith: promise => { response = promise; } });
    assert.equal(await (await response).text(), fail ? "offline" : "private response");
    assert.equal(w.writes.length, 0);
  }
});
test("manifest uses module scope, role-aware launch and valid PNG dimensions", () => {
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("modules/academy/pwa/manifest.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: mod, exports: mod.exports, Response });
  const manifest = mod.exports.academyManifest;
  assert.equal(manifest.scope, "/academy/"); assert.equal(manifest.start_url, "/academy/lanjut");
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) {
    const bytes = fs.readFileSync("public" + icon.src);
    assert.equal(bytes.readUInt32BE(16) + "x" + bytes.readUInt32BE(20), icon.sizes);
  }
});
