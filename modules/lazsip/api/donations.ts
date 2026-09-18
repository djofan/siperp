import { prisma } from "@/lib/prisma";
import { listTransactionsBySource } from "@/modules/payment/api/transaction";
export { createCampaignCheckout as createDonation } from "@/modules/lazsip/api/campaignCheckout";

export async function listDonationsForAdmin() {
  const donations = await prisma.lazsipDonation.findMany({
    orderBy: { createdAt: "desc" },
    include: { campaign: { select: { title: true, uniqueCode: true } }, donor: { select: { name: true } } },
  });
  return donations.map((d) => ({ ...d, donorName: d.donor.name }));
}

/**
 * Satu-satunya jalan status donasi berubah jadi paid/failed — dipanggil dari webhook payment
 * gateway asli (nanti) atau endpoint simulasi admin (sekarang). TIDAK BOLEH dipanggil dari
 * halaman redirect sukses di sisi client. Lihat CLAUDE.md §7 aturan #1.
 */
export async function setDonationStatus(id: string, status: "paid" | "failed") {
  await prisma.lazsipDonation.updateMany({
    where: { id, status: "pending" },
    data: { status },
  });
}

export async function listPaymentDonationsForAdmin() {
  const transactions = await listTransactionsBySource("lazsip");
  const campaignTxns = transactions.filter((t) => t.sourceType === "campaign");
  const campaignIds = [...new Set(campaignTxns.map((t) => t.sourceId))];
  const campaigns = await prisma.lazsipCampaign.findMany({
    where: { id: { in: campaignIds } },
    select: { id: true, title: true },
  });
  const titleById = new Map(campaigns.map((c) => [c.id, c.title]));

  return campaignTxns.map((t) => ({
    id: t.id,
    donorName: t.donor.name,
    amount: t.amount,
    adminFee: t.adminFee,
    paymentMethod: t.paymentMethod,
    status: t.status,
    createdAt: t.createdAt,
    campaign: { title: titleById.get(t.sourceId) ?? "(campaign tidak ditemukan)" },
  }));
}
