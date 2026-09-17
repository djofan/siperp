import { prisma } from "@/lib/prisma";

export async function seedPaymentModuleRegistration() {
  await prisma.paymentDestinationAccount.createMany({
    data: [
      { moduleSource: "lazsip", fundType: "infak", bankName: "BSI", accountNumber: "0000000001", accountName: "LAZSIP Infak" },
      { moduleSource: "lazsip", fundType: "zakat", bankName: "BSI", accountNumber: "0000000002", accountName: "LAZSIP Zakat" },
      { moduleSource: "sarsip", fundType: "donasi", bankName: "BSI", accountNumber: "0000000003", accountName: "SARSIP Donasi" },
    ],
    skipDuplicates: true,
  });
}