import assert from "node:assert/strict";
import nextEnv from "@next/env";
import mariadb from "mariadb";
import { SignJWT } from "jose";
import { randomUUID, randomBytes } from "node:crypto";
nextEnv.loadEnvConfig(process.cwd());
const base = new URL(process.env.TEKNISI_TEST_URL ?? "http://localhost:3100");
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname));
const url = new URL(process.env.DATABASE_URL);
const db = await mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: decodeURIComponent(url.pathname.slice(1)) });
const fixtureId = `test-pages-${randomUUID()}`;
const trackingCode = randomBytes(24).toString("hex");
const privateCustomer = `Pelanggan privat ${fixtureId}`;
const privateImei = `IMEI-${fixtureId}`;
const privateNote = `Catatan privat ${fixtureId}`;
try {
  await db.query("INSERT INTO teknisi_outlets (id,name,address,phone) VALUES (?,?,?,?)", [fixtureId, "Outlet pengujian sementara", "Alamat outlet uji", "000"]);
  await db.query("INSERT INTO teknisi_tickets (id,number,trackingToken,outletId,customerName,customerPhone,device,imei,complaint,status,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,NOW(3))", [fixtureId, fixtureId, trackingCode, fixtureId, privateCustomer, "000", "HP pengujian sementara", privateImei, "Keluhan privat", "received"]);
  await db.query("INSERT INTO teknisi_events (id,ticketId,status,note,actorName) VALUES (?,?,?,?,?)", [fixtureId, fixtureId, "received", privateNote, "Staf penguji"]);
  const admin = (await db.query("SELECT id,name FROM users WHERE is_active=TRUE AND is_superadmin=TRUE LIMIT 1"))[0];
  assert.ok(admin, "Superadmin aktif diperlukan untuk pengujian halaman");
  const token = await new SignJWT({ userId: admin.id, name: admin.name, isSuperadmin: true, moduleSlugs: [] }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  for (const route of ["/teknisi", "/teknisi/cek-status", "/admin/teknisi", "/admin/teknisi/tiket", "/admin/teknisi/tiket/baru", `/admin/teknisi/tiket/${fixtureId}`, "/admin/teknisi/outlet", "/admin/teknisi/teknisi", "/admin/teknisi/laporan", "/api/teknisi/ekspor"]) {
    const response = await fetch(new URL(route, base), { headers: { Cookie: `sip_session=${token}` }, redirect: "manual" });
    const body = await response.text();
    assert.equal(response.status, 200, route);
    assert.ok(!body.includes('data-msg=') && !body.includes('NEXT_REDIRECT'), route);
    console.log(`Lulus halaman: ${route}`);
  }
  const tracking = await fetch(new URL(`/teknisi/cek-status?kode=${trackingCode}`, base));
  const publicBody = await tracking.text();
  assert.equal(tracking.status, 200);
  assert.ok(publicBody.includes(fixtureId), "Status tiket harus tampil untuk token yang benar");
  for (const privateValue of [privateCustomer, privateImei, privateNote, "Keluhan privat", "Staf penguji"]) assert.ok(!publicBody.includes(privateValue), "Halaman publik tidak boleh mengambil data privat");
  console.log("Lulus: pelacakan publik tidak mengekspos identitas, IMEI, keluhan, atau catatan internal.");
  const denied = await fetch(new URL("/api/teknisi/ekspor", base), { redirect: "manual" });
  assert.equal(denied.status, 403);
  const login = await fetch(new URL("/admin/teknisi", base), { redirect: "manual" });
  assert.equal(login.status, 307);
  assert.ok(login.headers.get("location").includes("/admin/login"));
  console.log("Lulus: API menolak tanpa sesi dan admin mengarahkan ke login.");
} finally {
  await db.query("DELETE FROM teknisi_events WHERE ticketId=?", [fixtureId]);
  await db.query("DELETE FROM teknisi_tickets WHERE id=?", [fixtureId]);
  await db.query("DELETE FROM teknisi_outlets WHERE id=?", [fixtureId]);
  await db.end();
}
