export function paymentGateway() {
  const value = process.env.PAYMENT_GATEWAY || "simulation";
  if (value !== "simulation" && value !== "midtrans_sandbox") throw new Error("PAYMENT_GATEWAY harus simulation atau midtrans_sandbox.");
  return value;
}

export const sandboxMethod = { id: "midtrans-sandbox", method: "Midtrans Sandbox", feeAmount: 0, feePercentage: 0 };

export function midtransConfig() {
  const key = process.env.MIDTRANS_SERVER_KEY || "";
  const merchantId = process.env.MIDTRANS_MERCHANT_ID || "";
  const origin = new URL(process.env.PAYMENT_PUBLIC_URL || "http://localhost:3000");
  if (!key.startsWith("SB-Mid-server-") || !merchantId) throw new Error("Lengkapi Sandbox Server Key dan Merchant ID Midtrans.");
  if (!["https:", "http:"].includes(origin.protocol) || origin.username || origin.password) throw new Error("PAYMENT_PUBLIC_URL tidak valid.");
  if (origin.protocol === "http:" && !["localhost", "127.0.0.1"].includes(origin.hostname)) throw new Error("URL publik harus menggunakan HTTPS.");
  return { key, merchantId, origin: origin.origin };
}

export function safeCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "app.sandbox.midtrans.com" && !url.username && !url.password && url.pathname.startsWith("/snap/");
  } catch { return false; }
}

function headers(key: string) {
  return { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`, "Content-Type": "application/json", Accept: "application/json" };
}

export async function createSnap(transaction: { id: string; midtransOrderId: string | null; amount: number; adminFee: number; gatewayMerchantId: string | null }, send: typeof fetch = fetch) {
  const config = midtransConfig();
  if (!transaction.midtransOrderId || transaction.gatewayMerchantId !== config.merchantId) throw new Error("Merchant transaksi tidak sesuai konfigurasi.");
  const response = await send("https://app.sandbox.midtrans.com/snap/v1/transactions", {
    method: "POST", headers: headers(config.key), signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ transaction_details: { order_id: transaction.midtransOrderId, gross_amount: transaction.amount + transaction.adminFee },
      credit_card: { secure: true }, callbacks: { finish: `${config.origin}/payment/checkout/${transaction.id}` } }),
  });
  if (!response.ok) throw new Error("Midtrans belum dapat membuat checkout.");
  const data = await response.json();
  if (typeof data.token !== "string" || !safeCheckoutUrl(data.redirect_url)) throw new Error("Respons checkout tidak valid.");
  return { url: data.redirect_url };
}

// Query Midtrans directly: notification signatures do not cover transaction_status.
export async function fetchMidtransStatus(orderId: string, send: typeof fetch = fetch) {
  const config = midtransConfig();
  const response = await send(`https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderId)}/status`, {
    headers: headers(config.key), cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (response.status === 404) return null; // Snap exists but customer has not selected a method yet.
  if (!response.ok) throw new Error("Status Midtrans belum tersedia.");
  const data = await response.json();
  if (data.status_code === "404") return null;
  return data as Record<string, unknown>;
}

export function verifiedPaymentStatus(data: Record<string, unknown>, transaction: { midtransOrderId: string | null; gatewayMerchantId: string | null; amount: number; adminFee: number }) {
  if (data.order_id !== transaction.midtransOrderId || data.merchant_id !== transaction.gatewayMerchantId || data.currency !== "IDR" || typeof data.gross_amount !== "string" || !/^\d+(\.0+)?$/.test(data.gross_amount) || Number(data.gross_amount) !== transaction.amount + transaction.adminFee) throw new Error("Data pembayaran tidak cocok dengan transaksi.");
  if (data.transaction_status === "settlement" || (data.transaction_status === "capture" && data.fraud_status === "accept")) return "paid";
  if (["expire", "cancel", "deny", "failure"].includes(String(data.transaction_status))) return "failed";
  return null; // pending, challenge, refund etc. must not be interpreted as a new payment.
}
