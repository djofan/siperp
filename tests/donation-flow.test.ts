import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "@/lib/prisma";
import { createCampaignCheckout } from "@/modules/lazsip/api/campaignCheckout";
import { getCampaignById, listCampaigns, listCampaignDonorsPublic } from "@/modules/lazsip/api/campaigns";
import { listDonors } from "@/modules/lazsip/api/donors";
import { listPaymentDonationsForAdmin, setDonationStatus } from "@/modules/lazsip/api/donations";
import { getTransactionStatus } from "@/modules/payment/api/transaction";
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
  const method = `Test ${tag}`;
  const suffix = String(Date.now()).slice(-9);
  const phone = `62813${suffix}`;
  const otherPhone = `62814${suffix}`;
  const name = `Private donor ${tag}`;
  const visibleName = `Visible donor ${tag}`;
  let createdDestination: string | undefined;
  try {
    await prisma.lazsipCampaign.create({ data: {
      id: campaignId, title: `Test campaign ${tag}`, description: "Integration fixture",
      uniqueCode: tag, targetAmount: 1_000_000, currentAmount: 999_999,
    } });
    await prisma.lazsipPaymentFeeRef.create({ data: { method, feeAmount: 2500 } });
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
    assert.equal(first.adminFee, 2500, "fee must come from server reference, not submitted adminFee");
    assert.equal(first.isAnonymous, true);
    assert.equal("donorName" in first, false);
    assert.equal((await getCampaignById(campaignId))?.currentAmount, 0, "ignore stale cached currentAmount");
    assert.deepEqual(await listCampaignDonorsPublic(campaignId), []);
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
    assert.equal((await simulate(first.id, "invalid")).status, 400);
    assert.equal((await simulate(first.id, "paid")).status, 200);
    const retryResults = await Promise.all([simulate(first.id, "paid"), simulate(first.id, "paid")]);
    assert.ok(retryResults.every((r) => r.status === 200));
    assert.equal((await getCampaignById(campaignId))?.currentAmount, 10000);
    assert.deepEqual(await listCampaignDonorsPublic(campaignId), [{ id: first.id, name: "Hamba Allah", amount: 10000 }]);
    assert.ok((await listPaymentDonationsForAdmin()).some((d) => d.id === first.id && d.donorName === name));

    await simulate(repeated.id, "failed");
    await simulate(repeated.id, "paid");
    assert.equal((await getTransactionStatus(repeated.id))?.status, "failed");
    await simulate(simultaneous[0].id, "paid");
    const legacy = await prisma.lazsipDonation.create({ data: {
      campaignId, donorId: first.donorId, amount: 3000, isAnonymous: true, paymentMethod: method,
    } });
    await setDonationStatus(legacy.id, "paid");
    await setDonationStatus(legacy.id, "paid");
    assert.equal((await getCampaignById(campaignId))?.currentAmount, 23000);
    assert.equal((await listCampaigns()).find((c) => c.id === campaignId)?.currentAmount, 23000);
    const publicDonors = await listCampaignDonorsPublic(campaignId);
    assert.equal(publicDonors.length, 3);
    assert.ok(publicDonors.some((d) => d.name === visibleName));
    assert.equal(JSON.stringify(publicDonors).includes(name), false);
    assert.equal(JSON.stringify(publicDonors).includes(phone), false);
    const publicStatusResponse = await fetch(`${baseUrl}/api/payment/status/${first.id}`);
    assert.equal(publicStatusResponse.status, 200);
    const publicStatus = await publicStatusResponse.json();
    for (const key of ["donor", "donorId", "donorName", "donorPhone", "phone"]) assert.equal(key in publicStatus, false);
    const page = await fetch(`${baseUrl}/lazsip/donasi/${campaignId}`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes(visibleName));
    assert.ok(html.includes("Hamba Allah"));
    assert.ok(html.includes("23.000"));
    assert.equal(html.includes(name), false, "private name must not leak even through RSC payload");
    assert.equal(html.includes(phone), false);
    const donor = (await listDonors()).find((d) => d.id === first.donorId)!;
    assert.equal(donor.contributionCount, 3);
    assert.equal(donor.totalContribution, 13000);
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
