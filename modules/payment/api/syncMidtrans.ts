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
