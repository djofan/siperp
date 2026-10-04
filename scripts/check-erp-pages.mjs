import assert from "node:assert/strict";
import nextEnv from "@next/env";
import mariadb from "mariadb";
import { SignJWT } from "jose";
nextEnv.loadEnvConfig(process.cwd());
const base = new URL(process.env.ERP_TEST_URL ?? "http://localhost:3000"), url = new URL(process.env.DATABASE_URL);
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname));
const db = await mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) });
try {
  const admin = (await db.query("SELECT id,name FROM users WHERE is_active=TRUE AND is_superadmin=TRUE LIMIT 1"))[0];
  const token = await new SignJWT({userId:admin.id,name:admin.name,isSuperadmin:true,moduleSlugs:[]}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  for (const route of ["/admin/super", "/admin/super/kontak", "/admin/super/keuangan", "/admin/super/backup"]) {
    const response = await fetch(new URL(route,base), {headers:{Cookie:"sip_session="+token}});
    const html = await response.text();
    assert.equal(response.status,200,route); assert.ok(!html.includes('data-msg=') && !html.includes('NEXT_REDIRECT'),route);
    console.log("PASS: "+base.origin+route);
  }
} finally { await db.end(); }
