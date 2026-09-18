import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Setup simulasi hanya boleh dijalankan di lingkungan pengembangan.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.lazsipPaymentFeeRef.upsert({
      where: { method: "Simulasi (tanpa pembayaran nyata)" },
      update: {},
      create: { method: "Simulasi (tanpa pembayaran nyata)", feeAmount: 0, feePercentage: 0 },
    });
    const destination = await tx.paymentDestinationAccount.findFirst({
      where: { moduleSource: "lazsip", fundType: "infak" },
    });
    if (!destination) {
      await tx.paymentDestinationAccount.create({
        data: {
          moduleSource: "lazsip", fundType: "infak", bankName: "SIMULASI",
          accountNumber: "0000000000", accountName: "Simulasi LAZSIP - bukan rekening nyata",
        },
      });
    }
  });
  console.log("Metode simulasi donasi siap (biaya Rp0). Rekening yang sudah ada tidak diubah.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
