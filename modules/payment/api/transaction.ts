import { prisma } from "@/lib/prisma";
import { notifySourceModule } from "@/modules/payment/api/registry";
import type { Prisma } from "@/generated/prisma/client";

async function resolveDestinationAccount(moduleSource: string, fundType: string, tx: Prisma.TransactionClient) {
  const account = await tx.paymentDestinationAccount.findFirst({
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
  donorId: string;
  isAnonymous?: boolean;
  amount: number;
  adminFee?: number;
  paymentMethod: string;
}, tx: Prisma.TransactionClient = prisma) {
  const destination = await resolveDestinationAccount(input.moduleSource, input.fundType, tx);

  return tx.paymentTransaction.create({
    data: {
      moduleSource: input.moduleSource,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      fundType: input.fundType,
      donorId: input.donorId,
      isAnonymous: input.isAnonymous ?? false,
      amount: input.amount,
      adminFee: input.adminFee ?? 0,
      paymentMethod: input.paymentMethod,
      destinationAccountId: destination.id,
    },
  });
}

export async function getTransactionStatus(id: string) {
  return prisma.paymentTransaction.findUnique({
    where: { id },
    // Public response: no donor identity or destination details.
    select: { id: true, moduleSource: true, amount: true, adminFee: true, paymentMethod: true, status: true, createdAt: true, paidAt: true },
  });
}

export async function listTransactionsBySource(moduleSource: string) {
  return prisma.paymentTransaction.findMany({
    where: { moduleSource },
    include: { donor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Satu-satunya jalan status transaksi berubah — dipanggil dari webhook gateway asli
 * (markAsPaid) atau aksi manual admin (setStatusById). Idempotent: status yang sudah
 * final (bukan "pending") tidak diproses ulang, mencegah currentAmount dobel tertambah.
 */
async function finalizeTransaction(
  where: { id: string } | { midtransOrderId: string },
  status: "paid" | "failed"
) {
  const result = await prisma.$transaction(async (tx) => {
    const changed = await tx.paymentTransaction.updateMany({
      where: { ...where, status: "pending" },
      data: { status, paidAt: status === "paid" ? new Date() : null },
    });
    return {
      transaction: await tx.paymentTransaction.findUniqueOrThrow({ where }),
      changed: changed.count === 1,
    };
  });
  if (result.changed && result.transaction.status === "paid") {
    await notifySourceModule(result.transaction);
  }
  return result.transaction;
}

export async function markAsPaid(midtransOrderId: string) {
  return finalizeTransaction({ midtransOrderId }, "paid");
}

export async function setStatusById(id: string, status: "paid" | "failed") {
  return finalizeTransaction({ id }, status);
}
