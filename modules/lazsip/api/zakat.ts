import { prisma } from "@/lib/prisma";
import { getGoldPricePerGram } from "@/modules/lazsip/api/goldPrice";
import { getSiteContent } from "@/modules/lazsip/api/siteContent";

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
  return prisma.lazsipZakatPayment.findMany({ orderBy: { createdAt: "desc" } });
}

interface CreateZakatPaymentInput {
  donorName: string;
  zakatType: "maal" | "fitrah";
  amount: number;
  goldPriceSnapshot?: number;
  jiwaCount?: number;
  paymentMethod: string;
}

export async function createZakatPayment(input: CreateZakatPaymentInput) {
  return prisma.lazsipZakatPayment.create({
    data: {
      donorName: input.donorName,
      zakatType: input.zakatType,
      amount: input.amount,
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
