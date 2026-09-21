import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Nama wajib, dan minimal salah satu dari phone/email wajib (divalidasi oleh pemanggil
 * sebelum sampai sini). Kalau WA diisi, donatur dicocokkan lewat waNumber; kalau WA kosong
 * tapi email diisi, dicocokkan lewat email — sesuai prd-lazsip.md §6 aturan #6.
 *
 * Kasus silang: WA baru (belum ada donatur dengan nomor itu) tapi emailnya SUDAH dipakai
 * donatur lain — diperlakukan sebagai orang yang sama (mis. dulu cuma isi email, sekarang
 * isi WA juga), jadi nomor barunya digabung ke profil yang sudah ada lewat email itu,
 * bukan dianggap tabrakan.
 */
export async function findOrCreateDonor(
  name: string,
  phone: string | null,
  email: string | null,
  tx: Prisma.TransactionClient = prisma
) {
  if (phone) {
    const existingByPhone = await tx.paymentDonor.findUnique({ where: { phone } });
    if (existingByPhone) {
      // Cannot overwrite an existing person's name merely by entering their phone again —
      // email is refreshed only when a new one is actually supplied, so a checkout with
      // phone-only never wipes a previously saved email.
      if (email && email !== existingByPhone.email) {
        return tx.paymentDonor.update({ where: { id: existingByPhone.id }, data: { email } });
      }
      return existingByPhone;
    }

    if (email) {
      const existingByEmail = await tx.paymentDonor.findUnique({ where: { email } });
      if (existingByEmail) {
        return tx.paymentDonor.update({ where: { id: existingByEmail.id }, data: { phone } });
      }
    }

    return tx.paymentDonor.create({ data: { name, phone, email } });
  }

  // No phone this time — caller guarantees email is present in that case.
  return tx.paymentDonor.upsert({
    where: { email: email as string },
    update: {},
    create: { name, phone: null, email },
  });
}
