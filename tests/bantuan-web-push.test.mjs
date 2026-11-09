import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const ts = createRequire(import.meta.url)("typescript");
function browser({ granted = true, existing = true, failSave = false } = {}) {
  const calls = [];
  const subscription = {
    endpoint: "https://fcm.googleapis.com/fcm/send/test",
    options: {},
    toJSON: () => ({ endpoint: subscription.endpoint, keys: { p256dh: "public", auth: "secret" } }),
    unsubscribe: async () => { calls.push("unsubscribe"); return true; },
  };
  const registration = { active: {}, pushManager: {
    getSubscription: async () => existing ? subscription : null,
    subscribe: async options => { calls.push({ subscribe: options }); return subscription; },
  }, getNotifications: async () => [{ close: () => calls.push("close") }] };
  const context = { exports: {}, Uint8Array, atob, window: { isSecureContext: true, PushManager: {}, Notification: {} },
    navigator: { serviceWorker: { getRegistration: async () => registration } },
    require: () => ({ pwaRequest: async (path, init) => { calls.push({ path, ...init }); if (failSave) throw new Error("offline"); } }),
  };
  vm.runInNewContext(ts.transpileModule(readFileSync("modules/bantuan/pwa/web-push.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  return { api: context.exports, calls, context, subscription, permission: granted ? "granted" : "denied" };
}

test("browser push asks for no subscription when permission is denied", async () => {
  const b = browser({ granted: false });
  await assert.rejects(b.api.enableWebPush("BA", b.permission), /Izin notifikasi/);
  assert.equal(b.calls.length, 0);
});

test("browser push binds an existing subscription via the cookie-authenticated API without creating another", async () => {
  const b = browser();
  await b.api.enableWebPush("BA", b.permission);
  assert.equal(b.calls.length, 1);
  assert.equal(b.calls[0].path, "web-push/subscriptions");
  assert.equal(b.calls[0].method, "POST");
  assert.equal(JSON.parse(b.calls[0].body).endpoint, b.subscription.endpoint);
});

test("new browser subscription uses VAPID and user-visible notifications", async () => {
  const b = browser({ existing: false });
  await b.api.enableWebPush("BA", b.permission);
  assert.equal(b.calls[0].subscribe.userVisibleOnly, true);
  assert.equal(b.calls[0].subscribe.applicationServerKey[0], 4);
  assert.equal(b.calls[1].method, "POST");
});

test("disable removes the server registration then unsubscribes and closes displayed notifications", async () => {
  const b = browser();
  await b.api.disableWebPush();
  assert.equal(b.calls[0].method, "DELETE");
  assert.deepEqual(b.calls.slice(1), ["unsubscribe", "close"]);
  const offline = browser({ failSave: true });
  await assert.rejects(offline.api.disableWebPush(), /offline/);
  assert.equal(offline.calls.includes("unsubscribe"), false);
});

test("push requires a secure supported browser", () => {
  const b = browser();
  assert.equal(b.api.supportsWebPush(), true);
  b.context.window.isSecureContext = false;
  assert.equal(b.api.supportsWebPush(), false);
});
