import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "@/lib/prisma";
import { createZakatCheckout } from "@/modules/lazsip/api/zakatCheckout";
import { listPaymentZakatForAdmin } from "@/modules/lazsip/api/zakat";
import { getTotalZakatPaid, listDonors } from "@/modules/lazsip/api/donors";
import { getTransactionStatus } from "@/modules/payment/api/transaction";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

test("zakat checkout, admin simulation, and totals never double-count against donors.ts", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "Integration fixtures are development-only");
  const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";
  assert.match(baseUrl, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, "Only test a local development server");
  const tag = randomUUID();
  const method = `Test ${tag}`;
  const suffix = String(Date.now()).slice(-9);
  const phone = `62815${suffix}`;
  const name = `Zakat donor ${tag}`;
  let createdDestination: string | undefined;
  let zakatDetailId: string | undefined;

  try {
    await prisma.lazsipPaymentFeeRef.create({ data: { method, feeAmount: 1500 } });
    if (!await prisma.paymentDestinationAccount.findFirst({ where: { moduleSource: "lazsip", fundType: "zakat" } })) {
      const destination = await prisma.paymentDestinationAccount.create({ data: {
        moduleSource: "lazsip", fundType: "zakat", bankName: "TEST", accountName: tag, accountNumber: "0000",
      } });
      createdDestination = destination.id;
    }

    const input = {
      donorName: name, donorPhone: phone, donorEmail: `${tag}@example.com`, amount: 50_000, zakatType: "maal" as const,
      goldPriceSnapshot: 1_000_000, coversFee: true, isAnonymous: false, paymentMethod: method,
    };
    await assert.rejects(createZakatCheckout({ ...input, donorName: " " }));
    await assert.rejects(createZakatCheckout({ ...input, donorPhone: "invalid" }));
    await assert.rejects(createZakatCheckout({ ...input, donorEmail: "invalid" }));
    await assert.rejects(createZakatCheckout({ ...input, amount: -1 }));
    await assert.rejects(createZakatCheckout({ ...input, paymentMethod: "missing method" }));

    const postCheckout = async (overrides = {}) => fetch(`${baseUrl}/api/payment/checkout`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, moduleSource: "lazsip", sourceType: "zakat", fundType: "zakat", ...overrides }),
    });

    const invalid = await postCheckout({ donorName: "" });
    assert.equal(invalid.status, 400);

    const response = await postCheckout();
    assert.equal(response.status, 201, await response.clone().text());
    const { transactionId } = await response.json();
    const first = await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: transactionId }, include: { donor: true } });
    zakatDetailId = first.sourceId;
    assert.equal(first.sourceType, "zakat");
    assert.equal(first.fundType, "zakat");
    assert.equal(first.donor.name, name);
    assert.equal(first.donor.phone, phone);
    assert.equal(first.adminFee, 1500, "fee must come from server reference, not client input");

    // Same donor immediately retries the exact same checkout (double click) — must be
    // deduped into the same transaction, not create a second one.
    const retryResponse = await postCheckout();
    const retryBody = await retryResponse.json();
    assert.equal(retryBody.transactionId, transactionId, "double-submit within the guard window must reuse the pending transaction");

    // A LazsipZakatDetail sidecar row holds the domain-specific fields, never amount/status.
    const detail = await prisma.lazsipZakatDetail.findUniqueOrThrow({ where: { id: first.sourceId } });
    assert.equal(detail.zakatType, "maal");
    assert.equal(detail.goldPriceSnapshot, 1_000_000);

    const publicStatus = await (await fetch(`${baseUrl}/api/payment/status/${first.id}`)).json();
    assert.equal(publicStatus.status, "pending");
    for (const key of ["donor", "donorId", "donorName", "donorPhone", "phone"]) assert.equal(key in publicStatus, false);

    const token = await createSessionToken({ userId: `test-${tag}`, name: "Integration admin", isSuperadmin: false, moduleSlugs: ["lazsip"] });
    const simulate = (id: string, status: string, authenticated = true) => fetch(`${baseUrl}/api/payment/simulate-payment/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", ...(authenticated ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {}) },
      body: JSON.stringify({ status }),
    });
    assert.equal((await simulate(first.id, "paid", false)).status, 403);
    assert.equal((await simulate(first.id, "paid")).status, 200);
    const retryResults = await Promise.all([simulate(first.id, "paid"), simulate(first.id, "paid")]);
    assert.ok(retryResults.every((r) => r.status === 200), "already-final status must stay idempotent, not error");

    assert.equal((await getTransactionStatus(first.id))?.status, "paid");
    assert.equal(await getTotalZakatPaid(), 50_000);

    const donor = (await listDonors()).find((d) => d.phone === phone);
    assert.ok(donor);
    assert.ok(donor!.types.includes("zakat"));
    assert.equal(donor!.contributionCount, 1, "the LazsipZakatDetail sidecar must not be double-counted alongside PaymentTransaction");
    assert.equal(donor!.totalContribution, 50_000);

    const adminRows = await listPaymentZakatForAdmin();
    const row = adminRows.find((r) => r.id === first.id);
    assert.ok(row);
    assert.equal(row!.zakatType, "maal");
    assert.equal(row!.donorName, name);
    assert.equal(row!.status, "paid");
  } finally {
    await prisma.paymentTransaction.deleteMany({ where: { moduleSource: "lazsip", sourceType: "zakat", donor: { phone } } });
    if (zakatDetailId) await prisma.lazsipZakatDetail.deleteMany({ where: { id: zakatDetailId } });
    await prisma.paymentDonor.deleteMany({ where: { phone } });
    await prisma.lazsipPaymentFeeRef.deleteMany({ where: { method } });
    if (createdDestination) await prisma.paymentDestinationAccount.delete({ where: { id: createdDestination } });
    await prisma.$disconnect();
  }
});
