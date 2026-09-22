import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

test("only superadmin can manage payment destination accounts; in-use accounts can't be deleted", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "Integration fixtures are development-only");
  const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";
  assert.match(baseUrl, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, "Only test a local development server");
  const tag = randomUUID();
  let createdId: string | undefined;

  try {
    const superToken = await createSessionToken({ userId: `test-super-${tag}`, name: "Integration superadmin", isSuperadmin: true, moduleSlugs: [] });
    const moduleToken = await createSessionToken({ userId: `test-mod-${tag}`, name: "Integration lazsip admin", isSuperadmin: false, moduleSlugs: ["lazsip"] });
    const create = (overrides: Record<string, unknown> = {}, cookie?: string) => fetch(`${baseUrl}/api/payment/destination-accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify({ moduleSource: "lazsip", fundType: "infak", bankName: "TEST", accountNumber: "1234567890", accountName: tag, ...overrides }),
    });

    assert.equal((await create()).status, 403, "anonymous requests must be rejected");
    assert.equal((await create({}, `${SESSION_COOKIE_NAME}=${moduleToken}`)).status, 403, "module-scoped admin (non-superadmin) must be rejected");

    const invalid = await create({ moduleSource: "unknown-module" }, `${SESSION_COOKIE_NAME}=${superToken}`);
    assert.equal(invalid.status, 400);

    const ok = await create({}, `${SESSION_COOKIE_NAME}=${superToken}`);
    assert.equal(ok.status, 201, await ok.clone().text());
    const { id } = await ok.json();
    createdId = id;
    assert.ok(await prisma.paymentDestinationAccount.findUnique({ where: { id } }));

    const destroy = (accountId: string, cookie?: string) => fetch(`${baseUrl}/api/payment/destination-accounts/${accountId}`, {
      method: "DELETE",
      headers: cookie ? { Cookie: cookie } : {},
    });
    assert.equal((await destroy(id)).status, 403, "anonymous delete must be rejected");
    assert.equal((await destroy(id, `${SESSION_COOKIE_NAME}=${moduleToken}`)).status, 403, "non-superadmin delete must be rejected");

    // Once a real transaction points at this account, it must not be deletable —
    // deleting it would orphan the transaction's destinationAccountId relation.
    const donor = await prisma.paymentDonor.create({ data: { name: `Guard donor ${tag}`, phone: `62819${String(Date.now()).slice(-9)}` } });
    const transaction = await prisma.paymentTransaction.create({ data: {
      trackingCode: `TEST-${tag.slice(0, 8)}`,
      moduleSource: "lazsip", sourceType: "campaign", sourceId: tag, fundType: "infak",
      donorId: donor.id, amount: 10_000, paymentMethod: "TEST", destinationAccountId: id,
    } });
    const blockedDelete = await destroy(id, `${SESSION_COOKIE_NAME}=${superToken}`);
    assert.equal(blockedDelete.status, 400);
    assert.ok(await prisma.paymentDestinationAccount.findUnique({ where: { id } }), "account in use must survive the delete attempt");

    await prisma.paymentTransaction.delete({ where: { id: transaction.id } });
    await prisma.paymentDonor.delete({ where: { id: donor.id } });

    const finalDelete = await destroy(id, `${SESSION_COOKIE_NAME}=${superToken}`);
    assert.equal(finalDelete.status, 200);
    assert.equal(await prisma.paymentDestinationAccount.findUnique({ where: { id } }), null);
    createdId = undefined;
  } finally {
    if (createdId) await prisma.paymentDestinationAccount.deleteMany({ where: { id: createdId } });
    await prisma.$disconnect();
  }
});
