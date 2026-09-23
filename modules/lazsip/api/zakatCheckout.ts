import { paymentGateway, sandboxMethod } from "@/modules/payment/api/midtrans";
import { prisma } from "@/lib/prisma";
import { createTransaction } from "@/modules/payment/api/transaction";
import { findOrCreateDonor } from "@/modules/payment/api/donors";
import { normalizeDonorPhone, normalizeDonorEmail } from "@/modules/payment/api/donorIdentity";
import { calculateFee } from "@/modules/lazsip/api/feeCalculation";
import { Prisma } from "@/generated/prisma/client";

export class ZakatValidationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function createZakatCheckout(input: {
  donorName: string; donorPhone: string; donorEmail: string; amount: number; zakatType: "maal" | "fitrah";
  goldPriceSnapshot?: number; jiwaCount?: number;
  coversFee: boolean; isAnonymous: boolean; paymentMethod: string;
}) {
  const name = input.donorName.trim();
  if (!name || name.length > 191) throw new ZakatValidationError("Nama wajib diisi, maksimal 191 karakter.");

  // Nomor WhatsApp dan email masing-masing opsional, tapi minimal salah satu wajib diisi
  // (prd-lazsip.md §3.3 & §6 aturan #6) — bukan dua-duanya wajib.
  const phoneRaw = input.donorPhone.trim();
  const emailRaw = input.donorEmail.trim();
  const phone = phoneRaw ? normalizeDonorPhone(phoneRaw) : null;
  const email = emailRaw ? normalizeDonorEmail(emailRaw) : null;
  if (phoneRaw && !phone) throw new ZakatValidationError("Nomor WhatsApp tidak valid, misalnya 081234567890.");
  if (emailRaw && !email) throw new ZakatValidationError("Alamat email tidak valid.");
  if (!phone && !email) throw new ZakatValidationError("Isi minimal salah satu: nomor WhatsApp atau email.");

  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 2_147_483_647) {
    throw new ZakatValidationError("Nominal zakat tidak valid.");
  }

  // Prisma's MySQL upsert can race when a phone is first seen concurrently.
  // Retry the whole transaction so a failed attempt never leaves an orphan donor.
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const method = paymentGateway() === "midtrans_sandbox"
          ? (input.paymentMethod === sandboxMethod.method ? sandboxMethod : null)
          : await tx.lazsipPaymentFeeRef.findUnique({ where: { method: input.paymentMethod } });
        if (!method) throw new ZakatValidationError("Metode pembayaran tidak tersedia.");
        const adminFee = input.coversFee ? calculateFee(method, input.amount) : 0;
        if (!Number.isSafeInteger(adminFee) || adminFee < 0 || input.amount + adminFee > 2_147_483_647) {
          throw new ZakatValidationError("Total pembayaran tidak valid.");
        }
        const destination = await tx.paymentDestinationAccount.findFirst({
          where: { moduleSource: "lazsip", fundType: "zakat" }, select: { id: true },
        });
        if (!destination) throw new ZakatValidationError("Rekening zakat belum tersedia. Silakan hubungi pengelola.", 503);
        const donor = await findOrCreateDonor(name, phone, email, tx);
        const detail = await tx.lazsipZakatDetail.create({
          data: {
            zakatType: input.zakatType,
            goldPriceSnapshot: input.zakatType === "maal" ? input.goldPriceSnapshot ?? 0 : null,
            jiwaCount: input.zakatType === "fitrah" ? input.jiwaCount ?? null : null,
          },
        });
        return createTransaction({
          moduleSource: "lazsip", sourceType: "zakat", sourceId: detail.id,
          fundType: "zakat", donorId: donor.id, isAnonymous: input.isAnonymous,
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
