import { prisma } from "@/lib/prisma";
export const KINDS = ["kegiatan", "campaign", "berita"] as const;
export type EntryKind = typeof KINDS[number];
export function isEntryKind(value: string): value is EntryKind { return KINDS.includes(value as EntryKind); }
export const money = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);

export async function getProfile() {
  return await prisma.sarsipProfile.findUnique({ where: { id: "main" } }) ?? {
    id: "main", headline: "Bersama hadir, saat bantuan dibutuhkan.",
    description: "Tim SAR Solidaritas Insan Peduli. Pencarian, pertolongan, dan bantuan kemanusiaan untuk sesama.", contact: null,
  };
}

export async function listEntries(kind?: EntryKind, admin = false) {
  const entries = await prisma.sarsipEntry.findMany({
    where: { ...(kind ? { kind } : { kind: { in: [...KINDS] } }), ...(!admin ? { status: { in: ["published", "completed"] } } : {}) },
    orderBy: { createdAt: "desc" },
  });
  const sums = await prisma.paymentTransaction.groupBy({
    by: ["sourceId"], where: { moduleSource: "sarsip", sourceType: "campaign", status: "paid", sourceId: { in: entries.map((e) => e.id) } },
    _sum: { amount: true },
  });
  const totals = new Map(sums.map((s) => [s.sourceId, s._sum.amount ?? 0]));
  return entries.map((e) => ({ ...e, currentAmount: totals.get(e.id) ?? 0 }));
}

export async function getEntry(id: string, kind: EntryKind, admin = false) {
  const entries = await listEntries(kind, admin);
  return entries.find((e) => e.id === id) ?? null;
}

export async function listPublicDonations(campaignId: string) {
  const rows = await prisma.paymentTransaction.findMany({
    where: { moduleSource: "sarsip", sourceType: "campaign", sourceId: campaignId, status: "paid" },
    select: { id: true, amount: true, isAnonymous: true, donor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({ id: r.id, amount: r.amount, name: r.isAnonymous ? "Hamba Allah" : r.donor.name }));
}

export async function listAdminTransactions() {
  return prisma.paymentTransaction.findMany({
    where: { moduleSource: "sarsip" }, orderBy: { createdAt: "desc" },
    include: { donor: { select: { id: true, name: true, phone: true } } },
  });
}

