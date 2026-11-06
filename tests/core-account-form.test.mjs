import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";

const require = createRequire(import.meta.url), ts = require("typescript"), React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const modules = [{ id: "sip", slug: "sip", name: "SIP" }, { id: "bantuan", slug: "bantuan", name: "Pengajuan Bantuan" }];
function load(filename, overrides = {}, cache = new Map()) {
  const full = path.resolve(filename);
  if (cache.has(full)) return cache.get(full).exports;
  const module = { exports: {} }; cache.set(full, module);
  function localRequire(id) {
    if (id === "react") return overrides.react ?? React;
    if (id === "next/navigation") return { useRouter: () => overrides.router ?? { push() {}, refresh() {} } };
    if (id === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) };
    if (id.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    if (id.startsWith(".") || id.startsWith("@/")) {
      const root = id.startsWith("@/") ? path.resolve(id.slice(2)) : path.resolve(path.dirname(full), id);
      return load([root, root + ".ts", root + ".tsx"].find(file => existsSync(file)), overrides, cache);
    }
    return require(id);
  }
  const code = ts.transpileModule(readFileSync(full, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, fetch: overrides.fetch }, { filename: full });
  return module.exports;
}
function formHarness(fetch, account) {
  const routes = [], changes = [], lock = { current: false };
  const state = ["  Admin Baru  ", account ? "" : "form-test-password", false,
    { sip: { enabled: true, role: "admin" }, bantuan: { enabled: false, role: "admin" } }, null, false];
  let index = 0;
  const react = { ...React, useRef: () => lock, useState: () => {
    const slot = index++;
    return [state[slot], value => { changes.push([slot, value]); }];
  } };
  const { AccountForm } = load("components/admin-shell/AccountForm.tsx", { react, fetch, router: { push: route => routes.push(route), refresh() {} } });
  const form = AccountForm({ modules, account });
  return { submit: () => form.props.onSubmit({ preventDefault() {} }), routes, changes };
}

test("create and edit forms expose one save action, readable module choices, and no email field", () => {
  const { AccountForm } = load("components/admin-shell/AccountForm.tsx");
  for (const account of [undefined, { id: "u1", code: "AMSIP0001", name: "Admin", isSuperadmin: false, access: [{ moduleId: "sip", role: "admin" }] }]) {
    const html = renderToStaticMarkup(React.createElement(AccountForm, { modules, account }));
    assert.doesNotMatch(html, /type="email"|name="email"|Jadikan superadmin/);
    assert.equal((html.match(/type="submit"/g) ?? []).length, 1);
    assert.equal((html.match(/type="checkbox"/g) ?? []).length, 2);
    assert.match(html, /Modul yang bisa diakses/);
    assert.match(html, /autoComplete="new-password"/);
  }
});

test("creating an account navigates directly to the account menu with only chosen modules", async () => {
  const calls = [];
  const harness = formHarness(async (url, options) => { calls.push([url, options.method, JSON.parse(options.body)]); return { ok: true }; });
  await harness.submit();
  assert.deepEqual(calls, [["/api/super/akun", "POST", { name: "Admin Baru", password: "form-test-password", moduleIds: ["sip"] }]]);
  assert.deepEqual(harness.routes, ["/admin/super/akun?dibuat=1"]);
});

test("a failed request preserves entered values, releases the pending state, and allows a successful retry", async () => {
  let attempt = 0;
  const harness = formHarness(async () => ++attempt === 1 ? { ok: false, json: async () => ({ error: { details: { name: ["Nama belum valid."] } } }) } : { ok: true });
  await harness.submit();
  assert.deepEqual(harness.routes, []);
  assert.ok(harness.changes.some(([slot, value]) => slot === 4 && value === "Nama belum valid."));
  assert.ok(harness.changes.some(([slot, value]) => slot === 5 && value === false));
  assert.ok(harness.changes.every(([slot]) => slot !== 0 && slot !== 1));
  await harness.submit();
  assert.deepEqual(harness.routes, ["/admin/super/akun?dibuat=1"]);
});

test("edit submits identity and permissions in one request while an empty password and hidden email remain untouched", async () => {
  const calls = [];
  const harness = formHarness(async (url, options) => { calls.push([url, JSON.parse(options.body)]); return { ok: true }; }, { id: "u1", code: "AMSIP0001", name: "Admin", isSuperadmin: false, access: [] });
  await harness.submit();
  assert.deepEqual(calls, [["/api/super/akun/u1", { name: "Admin Baru", entries: [{ moduleId: "sip", role: "admin" }] }]]);
  assert.deepEqual(harness.routes, ["/admin/super/akun?diubah=1"]);
});

test("double clicking save cannot create two accounts", async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let count = 0;
  const harness = formHarness(async () => { count++; await pending; return { ok: true }; });
  const first = harness.submit();
  await harness.submit();
  assert.equal(count, 1);
  release(); await first;
  assert.equal(harness.routes.length, 1);
});

test("operational accounts have no module choices and submit only identity", async () => {
  const account = { id: "staff", code: "SIP001", name: "Petugas", isSuperadmin: false, access: [{ moduleId: "bantuan", role: "call_center" }] };
  const { AccountForm } = load("components/admin-shell/AccountForm.tsx");
  const html = renderToStaticMarkup(React.createElement(AccountForm, { modules, account }));
  assert.doesNotMatch(html, /type="checkbox"/);
  assert.match(html, /Modul akun operasional/);
  const calls = [];
  const harness = formHarness(async (url, options) => { calls.push(JSON.parse(options.body)); return { ok: true }; }, account);
  await harness.submit();
  assert.deepEqual(calls, [{ name: "Admin Baru" }]);
});
