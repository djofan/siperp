import { prisma } from "@/lib/prisma";

export async function seedSarsipModuleRegistration() {
  await prisma.module.upsert({
    where: { slug: "sarsip" }, update: {},
    create: { slug: "sarsip", name: "SARSIP", description: "Tim SAR Solidaritas Insan Peduli", isActive: true },
  });
  await prisma.sarsipProfile.upsert({
    where: { id: "main" }, update: {},
    create: {
      id: "main", headline: "Bersama hadir, saat bantuan dibutuhkan.",
      description: "SARSIP adalah tim SAR Solidaritas Insan Peduli. Melalui kegiatan pencarian, pertolongan, dan bantuan kemanusiaan, kami mengajak masyarakat mendukung sesama yang membutuhkan.",
    },
  });
}

/** Explicit local simulation setup, not a real bank account or gateway. */
export async function seedSarsipSimulation() {
  if (process.env.NODE_ENV === "production") throw new Error("Setup simulasi hanya untuk lingkungan pengembangan.");
  await seedSarsipModuleRegistration();
  await prisma.sarsipPaymentMethod.upsert({
    where: { method: "Simulasi (tanpa pembayaran nyata)" }, update: {},
    create: { method: "Simulasi (tanpa pembayaran nyata)", feeAmount: 0, feePercentage: 0 },
  });
  if (!await prisma.paymentDestinationAccount.findFirst({ where: { moduleSource: "sarsip", fundType: "donasi" } })) {
    await prisma.paymentDestinationAccount.create({
      data: { moduleSource: "sarsip", fundType: "donasi", bankName: "SIMULASI", accountNumber: "0000000000", accountName: "Simulasi SARSIP - bukan rekening nyata" },
    });
  }
}

