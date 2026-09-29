import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { receiptTemplate } from "@/modules/payment/api/receiptTemplate";
import { deliverReceipt } from "@/modules/payment/api/receipts";
import { markAsPaid, markAsFailed } from "@/modules/payment/api/transaction";

test("receipt copy differs by source and escapes donor/campaign text", () => {
  const base = { donorName: '<img src=x onerror="bad">', label: "Campaign <b>uji</b>", trackingCode: "TEST", amount: 10000, adminFee: 1000, paidAt: new Date(), gateway: "midtrans_sandbox" };
  for (const source of [{ moduleSource: "lazsip", sourceType: "zakat", phrase: "menunaikan zakat" }, { moduleSource: "lazsip", sourceType: "campaign", phrase: "berbagi melalui LAZSIP" }, { moduleSource: "sarsip", sourceType: "campaign", phrase: "misi pencarian" }]) {
    const result = receiptTemplate({ ...base, ...source });
    assert.ok(result.text.includes(source.phrase));
    assert.ok(result.text.includes("Rp11.000"));
    assert.ok(result.subject.startsWith("[SIMULASI]"));
    assert.ok(!result.html.includes("<img"));
    assert.ok(result.html.includes("&lt;b&gt;"));
  }
});

test("paid notifications persist once, recover failure, and protect against expired idempotency", async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname));
  const oldKey = process.env.RESEND_API_KEY, oldFrom = process.env.RESEND_FROM_EMAIL;
  delete process.env.RESEND_API_KEY; delete process.env.RESEND_FROM_EMAIL;
  const ids: string[] = [], donors: string[] = [];
  let destinationId: string | undefined;
  try {
    const donor = await prisma.paymentDonor.create({ data: { name: "Nama asli uji", email: `${randomUUID()}@example.invalid` } });
    donors.push(donor.id);
    const noEmail = await prisma.paymentDonor.create({ data: { name: "Tanpa email" } });
    donors.push(noEmail.id);
    destinationId = (await prisma.paymentDestinationAccount.create({ data: { moduleSource: "lazsip", fundType: "infak", bankName: "TEST", accountName: "Receipt test", accountNumber: randomUUID() } })).id;
    async function fixture(donorId = donor.id) {
      const row = await prisma.paymentTransaction.create({ data: { donorId, destinationAccountId: destinationId!, moduleSource: "lazsip", fundType: "infak", sourceType: "campaign", sourceId: "receipt-test", trackingCode: randomUUID(), midtransOrderId: randomUUID(), amount: 10000, paymentMethod: "TEST", isAnonymous: true, gateway: "midtrans_sandbox" } });
      ids.push(row.id); return row;
    }
    const payment = await fixture();
    assert.equal(await prisma.paymentReceipt.count({ where: { transactionId: payment.id } }), 0);
    await Promise.all([markAsPaid(payment.midtransOrderId!), markAsPaid(payment.midtransOrderId!)]);
    const receipt = await prisma.paymentReceipt.findUniqueOrThrow({ where: { transactionId: payment.id } });
    assert.equal(receipt.status, "pending");
    assert.ok(receipt.text.includes(donor.name));
    assert.equal(await prisma.paymentReceipt.count({ where: { transactionId: payment.id } }), 1);
    const failed = await fixture(); await markAsFailed(failed.midtransOrderId!);
    const skipped = await fixture(noEmail.id); await markAsPaid(skipped.midtransOrderId!);
    assert.equal(await prisma.paymentReceipt.count({ where: { transactionId: { in: [failed.id, skipped.id] } } }), 0);
    process.env.RESEND_API_KEY = "test"; process.env.RESEND_FROM_EMAIL = "test@example.invalid";
    const bodies: string[] = [], keys: string[] = [];
    let calls = 0;
    const send: typeof fetch = async (_url, options) => {
      calls++; bodies.push(String(options?.body)); keys.push(new Headers(options?.headers).get("Idempotency-Key")!);
      if (calls === 1) throw new Error("network timeout");
      return Response.json({ id: "resend-test-id" });
    };
    await deliverReceipt(payment.id, send);
    assert.equal((await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: payment.id } })).status, "paid");
    assert.equal((await prisma.paymentReceipt.findUniqueOrThrow({ where: { id: receipt.id } })).status, "retry");
    await prisma.paymentDonor.update({ where: { id: donor.id }, data: { email: `${randomUUID()}@example.invalid`, name: "Edited" } });
    process.env.RESEND_FROM_EMAIL = "changed@example.invalid";
    await prisma.paymentReceipt.update({ where: { id: receipt.id }, data: { nextAttemptAt: new Date(0) } });
    await Promise.all([deliverReceipt(payment.id, send), deliverReceipt(payment.id, send)]);
    await deliverReceipt(payment.id, send);
    assert.equal(calls, 2); assert.equal(keys[0], keys[1]); assert.equal(bodies[0], bodies[1]);
    assert.equal((await prisma.paymentReceipt.findUniqueOrThrow({ where: { id: receipt.id } })).status, "sent");
    // Queue with config disabled to ensure this test never makes network requests.
    delete process.env.RESEND_API_KEY;
    const expired = await fixture(); await markAsPaid(expired.midtransOrderId!);
    await prisma.paymentReceipt.update({ where: { transactionId: expired.id }, data: { firstAttemptAt: new Date(Date.now() - 24 * 3600000) } });
    process.env.RESEND_API_KEY = "test";
    await deliverReceipt(expired.id, send);
    assert.equal(calls, 2);
    assert.equal((await prisma.paymentReceipt.findUniqueOrThrow({ where: { transactionId: expired.id } })).status, "needs_review");
  } finally {
    if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey;
    if (oldFrom === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = oldFrom;
    await prisma.paymentTransaction.deleteMany({ where: { id: { in: ids } } });
    await prisma.paymentDonor.deleteMany({ where: { id: { in: donors } } });
    if (destinationId) await prisma.paymentDestinationAccount.delete({ where: { id: destinationId } });
    await prisma.$disconnect();
  }
});
