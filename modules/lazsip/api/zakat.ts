import { prisma } from "@/lib/prisma";
import { getGoldPricePerGram } from "@/modules/lazsip/api/goldPrice";

const NISAB_GRAM = 85;
const ZAKAT_RATE = 0.025;

export async function calculateZakat(hartaAmount: number) {
  const goldPricePerGram = await getGoldPricePerGram();
  const nisabValue = goldPricePerGram * NISAB_GRAM;
  const isWajibZakat = hartaAmount >= nisabValue;
  const zakatAmount = isWajibZakat ? Math.round(hartaAmount * ZAKAT_RATE) : 0;

  return { goldPricePerGram, nisabValue, isWajibZakat, zakatAmount };
}

export async function listZakatPaymentsForAdmin() {
  return prisma.lazsipZakatPayment.findMany({ orderBy: { createdAt: "desc" } });
}

interface CreateZakatPaymentInput {
  donorName: string;
  amount: number;
  goldPriceSnapshot: number;
  paymentMethod: string;
}

export async function createZakatPayment(input: CreateZakatPaymentInput) {
  return prisma.lazsipZakatPayment.create({ data: { ...input, status: "pending" } });
}

/** Sama seperti donasi: status paid/failed HANYA lewat webhook/simulasi admin. Rekening zakat terpisah dari donasi. */
export async function setZakatPaymentStatus(id: string, status: "paid" | "failed") {
  await prisma.lazsipZakatPayment.updateMany({
    where: { id, status: "pending" },
    data: { status },
  });
}
