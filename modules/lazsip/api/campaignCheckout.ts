import { prisma } from "@/lib/prisma";
import { createTransaction } from "@/modules/payment/api/transaction";
import { findOrCreateDonor } from "@/modules/payment/api/donors";
import { normalizeDonorPhone, normalizeDonorEmail } from "@/modules/payment/api/donorIdentity";
import { calculateFee } from "@/modules/lazsip/api/feeCalculation";
import { Prisma } from "@/generated/prisma/client";

export class DonationValidationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function createCampaignCheckout(input: {
  campaignId: string; donorName: string; donorPhone: string; donorEmail: string; amount: number;
  coversFee: boolean; isAnonymous: boolean; paymentMethod: string;
}) {
  const name = input.donorName.trim();
  if (!name || name.length > 191) throw new DonationValidationError("Nama wajib diisi, maksimal 191 karakter.");

  // Nomor WhatsApp dan email masing-masing opsional, tapi minimal salah satu wajib diisi
  // (prd-lazsip.md §3.4 & §6 aturan #6) — bukan dua-duanya wajib.
  const phoneRaw = input.donorPhone.trim();
  const emailRaw = input.donorEmail.trim();
  const phone = phoneRaw ? normalizeDonorPhone(phoneRaw) : null;
  const email = emailRaw ? normalizeDonorEmail(emailRaw) : null;
  if (phoneRaw && !phone) throw new DonationValidationError("Nomor WhatsApp tidak valid, misalnya 081234567890.");
  if (emailRaw && !email) throw new DonationValidationError("Alamat email tidak valid.");
  if (!phone && !email) throw new DonationValidationError("Isi minimal salah satu: nomor WhatsApp atau email.");

  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 2_147_483_647) {
    throw new DonationValidationError("Nominal donasi tidak valid.");
  }

  // Prisma's MySQL upsert can race when phone/email is first seen concurrently — with two
  // unique keys on the same row (phone AND email) a naive immediate retry can stay in
  // lockstep with a competing request and keep re-colliding, so add jitter between attempts.
  // Retry the whole transaction so a failed attempt never leaves an orphan donor.
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const campaign = await tx.lazsipCampaign.findUnique({ where: { id: input.campaignId } });
        if (!campaign || campaign.status !== "active") {
          throw new DonationValidationError("Campaign tidak ditemukan atau sudah selesai.", 404);
        }
        const method = await tx.lazsipPaymentFeeRef.findUnique({ where: { method: input.paymentMethod } });
        if (!method) throw new DonationValidationError("Metode pembayaran tidak tersedia.");
        const adminFee = input.coversFee ? calculateFee(method, input.amount) : 0;
        if (!Number.isSafeInteger(adminFee) || adminFee < 0 || input.amount + adminFee > 2_147_483_647) {
          throw new DonationValidationError("Total pembayaran tidak valid.");
        }
        const destination = await tx.paymentDestinationAccount.findFirst({
          where: { moduleSource: "lazsip", fundType: "infak" }, select: { id: true },
        });
        if (!destination) throw new DonationValidationError("Rekening tujuan belum tersedia. Silakan hubungi pengelola.", 503);
        const donor = await findOrCreateDonor(name, phone, email, tx);
        return createTransaction({
          moduleSource: "lazsip", sourceType: "campaign", sourceId: campaign.id,
          fundType: "infak", donorId: donor.id, isAnonymous: input.isAnonymous,
          amount: input.amount, adminFee, paymentMethod: method.method,
        }, tx);
      });
    } catch (error) {
      if (attempt < 5 && error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2002" || error.code === "P2034")) {
        await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 40));
        continue;
      }
      throw error;
    }
  }
}
