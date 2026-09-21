import { prisma } from "@/lib/prisma";

export async function listDestinationAccounts() {
  return prisma.paymentDestinationAccount.findMany({
    orderBy: [{ moduleSource: "asc" }, { fundType: "asc" }],
  });
}

interface DestinationAccountInput {
  moduleSource: string;
  fundType: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export async function createDestinationAccount(input: DestinationAccountInput) {
  return prisma.paymentDestinationAccount.create({ data: input });
}

export async function deleteDestinationAccount(id: string) {
  const inUse = await prisma.paymentTransaction.findFirst({ where: { destinationAccountId: id } });
  if (inUse) {
    throw new Error("Rekening ini sudah dipakai transaksi — tidak bisa dihapus, cuma bisa ditambah rekening baru.");
  }
  await prisma.paymentDestinationAccount.delete({ where: { id } });
}
