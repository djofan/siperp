import { prisma } from "@/lib/prisma";
import { createTransaction } from "@/modules/payment/api/transaction";
import { findOrCreateDonor } from "@/modules/payment/api/donors";
import { normalizeDonorPhone } from "@/modules/payment/api/donorIdentity";
import { calculateFee } from "@/modules/lazsip/api/feeCalculation";
import { Prisma } from "@/generated/prisma/client";

import { DonationValidationError } from "@/modules/payment/api/checkoutValidation";
export { DonationValidationError } from "@/modules/payment/api/checkoutValidation";

export async function createSarsipCheckout(input: {
  campaignId: string; donorName: string; donorPhone: string; amount: number;
  coversFee: boolean; isAnonymous: boolean; paymentMethod: string;
}) {
  const name = input.donorName.trim();
  const phone = normalizeDonorPhone(input.donorPhone);
  if (!name || name.length > 191) throw new DonationValidationError("Nama wajib diisi, maksimal 191 karakter.");
  if (!phone) throw new DonationValidationError("Masukkan nomor WhatsApp yang valid, misalnya 081234567890.");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 2_147_483_647) {
    throw new DonationValidationError("Nominal donasi tidak valid.");
  }

  // Prisma's MySQL upsert can race when a phone is first seen concurrently.
  // Retry the whole transaction so a failed attempt never leaves an orphan donor.
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const campaign = await tx.sarsipEntry.findUnique({ where: { id: input.campaignId } });
        if (!campaign || (campaign.kind !== "campaign" || campaign.status !== "published")) {
          throw new DonationValidationError("Campaign tidak ditemukan atau sudah selesai.", 404);
        }
        const method = await tx.sarsipPaymentMethod.findUnique({ where: { method: input.paymentMethod } });
        if (!method) throw new DonationValidationError("Metode pembayaran tidak tersedia.");
        const adminFee = input.coversFee ? calculateFee(method, input.amount) : 0;
        if (!Number.isSafeInteger(adminFee) || adminFee < 0 || input.amount + adminFee > 2_147_483_647) {
          throw new DonationValidationError("Total pembayaran tidak valid.");
        }
        const destination = await tx.paymentDestinationAccount.findFirst({
          where: { moduleSource: "sarsip", fundType: "donasi" }, select: { id: true },
        });
        if (!destination) throw new DonationValidationError("Rekening tujuan belum tersedia. Silakan hubungi pengelola.", 503);
        const donor = await findOrCreateDonor(name, phone, tx);
        return createTransaction({
          moduleSource: "sarsip", sourceType: "campaign", sourceId: campaign.id,
          fundType: "donasi", donorId: donor.id, isAnonymous: input.isAnonymous,
          amount: input.amount, adminFee, paymentMethod: method.method,
        }, tx);
      });
    } catch (error) {
      if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2002" || error.code === "P2034")) continue;
      throw error;
    }
  }
}

