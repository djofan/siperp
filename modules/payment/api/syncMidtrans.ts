import { prisma } from "@/lib/prisma";
import { fetchMidtransStatus, midtransConfig, verifiedPaymentStatus } from "./midtrans";
import { markAsPaid, markAsFailed } from "./transaction";
import { revalidateSourcePaymentViews } from "./revalidate";

export async function syncMidtrans(orderId: string) {
  const transaction = await prisma.paymentTransaction.findUnique({ where: { midtransOrderId: orderId } });
  if (!transaction || transaction.gateway !== "midtrans_sandbox") throw new Error("Transaksi gateway tidak ditemukan.");
  if (transaction.gatewayMerchantId !== midtransConfig().merchantId) throw new Error("Merchant tidak cocok.");
  const data = await fetchMidtransStatus(orderId);
  if (!data) return;
  const status = verifiedPaymentStatus(data, transaction);
  if (status === "paid") await markAsPaid(orderId);
  if (status === "failed") await markAsFailed(orderId);
  if (status) revalidateSourcePaymentViews(transaction.moduleSource);
}

/**
 * Dipanggil dari halaman admin (dashboard, tabel transaksi, detail donatur) supaya status
 * gateway asli gak "nyangkut" di Pending sampai ada yang gak sengaja mancing sync lewat
 * Cek Status publik/checkout duluan — sebelumnya itu satu-satunya jalan status ke-refresh.
 * Best-effort: satu transaksi gagal di-cek ke Midtrans (network/timeout) gak boleh gagalkan
 * transaksi lain atau gagalkan halaman admin yang lagi dimuat.
 */
export async function syncPendingTransactions(
  transactions: { status: string; gateway: string; midtransOrderId: string | null }[]
): Promise<boolean> {
  const pending = transactions.filter(
    (t): t is typeof t & { midtransOrderId: string } =>
      t.status === "pending" && t.gateway === "midtrans_sandbox" && !!t.midtransOrderId
  );
  if (pending.length === 0) return false;
  await Promise.allSettled(pending.map((t) => syncMidtrans(t.midtransOrderId)));
  return true;
}
