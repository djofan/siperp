import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { SignJWT } from "jose";
import { cleanupParticipantFixtures, sequenceSnapshot, trackNumber } from "../tests/helpers/participant-fixtures";
import type { ParticipantModule } from "../modules/core/participant-policy";
loadEnvConfig(process.cwd());
async function main() {
  const { prisma } = await import("../lib/prisma");
  const { createParticipantAccount } = await import("../modules/core/participant-accounts");
  const base = new URL(process.env.PARTICIPANT_TEST_URL ?? "http://localhost:3100");
  assert.ok(["localhost", "127.0.0.1"].includes(base.hostname));
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL!).hostname), "Fixture hanya untuk database lokal");
  const users: string[] = [];
  const outlets: string[] = [];
  const before = await sequenceSnapshot(prisma), issued = new Map<ParticipantModule, number>();
  const accounts: { moduleSlug: "academy" | "teknisi"; nip: string; userId: string; name: string }[] = [];
  const password = "Simulasi-password-2026";
  try {
    for (const moduleSlug of ["academy", "teknisi"] as const) {
      const data = new FormData();
      const name = `Uji publik ${moduleSlug} ${Date.now()}`;
      for (const [key, value] of Object.entries({ name, address: "Alamat pengujian sementara", phone: `08${randomInt(1000000000, 9999999999)}`, password, gender: "IKHWAN" })) data.set(key, value);
      if (moduleSlug === "teknisi") {
        const outlet = await prisma.teknisiOutlet.create({ data: { name, address: "Outlet uji", phone: "000" } });
        outlets.push(outlet.id); data.set("outletId", outlet.id);
      }
      const account = await createParticipantAccount(moduleSlug, data);
      users.push(account.userId); accounts.push({ moduleSlug, ...account, name });
      trackNumber(issued, moduleSlug, account.nip);
    }
    const admin = await prisma.user.findFirstOrThrow({ where: { isSuperadmin: true, isActive: true }, select: { id: true, name: true } });
    const adminToken = await new SignJWT({ userId: admin.id, name: admin.name, isSuperadmin: true, moduleSlugs: [] }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(process.env.SESSION_SECRET));
    for (const [path, publicLinks] of [["/admin", 0], ["/admin/super", 0], ["/admin/academy/pendaftaran", 1], ["/admin/teknisi/teknisi", 1]] as const) {
      const response = await fetch(new URL(path, base), { headers: { Cookie: `sip_session=${adminToken}` } });
      const body = await response.text();
      assert.equal(response.status, 200, path);
      assert.equal([...body.matchAll(/<a\b[^>]*>\s*Lihat website publik[\s\S]*?<\/a>/g)].length, publicLinks, path);
      console.log("Lulus panel:", path);
    }
    for (const account of accounts) {
      const loginPage = await fetch(new URL(`/${account.moduleSlug}/masuk`, base));
      const loginBody = await loginPage.text();
      assert.equal(loginPage.status, 200);
      assert.ok(loginBody.includes("Tampilkan password") && loginBody.includes('type="password"') && loginBody.includes('name="nip"'));
      const login = await fetch(new URL(`/api/${account.moduleSlug}/masuk`, base), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nip: account.nip, password }) });
      assert.equal(login.status, 200, `${account.moduleSlug} login`);
      const loginResult = await login.json();
      if (account.moduleSlug === "teknisi") assert.equal(loginResult.nextPath, "/teknisi/panel");
      const cookie = login.headers.get("set-cookie")?.split(";")[0];
      assert.ok(cookie);
      const portalPath = account.moduleSlug === "academy" ? "/academy/belajar" : "/teknisi/panel";
      const portal = await fetch(new URL(portalPath, base), { headers: { Cookie: cookie } });
      const body = await portal.text();
      assert.equal(portal.status, 200, portalPath);
      assert.ok(body.includes(account.name));
      assert.ok(!body.includes(accounts.find(other => other.moduleSlug !== account.moduleSlug)!.name));
      if (account.moduleSlug === "teknisi") {
        assert.ok(!/<a\b[^>]*href="\/admin(?:\/|")/.test(body), "Panel teknisi tidak boleh menampilkan tautan admin");
        assert.ok(!body.includes(">SIP Admin<"), "Panel teknisi harus memakai identitas website sendiri");
      }
      const denied = await fetch(new URL("/admin/academy/pendaftaran", base), { headers: { Cookie: cookie }, redirect: "manual" });
      assert.equal(denied.status, 307, "Akun peserta atau teknisi tidak boleh mengelola peserta Academy");
      if (account.moduleSlug === "teknisi") {
        const foreign = await prisma.teknisiOutlet.create({ data: { name: `PRIVATE-OUTLET-${Date.now()}`, address: "Outlet lain", phone: "000" } });
        outlets.push(foreign.id);
        const privateName = `PRIVATE-CUSTOMER-${Date.now()}`;
        await prisma.teknisiTicket.create({ data: { outletId: foreign.id, number: privateName, trackingToken: privateName, customerName: privateName, customerPhone: "000", device: "HP privat", complaint: "Privat" } });
        const filtered = await fetch(new URL(`/teknisi/panel/tiket?outlet=${foreign.id}`, base), { headers: { Cookie: cookie } });
        assert.equal(filtered.status, 200);
        assert.ok(!(await filtered.text()).includes(privateName), "Filter outlet tidak boleh menembus cakupan akun teknisi");
        for (const page of ["/teknisi/panel/tiket/baru", "/teknisi/panel/laporan", "/teknisi/panel/outlet", "/teknisi/panel/profil"]) {
          const operatorResponse: Response = await fetch(new URL(page, base), { headers: { Cookie: cookie } });
          const html = await operatorResponse.text();
          assert.equal(operatorResponse.status, 200, page);
          assert.ok(!/<a\b[^>]*href="\/admin(?:\/|")/.test(html), page);
        }
        for (const oldPage of ["/admin/teknisi", "/admin"]) {
          const legacyResponse: Response = await fetch(new URL(oldPage, base), { headers: { Cookie: cookie } });
          assert.equal(new URL(legacyResponse.url).pathname, "/teknisi/panel", "Alamat admin lama harus mengarahkan teknisi ke website outlet");
        }
        const noSession = await fetch(new URL("/teknisi/panel", base), { redirect: "manual" });
        assert.equal(noSession.status, 307);
        assert.ok(noSession.headers.get("location")?.includes("/teknisi/masuk"));
      }
      const wrong = await fetch(new URL(`/api/${account.moduleSlug}/masuk`, base), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nip: account.nip, password: "salah" }) });
      assert.equal(wrong.status, 401);
      console.log("Lulus login, portal peserta, dan proteksi admin:", account.moduleSlug);
    }
  } finally {
    await cleanupParticipantFixtures(prisma, users, outlets, before, issued);
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
