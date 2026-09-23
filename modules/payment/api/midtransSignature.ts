import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Midtrans webhook notification signature: SHA512(order_id + status_code + gross_amount + ServerKey).
 * https://docs.midtrans.com/docs/https-notification-webhooks
 */
export function verifyMidtransSignature(payload: {
  order_id: unknown;
  status_code: unknown;
  gross_amount: unknown;
  signature_key: unknown;
}, serverKey: string): boolean {
  if (
    typeof payload.order_id !== "string" ||
    typeof payload.status_code !== "string" ||
    typeof payload.gross_amount !== "string" ||
    typeof payload.signature_key !== "string"
  ) {
    return false;
  }
  const expected = createHash("sha512")
    .update(payload.order_id + payload.status_code + payload.gross_amount + serverKey)
    .digest("hex");
  if (!/^[a-f0-9]{128}$/i.test(payload.signature_key)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(payload.signature_key, "hex"));
}
