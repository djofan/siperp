import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST } from "@/modules/payment/api/routes/midtrans-session/[id]/route";
import { markAsPaid, markAsFailed, setStatusById } from "@/modules/payment/api/transaction";

test("concurrent Snap requests create once, reuse URL and never allow manual settlement", async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname), "Fixtures require local DB");
  const tag = randomUUID();
  const originalFetch = globalThis.fetch;
  const previous = { MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY, MIDTRANS_MERCHANT_ID: process.env.MIDTRANS_MERCHANT_ID, PAYMENT_PUBLIC_URL: process.env.PAYMENT_PUBLIC_URL };
  process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-test";
  process.env.MIDTRANS_MERCHANT_ID = "MTEST";
  process.env.PAYMENT_PUBLIC_URL = "http://localhost:3000";
  const ids: string[] = [];
  let donorId: string | undefined;
  let destinationId: string | undefined;
  try {
    donorId = (await prisma.paymentDonor.create({ data: { name: `Sandbox test ${tag}` } })).id;
    destinationId = (await prisma.paymentDestinationAccount.create({ data: { moduleSource: "test", fundType: "test", bankName: "TEST", accountNumber: "TEST", accountName: tag } })).id;
    async function fixture() {
      const row = await prisma.paymentTransaction.create({ data: { trackingCode: `TEST-${randomUUID()}`, moduleSource: "test", sourceType: "campaign", sourceId: tag, fundType: "test", donorId: donorId!, destinationAccountId: destinationId!, amount: 10000, paymentMethod: "Midtrans Sandbox", gateway: "midtrans_sandbox", gatewayMerchantId: "MTEST", midtransOrderId: `SIP-${randomUUID()}` } });
      ids.push(row.id);
      return row;
    }
    const row = await fixture();
    let creates = 0;
    globalThis.fetch = async () => {
      creates++;
      await new Promise(resolve => setTimeout(resolve, 50));
      return Response.json({ token: "test", redirect_url: "https://app.sandbox.midtrans.com/snap/test" });
    };
    const request = (id: string) => POST(new NextRequest(`http://localhost/api/payment/midtrans-session/${id}`, { method: "POST" }), { params: Promise.resolve({ id }) });
    const responses = await Promise.all([request(row.id), request(row.id)]);
    assert.ok(responses.some(r => r.status === 200));
    assert.ok(responses.every(r => [200, 409].includes(r.status)));
    assert.equal(creates, 1);
    assert.equal((await request(row.id)).status, 200);
    assert.equal(creates, 1);
    await assert.rejects(setStatusById(row.id, "paid"));
    await Promise.all([markAsPaid(row.midtransOrderId!), markAsPaid(row.midtransOrderId!)]);
    const paid = await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(paid.status, "paid");
    await markAsFailed(row.midtransOrderId!);
    const repeated = await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(repeated.status, "paid");
    assert.equal(repeated.paidAt?.getTime(), paid.paidAt?.getTime());
    assert.equal((await request(row.id)).status, 409);

    const ambiguous = await fixture();
    globalThis.fetch = async () => { creates++; throw new Error("timeout"); };
    assert.equal((await request(ambiguous.id)).status, 502);
    assert.equal((await request(ambiguous.id)).status, 409);
    assert.equal(creates, 2, "Ambiguous create must not issue another Snap request");
    assert.equal((await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: ambiguous.id } })).gatewayState, "needs_review");
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await prisma.paymentTransaction.deleteMany({ where: { id: { in: ids } } });
    if (donorId) await prisma.paymentDonor.delete({ where: { id: donorId } });
    if (destinationId) await prisma.paymentDestinationAccount.delete({ where: { id: destinationId } });
    await prisma.$disconnect();
  }
});
