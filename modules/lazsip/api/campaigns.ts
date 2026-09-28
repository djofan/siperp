import { prisma } from "@/lib/prisma";
import { findOrCreateDonor } from "@/modules/payment/api/donors";
import { normalizeDonorPhone, normalizeDonorEmail } from "@/modules/payment/api/donorIdentity";
import { createPaidTransaction } from "@/modules/payment/api/transaction";

export class CampaignAdjustmentError extends Error {}

export async function listCampaigns() {
  const campaigns = await prisma.lazsipCampaign.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
  const ids = campaigns.map((c) => c.id);
  const [totals, donorCounts] = await Promise.all([getCampaignPaidTotals(ids), getCampaignDonorCounts(ids)]);
  return campaigns.map((c) => ({
    ...c,
    currentAmount: totals.get(c.id) ?? 0,
    donorCount: donorCounts.get(c.id) ?? 0,
  }));
}

export async function getCampaignById(id: string) {
  const campaign = await prisma.lazsipCampaign.findUnique({ where: { id } });
  if (!campaign) return null;
  const totals = await getCampaignPaidTotals([id]);
  return { ...campaign, currentAmount: totals.get(id) ?? 0 };
}

export async function getCampaignPaidTotals(ids: string[]) {
  const totals = new Map<string, number>();
  if (!ids.length) return totals;
  const [legacy, payments, adjustments] = await Promise.all([
    prisma.lazsipDonation.groupBy({
      by: ["campaignId"], where: { campaignId: { in: ids }, status: "paid" }, _sum: { amount: true },
    }),
    prisma.paymentTransaction.groupBy({
      by: ["sourceId"],
      where: { moduleSource: "lazsip", sourceType: "campaign", sourceId: { in: ids }, status: "paid" },
      _sum: { amount: true },
    }),
    // Penyesuaian manual (dana keluar/masuk offline) — HARUS ikut dihitung di sini, bukan
    // cuma di kolom LazsipCampaign.currentAmount yang gak pernah dibaca lagi (itu penyebab
    // bug "saldo di card gak berubah" pas admin pakai fitur Tambah/Kurangi Saldo).
    prisma.lazsipCampaignAdjustment.groupBy({
      by: ["campaignId"], where: { campaignId: { in: ids } }, _sum: { amount: true },
    }),
  ]);
  for (const row of legacy) totals.set(row.campaignId, row._sum.amount ?? 0);
  for (const row of payments) totals.set(row.sourceId, (totals.get(row.sourceId) ?? 0) + (row._sum.amount ?? 0));
  for (const row of adjustments) totals.set(row.campaignId, (totals.get(row.campaignId) ?? 0) + (row._sum.amount ?? 0));
  return totals;
}

/** Sama seperti getCampaignPaidTotals tapi hitung jumlah donasi `paid`, bukan nominalnya —
 * dipakai buat "X donatur" di CampaignCard. Harus gabung LazsipDonation (legacy) DAN
 * PaymentTransaction (alur baru), kalau enggak donasi lewat payment gateway gak pernah kehitung. */
export async function getCampaignDonorCounts(ids: string[]) {
  const counts = new Map<string, number>();
  if (!ids.length) return counts;
  const [legacy, payments] = await Promise.all([
    prisma.lazsipDonation.groupBy({
      by: ["campaignId"], where: { campaignId: { in: ids }, status: "paid" }, _count: { _all: true },
    }),
    prisma.paymentTransaction.groupBy({
      by: ["sourceId"],
      where: { moduleSource: "lazsip", sourceType: "campaign", sourceId: { in: ids }, status: "paid" },
      _count: { _all: true },
    }),
  ]);
  for (const row of legacy) counts.set(row.campaignId, row._count._all);
  for (const row of payments) counts.set(row.sourceId, (counts.get(row.sourceId) ?? 0) + row._count._all);
  return counts;
}

interface CampaignInput {
  title: string;
  description: string;
  targetAmount: number;
  image?: string;
  uniqueCode: string;
  isPinned: boolean;
  status: string;
}

export async function createCampaign(input: CampaignInput) {
  return prisma.lazsipCampaign.create({ data: input });
}

export async function updateCampaign(id: string, input: CampaignInput) {
  return prisma.lazsipCampaign.update({ where: { id }, data: input });
}

export async function deleteCampaign(id: string) {
  await prisma.lazsipCampaign.delete({ where: { id } });
}

/** Nyala/matiin tombol Donasi di halaman publik tanpa buka form Edit lengkap — "active" =
 * tombol Donasi aktif, "completed" = diganti pesan "Campaign ini sudah selesai". */
export async function setCampaignStatus(id: string, status: "active" | "completed") {
  await prisma.lazsipCampaign.update({ where: { id }, data: { status } });
}

export interface CampaignHistoryEntry {
  id: string;
  kind: "donasi" | "penyesuaian";
  label: string;
  amount: number;
  createdAt: Date;
}

/**
 * Gabungan donasi `paid` + penyesuaian saldo manual, diurutkan terbaru dulu —
 * satu riwayat lengkap kenapa currentAmount campaign ini bisa jadi segini.
 */
export async function listCampaignHistory(campaignId: string): Promise<CampaignHistoryEntry[]> {
  const [donations, payments, adjustments] = await Promise.all([
    prisma.lazsipDonation.findMany({
      where: { campaignId, status: "paid" },
      orderBy: { createdAt: "desc" },
      include: { donor: { select: { name: true } } },
    }),
    prisma.paymentTransaction.findMany({
      where: { moduleSource: "lazsip", sourceType: "campaign", sourceId: campaignId, status: "paid" },
      orderBy: { createdAt: "desc" },
      include: { donor: { select: { name: true } } },
    }),
    prisma.lazsipCampaignAdjustment.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const entries: CampaignHistoryEntry[] = [
    ...donations.map((d) => ({
      id: d.id,
      kind: "donasi" as const,
      label: d.isAnonymous ? "Hamba Allah" : d.donor.name,
      amount: d.amount,
      createdAt: d.createdAt,
    })),
    ...payments.map((p) => ({
      id: p.id,
      kind: "donasi" as const,
      label: p.isAnonymous ? "Hamba Allah" : p.donor.name,
      amount: p.amount,
      createdAt: p.createdAt,
    })),
    ...adjustments.map((a) => ({
      id: a.id,
      kind: "penyesuaian" as const,
      label: a.note,
      amount: a.amount,
      createdAt: a.createdAt,
    })),
  ];

  return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Penyesuaian saldo manual oleh admin — khusus dana KELUAR/terpakai dari campaign
 * (transparansi "kepakai berapa"), makanya amount wajib negatif. Kalau ada dana MASUK
 * offline (infak yang gak lewat web), pakai createOfflineCampaignDonation di bawah,
 * bukan fungsi ini — biar donatur beneran tercatat (kena hitung donorCount, dst),
 * bukan cuma angka anonim di riwayat.
 */
export async function createCampaignAdjustment(campaignId: string, amount: number, note: string) {
  await prisma.$transaction(async (tx) => {
    await tx.lazsipCampaignAdjustment.create({ data: { campaignId, amount, note } });
    await tx.lazsipCampaign.update({
      where: { id: campaignId },
      data: { currentAmount: { increment: amount } },
    });
  });
}

/**
 * Catat infak yang masuk BUKAN lewat web (mis. transfer langsung ke rekening admin/call
 * center). Beda dari createCampaignAdjustment: ini bikin donatur + transaksi `paid`
 * sungguhan (lewat PaymentTransaction), jadi otomatis kehitung di currentAmount DAN
 * donorCount, serta muncul di daftar donatur — bukan cuma catatan anonim.
 */
export async function createOfflineCampaignDonation(
  campaignId: string,
  input: { name: string; phone: string; email: string; amount: number }
) {
  const name = input.name.trim();
  if (!name || name.length > 191) throw new CampaignAdjustmentError("Nama (sesuai KTP) wajib diisi, maksimal 191 karakter.");

  const phoneRaw = input.phone.trim();
  const emailRaw = input.email.trim();
  const phone = phoneRaw ? normalizeDonorPhone(phoneRaw) : null;
  const email = emailRaw ? normalizeDonorEmail(emailRaw) : null;
  if (phoneRaw && !phone) throw new CampaignAdjustmentError("Nomor WhatsApp tidak valid.");
  if (emailRaw && !email) throw new CampaignAdjustmentError("Email tidak valid.");
  if (!phone && !email) throw new CampaignAdjustmentError("Isi minimal salah satu: nomor WhatsApp atau email.");

  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 2_147_483_647) {
    throw new CampaignAdjustmentError("Nominal tidak valid.");
  }

  const campaign = await prisma.lazsipCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new CampaignAdjustmentError("Campaign tidak ditemukan.");

  const donor = await findOrCreateDonor(name, phone, email);
  return createPaidTransaction({
    moduleSource: "lazsip",
    sourceType: "campaign",
    sourceId: campaignId,
    fundType: "infak",
    donorId: donor.id,
    isAnonymous: false,
    amount: input.amount,
    paymentMethod: "Input Manual Admin",
  });
}
