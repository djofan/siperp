/** Open the existing transaction's gateway session; retries never create a donation. */
export async function openGatewayCheckout(transactionId: string): Promise<string> {
  const response = await fetch(`/api/payment/gateway-session/${encodeURIComponent(transactionId)}`, { method: "POST" });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof data?.error?.message === "string" ? data.error.message : "Pembayaran belum dapat dibuka. Coba lanjutkan transaksi yang sama.");
  }
  let url: URL;
  try { url = new URL(data?.url); } catch { throw new Error("Alamat pembayaran tidak valid. Silakan periksa status transaksi."); }
  const allowed = ["my.ipaymu.com", "payment.ipaymu.com", "sandbox.ipaymu.com", "sandbox-payment.ipaymu.com"];
  if (url.protocol !== "https:" || url.username || url.password || !allowed.includes(url.hostname)) {
    throw new Error("Alamat pembayaran tidak valid. Silakan periksa status transaksi.");
  }
  return url.href;
}
