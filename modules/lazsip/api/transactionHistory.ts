import { prisma } from "@/lib/prisma";
import { normalizeDonorEmail } from "@/modules/payment/api/donorIdentity";
import { sendHistoryEmail } from "@/modules/payment/api/email";

export interface HistoryItem {
  trackingCode: string;
  type: "donasi" | "zakat";
  label: string;
  amount: number;
  status: string;
  createdAt: Date;
}

/** Riwayat lengkap (semua status) donasi + zakat milik satu donor — dipakai Cek Riwayat
 * publik (§3.11.B) dan halaman detail donatur admin (§4.3). */
export async function getDonorTransactionHistory(donorId: string): Promise<HistoryItem[]> {
  const [newTransactions, campaigns, zakatDetails, legacyDonations, legacyZakat] = await Promise.all([
    prisma.paymentTransaction.findMany({ where: { donorId, moduleSource: "lazsip" } }),
    prisma.lazsipCampaign.findMany({ select: { id: true, title: true } }),
    prisma.lazsipZakatDetail.findMany({ select: { id: true, zakatType: true } }),
    prisma.lazsipDonation.findMany({ where: { donorId }, include: { campaign: { select: { title: true } } } }),
    prisma.lazsipZakatPayment.findMany({ where: { donorId } }),
  ]);

  const campaignTitleById = new Map(campaigns.map((c) => [c.id, c.title]));
  const zakatTypeById = new Map(zakatDetails.map((d) => [d.id, d.zakatType]));

  return [
    ...newTransactions.map((t): HistoryItem => {
      if (t.sourceType === "campaign") {
        return {
          trackingCode: t.trackingCode, type: "donasi", label: campaignTitleById.get(t.sourceId) ?? "Donasi",
          amount: t.amount, status: t.status, createdAt: t.createdAt,
        };
      }
      const zakatType = zakatTypeById.get(t.sourceId);
      return {
        trackingCode: t.trackingCode, type: "zakat", label: zakatType === "fitrah" ? "Zakat Fitrah" : "Zakat Maal",
        amount: t.amount, status: t.status, createdAt: t.createdAt,
      };
    }),
    ...legacyDonations.map((d): HistoryItem => ({
      trackingCode: d.id, type: "donasi", label: d.campaign.title, amount: d.amount, status: d.status, createdAt: d.createdAt,
    })),
    ...legacyZakat.map((z): HistoryItem => ({
      trackingCode: z.id, type: "zakat", label: z.zakatType === "fitrah" ? "Zakat Fitrah" : "Zakat Maal",
      amount: z.amount, status: z.status, createdAt: z.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * prd-lazsip.md §3.11.B & §6 aturan #8: TIDAK PERNAH mengembalikan apakah email ini
 * terdaftar atau tidak — cuma mengirim email kalau ketemu, diam-diam kalau tidak.
 * Pemanggil (route handler) SELALU membalas respons publik yang sama persis apa pun
 * hasil fungsi ini, supaya endpoint tidak bisa dipakai menebak email siapa saja yang
 * pernah berdonasi.
 */
export async function sendHistoryIfFound(rawEmail: string): Promise<void> {
  const email = normalizeDonorEmail(rawEmail);
  if (!email) return;

  const donor = await prisma.paymentDonor.findUnique({ where: { email } });
  if (!donor) return;

  const items = await getDonorTransactionHistory(donor.id);
  if (items.length === 0) return;

  await sendHistoryEmail(email, items);
}
