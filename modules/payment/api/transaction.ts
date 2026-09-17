import { prisma } from "@/lib/prisma";
import { notifySourceModule } from "@/modules/payment/api/registry";

async function resolveDestinationAccount(moduleSource: string, fundType: string) {
  const account = await prisma.paymentDestinationAccount.findFirst({
    where: { moduleSource, fundType },
  });
  if (!account) {
    throw new Error(
      `Rekening tujuan belum terdaftar untuk moduleSource="${moduleSource}" fundType="${fundType}"`
    );
  }
  return account;
}

export async function createTransaction(input: {
  moduleSource: string;
  sourceType: string;
  sourceId: string;
  fundType: string;
  donorName: string;
  isAnonymous?: boolean;
  amount: number;
  paymentMethod: string;
}) {
  const destination = await resolveDestinationAccount(input.moduleSource, input.fundType);

  return prisma.paymentTransaction.create({
    data: {
      moduleSource: input.moduleSource,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      fundType: input.fundType,
      donorName: input.donorName,
      isAnonymous: input.isAnonymous ?? false,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      destinationAccountId: destination.id,
    },
  });
}

export async function getTransactionStatus(id: string) {
  return prisma.paymentTransaction.findUnique({ where: { id } });
}

export async function markAsPaid(midtransOrderId: string) {
  const trx = await prisma.paymentTransaction.update({
    where: { midtransOrderId },
    data: { status: "paid", paidAt: new Date() },
  });
  await notifySourceModule(trx);
  return trx;
}