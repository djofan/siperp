import { prisma } from "@/lib/prisma";
import { getGoldPricePerGram } from "@/modules/lazsip/api/goldPrice";
import { getSiteContent } from "@/modules/lazsip/api/siteContent";
import { getPaymentFeeRef, calculateFee } from "@/modules/lazsip/api/paymentFees";
import { listTransactionsBySource } from "@/modules/payment/api/transaction";

const NISAB_GRAM = 85;
const ZAKAT_RATE = 0.025;

// Nominal zakat fitrah per jiwa itu ketetapan lokal (harga beras/makanan pokok setempat),
// bukan angka global — jadi bisa diedit admin lewat Konten Umum. Default ini cuma fallback
// kalau admin belum pernah mengisi.
const DEFAULT_FITRAH_PRICE_PER_JIWA = 45_000;

export async function calculateZakat(hartaAmount: number) {
  const goldPricePerGram = await getGoldPricePerGram();
  const nisabValue = goldPricePerGram * NISAB_GRAM;
  const isWajibZakat = hartaAmount >= nisabValue;
  const zakatAmount = isWajibZakat ? Math.round(hartaAmount * ZAKAT_RATE) : 0;

  return { goldPricePerGram, nisabValue, isWajibZakat, zakatAmount };
}

export async function getZakatFitrahPricePerJiwa(): Promise<number> {
  const content = await getSiteContent("zakatFitrah");
  const value = Number(content?.pricePerJiwa);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_FITRAH_PRICE_PER_JIWA;
}

export async function calculateZakatFitrah(jiwaCount: number) {
  const pricePerJiwa = await getZakatFitrahPricePerJiwa();
  const totalAmount = Math.round(pricePerJiwa * jiwaCount);
  return { pricePerJiwa, jiwaCount, totalAmount };
}

export async function listZakatPaymentsForAdmin() {
  const payments = await prisma.lazsipZakatPayment.findMany({
    orderBy: { createdAt: "desc" }, include: { donor: { select: { name: true } } },
  });
  return payments.map((p) => ({ ...p, donorName: p.donor.name }));
}

interface CreateZakatPaymentInput {
  donorName: string;
  zakatType: "maal" | "fitrah";
  amount: number;
  coversFee: boolean;
  isAnonymous: boolean;
  goldPriceSnapshot?: number;
  jiwaCount?: number;
  paymentMethod: string;
}

export async function createZakatPayment(input: CreateZakatPaymentInput) {
  const feeRef = await getPaymentFeeRef(input.paymentMethod);
  const adminFee = input.coversFee ? calculateFee(feeRef, input.amount) : 0;

  return prisma.lazsipZakatPayment.create({
    data: {
      donor: { create: { name: input.donorName } },
      zakatType: input.zakatType,
      amount: input.amount,
      adminFee,
      coversFee: input.coversFee,
      isAnonymous: input.isAnonymous,
      goldPriceSnapshot: input.zakatType === "maal" ? input.goldPriceSnapshot ?? 0 : null,
      jiwaCount: input.zakatType === "fitrah" ? input.jiwaCount ?? null : null,
      paymentMethod: input.paymentMethod,
      status: "pending",
    },
  });
}

/** Sama seperti donasi: status paid/failed HANYA lewat webhook/simulasi admin. Rekening zakat terpisah dari donasi. */
export async function setZakatPaymentStatus(id: string, status: "paid" | "failed") {
  await prisma.lazsipZakatPayment.updateMany({
    where: { id, status: "pending" },
    data: { status },
  });
}

/** Pembayaran zakat lewat modul Payment (checkout baru) — sumber kebenaran terpisah dari
 * tabel lama LazsipZakatPayment di atas, yang cuma menyimpan riwayat sebelum modul Payment ada. */
export async function listPaymentZakatForAdmin() {
  const transactions = await listTransactionsBySource("lazsip");
  const zakatTxns = transactions.filter((t) => t.sourceType === "zakat");
  const detailIds = zakatTxns.map((t) => t.sourceId);
  const details = await prisma.lazsipZakatDetail.findMany({ where: { id: { in: detailIds } } });
  const detailById = new Map(details.map((d) => [d.id, d]));

  return zakatTxns.map((t) => ({
    id: t.id,
    donorName: t.donor.name,
    zakatType: detailById.get(t.sourceId)?.zakatType === "fitrah" ? "fitrah" : "maal",
    amount: t.amount,
    adminFee: t.adminFee,
    paymentMethod: t.paymentMethod,
    status: t.status,
    createdAt: t.createdAt,
  }));
}
