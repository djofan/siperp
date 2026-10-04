import assert from "node:assert/strict";
import test from "node:test";

// Run against the local dev server with ACADEMY_HTTP_TEST=1.
// No accounts, module settings, or permissions are changed by these checks.
test("academy auth pages and registration stay reachable during maintenance", {
  skip: process.env.ACADEMY_HTTP_TEST !== "1", timeout: 60000,
}, async () => {
  const base = new URL(process.env.ACADEMY_TEST_URL ?? "http://localhost:3000");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
  const get = async (path: string) => {
    const response = await fetch(new URL(path, base), { redirect: "manual" });
    assert.equal(response.status, 200, `${path} must render without a maintenance redirect`);
    return response.text();
  };
  const home = await get("/academy");
  assert.match(home, /href="\/academy\/daftar"/);
  assert.doesNotMatch(home, /href="https:\/\/wa\.me\/[^\"]*"[^>]*>\s*Daftar/);
  const login = await get("/academy/masuk");
  assert.match(login, /id="academy-login-password"/);
  const register = await get("/academy/daftar");
  assert.match(register, /id="academy-register-password"/);
  const form = new FormData();
  const decode = (value: string) => value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  for (const input of register.matchAll(/<input\b[^>]*>/g)) {
    const name = input[0].match(/\bname="([^"]+)"/)?.[1];
    if (!name?.startsWith("$ACTION_")) continue;
    const value = input[0].match(/\bvalue="([^"]*)"/)?.[1] ?? "";
    form.append(decode(name), decode(value));
  }
  assert.ok([...form.keys()].some(key => key.startsWith("$ACTION_")));
  form.set("name", "");
  form.set("email", "invalid");
  form.set("password", "");
  form.set("confirmPassword", "");
  const submitted = await fetch(new URL("/academy/daftar", base), {
    method: "POST", body: form, redirect: "manual", headers: { Origin: base.origin },
  });
  assert.equal(submitted.status, 200, "registration must validate the form instead of redirecting to maintenance");
  assert.match(await submitted.text(), /Isi nama dan alamat email yang valid\./);
  const invalidLogin = await fetch(new URL("/api/auth/login", base), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "missing@academy-test.invalid", password: "invalid-password" }),
  });
  assert.equal(invalidLogin.status, 401);
});
