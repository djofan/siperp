import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { verifyMidtransSignature } from "@/modules/payment/api/midtransSignature";

const serverKey = "test-server-key";

function sign(orderId: string, statusCode: string, grossAmount: string) {
  return createHash("sha512").update(orderId + statusCode + grossAmount + serverKey).digest("hex");
}

test("accepts a correctly signed notification", () => {
  const payload = {
    order_id: "ORDER-1",
    status_code: "200",
    gross_amount: "150000.00",
    signature_key: sign("ORDER-1", "200", "150000.00"),
  };
  assert.equal(verifyMidtransSignature(payload, serverKey), true);
});

test("rejects a tampered field even if the signature looks well-formed", () => {
  const payload = {
    order_id: "ORDER-1",
    status_code: "200",
    gross_amount: "9999999.00", // attacker inflates/changes the amount after signing
    signature_key: sign("ORDER-1", "200", "150000.00"),
  };
  assert.equal(verifyMidtransSignature(payload, serverKey), false);
});

test("rejects a signature made with the wrong server key", () => {
  const payload = {
    order_id: "ORDER-1",
    status_code: "200",
    gross_amount: "150000.00",
    signature_key: createHash("sha512").update("ORDER-1" + "200" + "150000.00" + "wrong-key").digest("hex"),
  };
  assert.equal(verifyMidtransSignature(payload, serverKey), false);
});

test("rejects missing or non-string fields instead of throwing", () => {
  assert.equal(verifyMidtransSignature({ order_id: "ORDER-1", status_code: "200", gross_amount: "150000.00", signature_key: undefined }, serverKey), false);
  assert.equal(verifyMidtransSignature({ order_id: "ORDER-1", status_code: 200, gross_amount: "150000.00", signature_key: "x" }, serverKey), false);
  assert.equal(verifyMidtransSignature({ order_id: undefined, status_code: undefined, gross_amount: undefined, signature_key: undefined }, serverKey), false);
});
