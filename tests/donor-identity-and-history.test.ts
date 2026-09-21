import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "@/lib/prisma";
import { createZakatCheckout } from "@/modules/lazsip/api/zakatCheckout";
import { getTransactionStatus } from "@/modules/lazsip/api/transactionStatus";

test("donor identity: name required, phone-OR-email required (not both) — prd-lazsip.md §3.3/§3.4/§6", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "Integration fixtures are development-only");
  const tag = randomUUID();
  const method = `Test ${tag}`;
  const suffix = String(Date.now()).slice(-9);
  const phoneOnlyPhone = `62816${suffix}`;
  const emailOnlyEmail = `${tag}-emailonly@example.com`;
  const donorIdsToClean: string[] = [];
  const transactionIdsToClean: string[] = [];
  const zakatDetailIdsToClean: string[] = [];

  try {
    await prisma.lazsipPaymentFeeRef.create({ data: { method, feeAmount: 0 } });
    if (!(await prisma.paymentDestinationAccount.findFirst({ where: { moduleSource: "lazsip", fundType: "zakat" } }))) {
      await prisma.paymentDestinationAccount.create({
        data: { moduleSource: "lazsip", fundType: "zakat", bankName: "TEST", accountName: tag, accountNumber: "0000" },
      });
    }

    const base = {
      donorName: `Donor ${tag}`, amount: 15_000, zakatType: "maal" as const,
      goldPriceSnapshot: 1_000_000, coversFee: false, isAnonymous: false, paymentMethod: method,
    };

    // Neither phone nor email → rejected.
    await assert.rejects(createZakatCheckout({ ...base, donorPhone: "", donorEmail: "" }));

    // Phone only → accepted.
    const phoneOnly = await createZakatCheckout({ ...base, donorPhone: phoneOnlyPhone, donorEmail: "" });
    transactionIdsToClean.push(phoneOnly.id);
    zakatDetailIdsToClean.push(phoneOnly.sourceId);
    donorIdsToClean.push(phoneOnly.donorId);
    const phoneOnlyDonor = await prisma.paymentDonor.findUniqueOrThrow({ where: { id: phoneOnly.donorId } });
    assert.equal(phoneOnlyDonor.phone, phoneOnlyPhone);
    assert.equal(phoneOnlyDonor.email, null);

    // Email only → accepted.
    const emailOnly = await createZakatCheckout({ ...base, donorPhone: "", donorEmail: emailOnlyEmail });
    transactionIdsToClean.push(emailOnly.id);
    zakatDetailIdsToClean.push(emailOnly.sourceId);
    donorIdsToClean.push(emailOnly.donorId);
    const emailOnlyDonor = await prisma.paymentDonor.findUniqueOrThrow({ where: { id: emailOnly.donorId } });
    assert.equal(emailOnlyDonor.email, emailOnlyEmail);
    assert.equal(emailOnlyDonor.phone, null);

    // Tracking code is a friendly "LZS-XXXXXX" code, not the raw cuid, and Cek Status finds it by that code.
    assert.match(phoneOnly.trackingCode, /^LZS-[A-Z0-9]{6}$/);
    const status = await getTransactionStatus(phoneOnly.trackingCode);
    assert.equal(status?.found, true);
    assert.equal(status?.type, "zakat");
    assert.equal(status?.amount, 15_000);

    // A raw internal id (not the tracking code) must NOT resolve — donors shouldn't be able
    // to guess a valid lookup key from the transaction id shown nowhere in the UI.
    const byRawId = await getTransactionStatus(phoneOnly.id);
    assert.equal(byRawId, null);
  } finally {
    if (transactionIdsToClean.length) await prisma.paymentTransaction.deleteMany({ where: { id: { in: transactionIdsToClean } } });
    if (zakatDetailIdsToClean.length) await prisma.lazsipZakatDetail.deleteMany({ where: { id: { in: zakatDetailIdsToClean } } });
    if (donorIdsToClean.length) await prisma.paymentDonor.deleteMany({ where: { id: { in: donorIdsToClean } } });
    await prisma.lazsipPaymentFeeRef.deleteMany({ where: { method } });
    await prisma.$disconnect();
  }
});

test("Cek Riwayat: identical response for a registered vs unregistered email (prd-lazsip.md §3.11.B & §6 aturan #8)", async () => {
  const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";
  assert.match(baseUrl, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, "Only test a local development server");
  const tag = randomUUID();
  const registeredEmail = `${tag}-registered@example.com`;
  const unregisteredEmail = `${tag}-unregistered@example.com`;
  let donorId: string | undefined;

  try {
    const donor = await prisma.paymentDonor.create({ data: { name: `History donor ${tag}`, email: registeredEmail } });
    donorId = donor.id;

    const check = (email: string) => fetch(`${baseUrl}/api/lazsip/transactions/history`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    });

    const registeredResponse = await check(registeredEmail);
    const unregisteredResponse = await check(unregisteredEmail);
    assert.equal(registeredResponse.status, unregisteredResponse.status);
    const [registeredBody, unregisteredBody] = await Promise.all([registeredResponse.json(), unregisteredResponse.json()]);
    assert.deepEqual(registeredBody, unregisteredBody, "response body must not reveal whether the email is registered");
  } finally {
    if (donorId) await prisma.paymentDonor.deleteMany({ where: { id: donorId } });
    await prisma.$disconnect();
  }
});
