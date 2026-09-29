import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "@/lib/prisma";
import { createCampaignCheckout } from "@/modules/lazsip/api/campaignCheckout";
import { applyUniqueCode } from "@/modules/lazsip/api/uniqueCode";
import { getCampaignById, listCampaigns, listCampaignHistory } from "@/modules/lazsip/api/campaigns";
import { listDonors } from "@/modules/lazsip/api/donors";
import { listPaymentDonationsForAdmin, setDonationStatus } from "@/modules/lazsip/api/donations";
import { getTransactionStatus, markAsPaid, markAsFailed } from "@/modules/payment/api/transaction";
import { paymentGateway, sandboxMethod } from "@/modules/payment/api/midtrans";
import { normalizeDonorPhone } from "@/modules/payment/api/donorIdentity";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

test("Indonesian phone formats share one identity; invalid phones are rejected", () => {
  for (const input of ["081234567890", "6281234567890", "+62 812-3456-7890"]) {
    assert.equal(normalizeDonorPhone(input), "6281234567890");
  }
  for (const input of ["", "123", "abc081234567890", "08+1234567890", "+62081234567890"]) {
    assert.equal(normalizeDonorPhone(input), null);
  }
});

test("donor identity, privacy, admin simulation and campaign totals", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "Integration fixtures are development-only");
  const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";
  assert.match(baseUrl, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, "Only test a local development server");
  const tag = randomUUID();
  const campaignId = `test-${tag}`;
  // Modul pembayaran sekarang bisa jalan dalam 2 mode (env PAYMENT_GATEWAY) — simulation
  // (admin klik manual) atau midtrans_sandbox (harus lewat Midtrans beneran, admin gak
  // boleh nge-override). Test ini harus tetap valid dua-duanya, bukan cuma asumsi simulation.
  const gateway = paymentGateway();
  const method = gateway === "midtrans_sandbox" ? sandboxMethod.method : `Test ${tag}`;
  const expectedAdminFee = gateway === "midtrans_sandbox" ? 0 : 2500;
  const suffix = String(Date.now()).slice(-9);
  // Rentang 90-99 sengaja dijauhkan dari kode 2-digit campaign asli (01-08) supaya fixture ini
  // gak pernah tabrakan dengan uniqueCode campaign nyata di database (kolom itu @unique).
  const testUniqueCode = String(90 + (Date.now() % 10)).padStart(2, "0");
  const donationAmount = applyUniqueCode(10000, testUniqueCode);
  const phone = `62813${suffix}`;
  const otherPhone = `62814${suffix}`;
  const name = `Private donor ${tag}`;
  const visibleName = `Visible donor ${tag}`;
  let createdDestination: string | undefined;
  try {
    await prisma.lazsipCampaign.create({ data: {
      id: campaignId, title: `Test campaign ${tag}`, description: "Integration fixture",
      uniqueCode: testUniqueCode, targetAmount: 1_000_000, currentAmount: 999_999,
    } });
    if (gateway !== "midtrans_sandbox") await prisma.lazsipPaymentFeeRef.create({ data: { method, feeAmount: 2500 } });
    if (!await prisma.paymentDestinationAccount.findFirst({ where: { moduleSource: "lazsip", fundType: "infak" } })) {
      const destination = await prisma.paymentDestinationAccount.create({ data: {
        moduleSource: "lazsip", fundType: "infak", bankName: "TEST", accountName: tag, accountNumber: "0000",
      } });
      createdDestination = destination.id;
    }
    const input = { campaignId, donorName: name, donorPhone: phone, donorEmail: `${tag}@example.com`, amount: 10000, coversFee: true, isAnonymous: true, paymentMethod: method };
    await assert.rejects(createCampaignCheckout({ ...input, donorName: " " }));
    await assert.rejects(createCampaignCheckout({ ...input, donorPhone: "invalid" }));
    await assert.rejects(createCampaignCheckout({ ...input, donorEmail: "invalid" }));
    await assert.rejects(createCampaignCheckout({ ...input, amount: -1 }));
    await assert.rejects(createCampaignCheckout({ ...input, paymentMethod: "missing" }));
    assert.equal(await prisma.paymentDonor.count({ where: { phone } }), 0);

    const postCheckout = async (overrides = {}) => fetch(`${baseUrl}/api/payment/checkout`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, sourceId: campaignId, moduleSource: "lazsip", sourceType: "campaign", fundType: "infak", adminFee: 999999, ...overrides }),
    });
    const invalid = await postCheckout({ donorName: "" });
    assert.equal(invalid.status, 400);
    const response = await postCheckout();
    assert.equal(response.status, 201, await response.clone().text());
    const { transactionId } = await response.json();
    const first = await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: transactionId }, include: { donor: true } });
    assert.equal(first.donor.name, name);
    assert.equal(first.donor.phone, phone);
    assert.equal(first.adminFee, expectedAdminFee, "fee must come from server reference, not submitted adminFee");
    assert.equal(first.isAnonymous, true);
    const pendingCheckout = await fetch(`${baseUrl}/payment/checkout/${first.id}`);
    assert.equal(pendingCheckout.status, 200);
    const pendingHtml = await pendingCheckout.text();
    if (gateway === "midtrans_sandbox") {
      assert.ok(pendingHtml.includes("Midtrans sandbox"));
      assert.ok(pendingHtml.includes("Menunggu pembayaran test"));
    } else {
      assert.ok(pendingHtml.includes("Mode simulasi"));
      assert.ok(pendingHtml.includes("Menunggu konfirmasi admin"));
    }
    assert.equal(pendingHtml.includes("Bayar Sekarang"), false);
    assert.equal("donorName" in first, false);
    assert.equal((await getCampaignById(campaignId))?.currentAmount, 0, "ignore stale cached currentAmount");
    assert.deepEqual(await listCampaignHistory(campaignId), []);
    assert.ok((await listDonors()).some((d) => d.id === first.donorId && d.phone === phone && d.totalContribution === 0));

    const repeated = await createCampaignCheckout({ ...input, donorPhone: `0${phone.slice(2)}`, amount: 20000, coversFee: false });
    assert.equal(repeated.donorId, first.donorId);
    assert.equal(repeated.adminFee, 0);
    const otherEmail = `${tag}-other@example.com`;
    const simultaneous = await Promise.all([
      createCampaignCheckout({ ...input, donorName: visibleName, donorPhone: otherPhone, donorEmail: otherEmail, isAnonymous: false }),
      createCampaignCheckout({ ...input, donorName: visibleName, donorPhone: `+${otherPhone}`, donorEmail: otherEmail, isAnonymous: false }),
    ]);
    assert.equal(simultaneous[0].donorId, simultaneous[1].donorId);
    assert.equal(await prisma.paymentDonor.count({ where: { phone: { in: [phone, otherPhone] } } }), 2);

    const token = await createSessionToken({ userId: `test-${tag}`, name: "Integration admin", isSuperadmin: false, moduleSlugs: ["lazsip"] });
    const simulate = (id: string, status: string, authenticated = true) => fetch(`${baseUrl}/api/payment/simulate-payment/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", ...(authenticated ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {}) },
      body: JSON.stringify({ status }),
    });
    assert.equal((await simulate(first.id, "paid", false)).status, 403);
    if (gateway === "simulation") {
      assert.equal((await simulate(first.id, "invalid")).status, 400);
      assert.equal((await simulate(first.id, "paid")).status, 200);
      const retryResults = await Promise.all([simulate(first.id, "paid"), simulate(first.id, "paid")]);
      assert.ok(retryResults.every((r) => r.status === 200));
    } else {
      // Transaksi gateway asli TIDAK BOLEH ditandai lunas lewat tombol admin — cuma lewat
      // webhook/cek status Midtrans (CLAUDE.md §7 aturan #1).
      assert.equal((await simulate(first.id, "invalid")).status, 409);
      assert.equal((await simulate(first.id, "paid")).status, 409);
      // Berperan sebagai webhook Midtrans yang sudah terverifikasi, tanpa beneran manggil
      // API Midtrans di dalam test ini.
      await markAsPaid(first.midtransOrderId!);
    }
    assert.equal((await getCampaignById(campaignId))?.currentAmount, donationAmount);
    const paidCheckout = await fetch(`${baseUrl}/payment/checkout/${first.id}`);
    const paidHtml = await paidCheckout.text();
    assert.ok(paidHtml.includes(gateway === "midtrans_sandbox" ? "Pembayaran test berhasil" : "Simulasi pembayaran berhasil"));
    const historyAfterFirst = await listCampaignHistory(campaignId);
    assert.equal(historyAfterFirst.length, 1);
    assert.equal(historyAfterFirst[0].id, first.id);
    assert.equal(historyAfterFirst[0].kind, "donasi");
    assert.equal(historyAfterFirst[0].label, "Hamba Allah");
    assert.equal(historyAfterFirst[0].amount, donationAmount);
    assert.ok((await listPaymentDonationsForAdmin()).some((d) => d.id === first.id && d.donorName === name));

    if (gateway === "simulation") {
      await simulate(repeated.id, "failed");
      await simulate(repeated.id, "paid");
    } else {
      await markAsFailed(repeated.midtransOrderId!);
    }
    assert.equal((await getTransactionStatus(repeated.id))?.status, "failed");
    const failedCheckout = await fetch(`${baseUrl}/payment/checkout/${repeated.id}`);
    const failedHtml = await failedCheckout.text();
    assert.ok(failedHtml.includes(gateway === "midtrans_sandbox" ? "Sesi pembayaran berakhir" : "Simulasi pembayaran gagal"));
    if (gateway === "simulation") await simulate(simultaneous[0].id, "paid");
    else await markAsPaid(simultaneous[0].midtransOrderId!);
    const legacy = await prisma.lazsipDonation.create({ data: {
      campaignId, donorId: first.donorId, amount: 3000, isAnonymous: true, paymentMethod: method,
    } });
    await setDonationStatus(legacy.id, "paid");
    await setDonationStatus(legacy.id, "paid");
    const finalCurrentAmount = donationAmount * 2 + 3000;
    assert.equal((await getCampaignById(campaignId))?.currentAmount, finalCurrentAmount);
    assert.equal((await listCampaigns()).find((c) => c.id === campaignId)?.currentAmount, finalCurrentAmount);
    const publicHistory = await listCampaignHistory(campaignId);
    assert.equal(publicHistory.length, 3);
    assert.ok(publicHistory.some((d) => d.label === visibleName));
    assert.equal(JSON.stringify(publicHistory).includes(name), false);
    assert.equal(JSON.stringify(publicHistory).includes(phone), false);
    const publicStatusResponse = await fetch(`${baseUrl}/api/payment/status/${first.id}`);
    assert.equal(publicStatusResponse.status, 200);
    assert.equal(publicStatusResponse.headers.get("cache-control"), "no-store");
    const publicStatus = await publicStatusResponse.json();
    for (const key of ["donor", "donorId", "donorName", "donorPhone", "donorEmail", "phone", "email", "destinationAccount", "destinationAccountId"]) assert.equal(key in publicStatus, false);
    assert.equal(publicStatus.trackingCode, first.trackingCode);
    for (const privateValue of [name, phone, input.donorEmail]) {
      assert.equal(pendingHtml.includes(privateValue), false, "checkout HTML/RSC must not leak donor identity");
    }
    assert.equal(pendingHtml.includes("accountNumber"), false, "checkout must not serialize bank details");
    assert.ok(pendingHtml.includes(first.trackingCode));
    const page = await fetch(`${baseUrl}/lazsip/donasi/${campaignId}`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes(visibleName));
    assert.ok(html.includes("Hamba Allah"));
    assert.ok(html.includes(finalCurrentAmount.toLocaleString("id-ID")));
    assert.equal(html.includes(name), false, "private name must not leak even through RSC payload");
    assert.equal(html.includes(phone), false);
    const donor = (await listDonors()).find((d) => d.id === first.donorId)!;
    assert.equal(donor.contributionCount, 3);
    assert.equal(donor.totalContribution, donationAmount + 3000);
    const adminPage = await fetch(`${baseUrl}/admin/lazsip/donatur`, { headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` } });
    assert.equal(adminPage.status, 200);
    const adminHtml = await adminPage.text();
    assert.ok(adminHtml.includes(name));
    assert.ok(adminHtml.includes(phone));
  } finally {
    // Only fixture-owned records are removed, even after a failed assertion.
    await prisma.paymentTransaction.deleteMany({ where: { sourceId: campaignId } });
    await prisma.lazsipDonation.deleteMany({ where: { campaignId } });
    await prisma.paymentDonor.deleteMany({ where: { phone: { in: [phone, otherPhone] } } });
    await prisma.lazsipCampaign.deleteMany({ where: { id: campaignId } });
    await prisma.lazsipPaymentFeeRef.deleteMany({ where: { method } });
    if (createdDestination) await prisma.paymentDestinationAccount.delete({ where: { id: createdDestination } });
    await prisma.$disconnect();
  }
});
