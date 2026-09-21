import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { getEntry, listPublicDonations } from "@/modules/sarsip/api/data";
import { getTransparency, listPublicBeneficiaries } from "@/modules/sarsip/api/beneficiaries";

test("SARSIP content permissions, publishing, donations and payment isolation", async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
  assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/);
  const tag = randomUUID();
  const name = `Private SAR ${tag}`;
  const phone = `62815${String(Date.now()).slice(-9)}`;
  const method = `SAR test ${tag}`;
  const ids: string[] = [];
  let donorId: string | undefined;
  let uploadedImage: string | undefined;
  let beneficiaryId: string | undefined;
  const admin = await createSessionToken({ userId: tag, name: "Test SAR admin", isSuperadmin: false, moduleSlugs: ["sarsip"] });
  const other = await createSessionToken({ userId: tag, name: "Test LAZSIP admin", isSuperadmin: false, moduleSlugs: ["lazsip"] });
  const request = (path: string, method: string, body?: unknown, token?: string) => fetch(base + path, {
    method, headers: { "Content-Type": "application/json", ...(token ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    const baseline = await getTransparency();
    const beneficiary = { name: `Private beneficiary ${tag}`, phone: "081234567890", location: "Lokasi bantuan", assistance: "Paket pangan", receivedAt: "2026-01-01", notes: `Private notes ${tag}` };
    assert.equal((await request("/api/sarsip/beneficiaries", "POST", beneficiary)).status, 403);
    assert.equal((await request("/api/sarsip/beneficiaries", "POST", beneficiary, other)).status, 403);
    assert.equal((await request("/api/sarsip/beneficiaries", "POST", { ...beneficiary, receivedAt: "2099-01-01" }, admin)).status, 400);
    const beneficiaryResponse = await request("/api/sarsip/beneficiaries", "POST", beneficiary, admin);
    assert.equal(beneficiaryResponse.status, 201, await beneficiaryResponse.clone().text());
    beneficiaryId = (await beneficiaryResponse.json()).id;
    assert.equal((await getTransparency()).beneficiaryCount, baseline.beneficiaryCount + 1);
    assert.equal((await request(`/api/sarsip/beneficiaries/${beneficiaryId}`, "PUT", { ...beneficiary, assistance: "Bantuan evakuasi" }, admin)).status, 200);
    const adminBeneficiaries = await request("/admin/sarsip/beneficiary", "GET", undefined, admin);
    assert.equal(adminBeneficiaries.status, 200);
    assert.ok((await adminBeneficiaries.text()).includes(beneficiary.name));
    const publicHome = await (await fetch(base + "/sarsip")).text();
    assert.ok(publicHome.includes('id="transparansi"'));
    assert.ok(!publicHome.includes(beneficiary.name));
    assert.ok(!publicHome.includes(beneficiary.notes));
    assert.ok(!(await listPublicBeneficiaries()).some((row) => row.id === beneficiaryId));
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==", "base64");
    const upload = (bytes: Uint8Array, type: string, token?: string) => {
      const body = new FormData();
      body.append("file", new Blob([new Uint8Array(bytes)], { type }), "foto.png");
      return fetch(base + "/api/sarsip/upload", { method: "POST", body, headers: token ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {} });
    };
    assert.equal((await upload(png, "image/png")).status, 403);
    assert.equal((await upload(png, "image/png", other)).status, 403);
    assert.equal((await upload(Buffer.from("not an image"), "image/png", admin)).status, 400);
    assert.equal((await upload(png, "image/svg+xml", admin)).status, 400);
    assert.equal((await upload(new Uint8Array(2 * 1024 * 1024 + 1), "image/png", admin)).status, 400);
    const uploaded = await upload(png, "image/png", admin);
    assert.equal(uploaded.status, 201);
    const imageUrl = (await uploaded.json()).url as string;
    assert.match(imageUrl, /^\/uploads\/sarsip\/[a-f0-9-]{36}\.png$/);
    uploadedImage = imageUrl;
    const imageResponse = await fetch(base + imageUrl);
    assert.equal(imageResponse.status, 200);
    assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), png);
    const publicBeneficiary = { ...beneficiary, publicName: `Penerima uji ${tag}`, category: "Evakuasi", amount: 100000, image: imageUrl, isPublished: true };
    assert.equal((await request(`/api/sarsip/beneficiaries/${beneficiaryId}`, "PUT", { ...publicBeneficiary, publicName: "" }, admin)).status, 400);
    assert.equal((await request(`/api/sarsip/beneficiaries/${beneficiaryId}`, "PUT", { ...publicBeneficiary, amount: -1 }, admin)).status, 400);
    assert.equal((await request(`/api/sarsip/beneficiaries/${beneficiaryId}`, "PUT", publicBeneficiary, admin)).status, 200);
    const publicRow = (await listPublicBeneficiaries()).find((row) => row.id === beneficiaryId);
    assert.deepEqual(publicRow, { id: beneficiaryId, publicName: publicBeneficiary.publicName, category: "Evakuasi", amount: 100000, image: imageUrl });
    for (const page of ["/sarsip", "/sarsip/penerima-manfaat"]) {
      const response = await fetch(base + page);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(publicBeneficiary.publicName));
      assert.ok(!html.includes(beneficiary.name));
      assert.ok(!html.includes(beneficiary.notes));
      assert.ok(html.includes(imageUrl));
      if (page === "/sarsip") assert.ok(html.indexOf('id="penerima-manfaat"') < html.indexOf("Kegiatan tim"));
    }
    await prisma.sarsipPaymentMethod.create({ data: { method, feeAmount: 2000 } });
    const campaignInput = { kind: "campaign", title: `SAR test ${tag}`, description: "Test campaign", status: "draft", targetAmount: 1000000, image: imageUrl };
    assert.equal((await request("/api/sarsip/entries", "POST", { ...campaignInput, kind: "program" }, admin)).status, 400);
    assert.equal((await fetch(base + "/sarsip/program")).status, 404);
    assert.equal((await request("/admin/sarsip/program", "GET", undefined, admin)).status, 404);
    assert.equal((await request("/api/sarsip/entries", "POST", campaignInput)).status, 403);
    assert.equal((await request("/api/sarsip/entries", "POST", campaignInput, other)).status, 403);
    assert.equal((await request("/api/sarsip/entries", "POST", { ...campaignInput, targetAmount: 0 }, admin)).status, 400);
    const created = await request("/api/sarsip/entries", "POST", campaignInput, admin);
    assert.equal(created.status, 201, await created.clone().text());
    const campaign = (await created.json()).id as string;
    ids.push(campaign);
    assert.equal((await fetch(`${base}/sarsip/campaign/${campaign}`)).status, 404);
    assert.equal(await getEntry(campaign, "campaign"), null);
    const payload = { moduleSource: "sarsip", sourceType: "campaign", sourceId: campaign, fundType: "donasi",
      donorName: name, donorPhone: phone, amount: 10000, paymentMethod: method, isAnonymous: true, coversFee: true, adminFee: 999999 };
    assert.equal((await request("/api/payment/checkout", "POST", payload)).status, 404);
    assert.equal((await request(`/api/sarsip/entries/${campaign}`, "PUT", { ...campaignInput, status: "published" }, admin)).status, 200);
    for (const kind of ["kegiatan", "berita"]) {
      const response = await request("/api/sarsip/entries", "POST", { ...campaignInput, kind, status: "published", location: "Lokasi uji", eventDate: "2026-09-21" }, admin);
      assert.equal(response.status, 201);
      const id = (await response.json()).id as string;
      ids.push(id);
      assert.equal((await fetch(`${base}/sarsip/${kind}/${id}`)).status, 200);
      const saved = await prisma.sarsipEntry.findUniqueOrThrow({ where: { id } });
      assert.equal(saved.image, imageUrl);
      assert.ok((await (await fetch(`${base}/sarsip/${kind}/${id}`)).text()).includes(imageUrl));
      assert.equal((await request("/api/payment/checkout", "POST", { ...payload, sourceId: id })).status, 404);
      if (kind === "berita") {
        const newsHtml = await (await fetch(`${base}/sarsip/berita/${id}`)).text();
        const sidebar = newsHtml.match(/<aside\b[^>]*>([\s\S]*?)<\/aside>/)?.[1] ?? "";
        assert.ok(sidebar.includes(`/sarsip/campaign/${campaign}`));
        assert.ok(sidebar.includes(`/sarsip/kegiatan/${ids[1]}`));
        assert.ok(!sidebar.includes(`/sarsip/berita/${id}`));
        for (const path of ["/sarsip", "/sarsip/berita"]) {
          assert.ok((await (await fetch(base + path)).text()).includes(`/sarsip/berita/${id}`));
        }
        assert.equal((await request("/admin/sarsip/berita", "GET", undefined, admin)).status, 200);
        assert.equal((await request(`/admin/sarsip/berita/${id}`, "GET", undefined, admin)).status, 200);
        const edited = { ...campaignInput, kind, title: `Berita diperbarui ${tag}`, status: "draft" };
        assert.equal((await request(`/api/sarsip/entries/${id}`, "PUT", edited, other)).status, 403);
        assert.equal((await request(`/api/sarsip/entries/${id}`, "PUT", edited, admin)).status, 200);
        assert.equal((await fetch(`${base}/sarsip/berita/${id}`)).status, 404);
        const activityHtml = await (await fetch(`${base}/sarsip/kegiatan/${ids[1]}`)).text();
        assert.ok(!activityHtml.includes(`/sarsip/berita/${id}`));
        assert.ok(!(await (await fetch(base + "/sarsip/berita")).text()).includes(`/sarsip/berita/${id}`));
        assert.equal((await request(`/api/sarsip/entries/${id}`, "PUT", { ...edited, status: "published" }, admin)).status, 200);
        assert.ok((await (await fetch(`${base}/sarsip/berita/${id}`)).text()).includes(edited.title));
        assert.equal((await request(`/api/sarsip/entries/${id}`, "DELETE", undefined, admin)).status, 200);
        assert.equal((await fetch(`${base}/sarsip/berita/${id}`)).status, 404);
      }
    }
    assert.equal((await request("/api/payment/checkout", "POST", { ...payload, fundType: "infak" })).status, 400);
    const checkout = await request("/api/payment/checkout", "POST", payload);
    assert.equal(checkout.status, 201, await checkout.clone().text());
    const firstId = (await checkout.json()).transactionId as string;
    const first = await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: firstId }, include: { destinationAccount: true, donor: true } });
    donorId = first.donorId;
    assert.equal(first.moduleSource, "sarsip");
    assert.equal(first.destinationAccount.moduleSource, "sarsip");
    assert.equal(first.destinationAccount.fundType, "donasi");
    assert.equal(first.adminFee, 2000);
    assert.equal(first.donor.name, name);
    assert.equal((await getEntry(campaign, "campaign"))?.currentAmount, 0);
    assert.deepEqual(await listPublicDonations(campaign), []);
    const checkoutPage = await fetch(`${base}/payment/checkout/${firstId}`);
    assert.equal(checkoutPage.status, 200);
    const checkoutHtml = await checkoutPage.text();
    assert.ok(checkoutHtml.includes("/sarsip/campaign"));
    assert.ok(checkoutHtml.includes("Mode simulasi"));
    assert.equal(checkoutHtml.includes(name), false);
    const second = await request("/api/payment/checkout", "POST", { ...payload, donorPhone: `0${phone.slice(2)}` });
    assert.equal(second.status, 201);
    const secondId = (await second.json()).transactionId as string;
    assert.equal((await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: secondId } })).donorId, donorId);
    const simulate = (id: string, status: string, token?: string) => request(`/api/payment/simulate-payment/${id}`, "PUT", { status }, token);
    assert.equal((await simulate(firstId, "paid")).status, 403);
    assert.equal((await simulate(firstId, "paid", other)).status, 403);
    assert.equal((await simulate(firstId, "paid", admin)).status, 200);
    assert.equal((await simulate(firstId, "paid", admin)).status, 200);
    assert.equal((await simulate(secondId, "failed", admin)).status, 200);
    assert.equal((await getEntry(campaign, "campaign"))?.currentAmount, 10000);
    const totals = await getTransparency();
    assert.equal(totals.totalAmount, baseline.totalAmount + 10000);
    assert.equal(totals.donorCount, baseline.donorCount + 1);
    assert.equal((await request(`/api/sarsip/beneficiaries/${beneficiaryId}`, "DELETE", undefined, other)).status, 403);
    assert.equal((await request(`/api/sarsip/beneficiaries/${beneficiaryId}`, "DELETE", undefined, admin)).status, 200);
    assert.equal((await getTransparency()).beneficiaryCount, baseline.beneficiaryCount);
    assert.ok(!(await listPublicBeneficiaries()).some((row) => row.id === beneficiaryId));
    assert.deepEqual(await listPublicDonations(campaign), [{ id: firstId, amount: 10000, name: "Hamba Allah" }]);
    const publicHtml = await (await fetch(`${base}/sarsip/campaign/${campaign}`)).text();
    assert.ok(publicHtml.includes("Hamba Allah"));
    assert.equal(publicHtml.includes(phone), false);
    assert.equal(publicHtml.includes(name), false);
    const publicStatus = await (await fetch(`${base}/api/payment/status/${firstId}`)).json();
    assert.equal("donorId" in publicStatus, false);
    for (const path of ["/admin/sarsip", "/admin/sarsip/donatur", "/admin/sarsip/transaksi", "/admin/sarsip/profil"]) {
      const response = await fetch(base + path, { headers: { Cookie: `${SESSION_COOKIE_NAME}=${admin}` } });
      assert.equal(response.status, 200, path);
    }
    const donorsHtml = await (await fetch(base + "/admin/sarsip/donatur", { headers: { Cookie: `${SESSION_COOKIE_NAME}=${admin}` } })).text();
    assert.ok(donorsHtml.includes(name));
    assert.ok(donorsHtml.includes(phone));
    assert.equal((await request(`/api/sarsip/entries/${campaign}`, "PUT", { ...campaignInput, status: "completed" }, admin)).status, 200);
    assert.equal((await request("/api/payment/checkout", "POST", payload)).status, 404);
    assert.equal((await request(`/api/sarsip/entries/${campaign}`, "DELETE", undefined, admin)).status, 200);
    assert.equal((await fetch(`${base}/sarsip/campaign/${campaign}`)).status, 404);
    assert.equal((await getEntry(campaign, "campaign", true))?.currentAmount, 10000);
    assert.equal(await prisma.paymentTransaction.count({ where: { sourceId: campaign } }), 2);
  } finally {
    if (beneficiaryId) await prisma.sarsipBeneficiary.deleteMany({ where: { id: beneficiaryId } });
    await prisma.paymentTransaction.deleteMany({ where: { moduleSource: "sarsip", sourceId: { in: ids } } });
    await prisma.sarsipEntry.deleteMany({ where: { id: { in: ids } } });
    if (donorId) await prisma.paymentDonor.deleteMany({ where: { id: donorId, phone } });
    await prisma.sarsipPaymentMethod.deleteMany({ where: { method } });
    await prisma.$disconnect();
    if (uploadedImage) await unlink(path.join(process.cwd(), "public", "uploads", "sarsip", path.basename(uploadedImage)));
  }
});
