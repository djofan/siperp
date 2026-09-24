import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { findOrCreateDonor } from "@/modules/payment/api/donors";
import { DonationValidationError } from "@/modules/payment/api/checkoutValidation";

test("conflicting donor contacts are rejected without changing identities; phone-only reuses donor", async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname));
  const tag = randomUUID();
  const ids: string[] = [];
  try {
    const a = await prisma.paymentDonor.create({ data: { name: "Test A", phone: `test-${tag}`, email: `a-${tag}@example.invalid` } });
    ids.push(a.id);
    const b = await prisma.paymentDonor.create({ data: { name: "Test B", email: `b-${tag}@example.invalid` } });
    ids.push(b.id);
    await assert.rejects(prisma.$transaction(tx => findOrCreateDonor("Test", a.phone, b.email, tx)), (error: unknown) => error instanceof DonationValidationError && error.status === 409);
    assert.deepEqual(await prisma.paymentDonor.findUnique({ where: { id: a.id } }), a);
    assert.deepEqual(await prisma.paymentDonor.findUnique({ where: { id: b.id } }), b);
    assert.equal((await findOrCreateDonor("Test", a.phone, null)).id, a.id);
    assert.equal((await findOrCreateDonor("Test", a.phone, a.email)).id, a.id);
  } finally {
    await prisma.paymentDonor.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
});
