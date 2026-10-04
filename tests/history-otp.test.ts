import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { requestHistoryOtp, verifyHistoryOtp } from "../modules/lazsip/api/historyOtp";

test("history OTP limits requests, rejects wrong codes, expires and consumes once", async () => {
  const email = `otp-test-${randomUUID()}@example.invalid`;
  const key = createHmac("sha256", process.env.SESSION_SECRET!).update("history-email:" + email).digest("hex");
  const originalFetch = global.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_API_KEY = "test";
  process.env.RESEND_FROM_EMAIL = "test@example.invalid";
  let code = "";
  global.fetch = async (_url, init) => {
    code = JSON.parse(String(init?.body)).html.match(/>(\d{6})</)[1];
    return new Response("{}", { status: 200 });
  };
  try {
    const result = await requestHistoryOtp(email);
    assert.equal(result.limited, false);
    if (result.limited) throw new Error("Unexpected limit");
    assert.equal((await requestHistoryOtp(email)).limited, true);
    assert.equal(await verifyHistoryOtp("another@example.invalid", result.challengeId, code), false);
    const wrong = code === "000000" ? "111111" : "000000";
    assert.equal(await verifyHistoryOtp(email, result.challengeId, wrong), false);
    const results = await Promise.all([verifyHistoryOtp(email, result.challengeId, code), verifyHistoryOtp(email, result.challengeId, code)]);
    assert.equal(results.filter(Boolean).length, 1);
    await prisma.$executeRaw`UPDATE lazsip_history_otp SET sent_at=NULL WHERE email_key=${key}`;
    const next = await requestHistoryOtp(email);
    if (next.limited) throw new Error("Unexpected limit");
    for (let i = 0; i < 5; i++) assert.equal(await verifyHistoryOtp(email, next.challengeId, "invalid"), false);
    assert.equal(await verifyHistoryOtp(email, next.challengeId, code), false);
    await prisma.$executeRaw`UPDATE lazsip_history_otp SET attempts=0, expires_at=DATE_SUB(NOW(3), INTERVAL 1 MINUTE) WHERE email_key=${key}`;
    assert.equal(await verifyHistoryOtp(email, next.challengeId, code), false);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = originalFrom;
    await prisma.$executeRaw`DELETE FROM lazsip_history_otp WHERE email_key=${key}`;
    await prisma.$disconnect();
  }
});
