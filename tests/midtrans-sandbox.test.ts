import assert from "node:assert/strict";
import test from "node:test";
import { createSnap, fetchMidtransStatus, midtransConfig, safeCheckoutUrl, verifiedPaymentStatus } from "../modules/payment/api/midtrans";

const transaction = { id: "local-id", midtransOrderId: "SIP-order", gatewayMerchantId: "MTEST", amount: 100000, adminFee: 1000 };
const payment = { order_id: "SIP-order", merchant_id: "MTEST", currency: "IDR", gross_amount: "101000.00", transaction_status: "settlement" };

test("verified statuses bind order, merchant, currency and total", () => {
  assert.equal(verifiedPaymentStatus(payment, transaction), "paid");
  for (const patch of [{ order_id: "other" }, { merchant_id: "other" }, { currency: "USD" }, { gross_amount: "100000.00" }, { gross_amount: "101000garbage" }]) {
    assert.throws(() => verifiedPaymentStatus({ ...payment, ...patch }, transaction));
  }
  assert.equal(verifiedPaymentStatus({ ...payment, transaction_status: "capture", fraud_status: "accept" }, transaction), "paid");
  for (const status of ["pending", "refund", "capture", "unknown"]) assert.equal(verifiedPaymentStatus({ ...payment, transaction_status: status }, transaction), null);
  assert.equal(verifiedPaymentStatus({ ...payment, transaction_status: "capture", fraud_status: "challenge" }, transaction), null);
  for (const status of ["expire", "cancel", "deny", "failure"]) assert.equal(verifiedPaymentStatus({ ...payment, transaction_status: status }, transaction), "failed");
});

test("only sandbox Snap URLs are accepted", () => {
  assert.equal(safeCheckoutUrl("https://app.sandbox.midtrans.com/snap/v3/redirection/test"), true);
  for (const value of ["https://app.midtrans.com/snap/test", "https://app.sandbox.midtrans.com.evil.test/snap/test", "http://app.sandbox.midtrans.com/snap/test", "https://user:pass@app.sandbox.midtrans.com/snap/test", "javascript:alert(1)"]) assert.equal(safeCheckoutUrl(value), false);
});

test("Snap uses server totals and sandbox only; status 404 stays pending", async () => {
  const before = { key: process.env.MIDTRANS_SERVER_KEY, merchant: process.env.MIDTRANS_MERCHANT_ID, url: process.env.PAYMENT_PUBLIC_URL };
  process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-test";
  process.env.MIDTRANS_MERCHANT_ID = "MTEST";
  process.env.PAYMENT_PUBLIC_URL = "http://localhost:3000";
  try {
    let calls = 0;
    const send: typeof fetch = async (url, options) => {
      calls++;
      assert.equal(url, "https://app.sandbox.midtrans.com/snap/v1/transactions");
      const body = JSON.parse(String(options?.body));
      assert.deepEqual(body.transaction_details, { order_id: "SIP-order", gross_amount: 101000 });
      assert.equal(body.callbacks.finish, "http://localhost:3000/payment/checkout/local-id");
      return Response.json({ token: "test", redirect_url: "https://app.sandbox.midtrans.com/snap/test" });
    };
    assert.equal((await createSnap(transaction, send)).url, "https://app.sandbox.midtrans.com/snap/test");
    await assert.rejects(createSnap({ ...transaction, gatewayMerchantId: "other" }, send));
    assert.equal(calls, 1);
    assert.equal(await fetchMidtransStatus("SIP-order", async () => new Response(null, { status: 404 })), null);
    await assert.rejects(createSnap(transaction, async () => Response.json({ token: "test", redirect_url: "https://app.midtrans.com/snap/test" })));
    process.env.MIDTRANS_SERVER_KEY = "Mid-server-production";
    assert.throws(midtransConfig);
  } finally {
    for (const [key, value] of Object.entries({ MIDTRANS_SERVER_KEY: before.key, MIDTRANS_MERCHANT_ID: before.merchant, PAYMENT_PUBLIC_URL: before.url })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
