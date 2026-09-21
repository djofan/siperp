import { prisma } from "@/lib/prisma";
import { notifySourceModule } from "@/modules/payment/api/registry";
import { sendTrackingCodeEmail } from "@/modules/payment/api/email";
import type { Prisma } from "@/generated/prisma/client";

// Tanpa 0/O/1/I biar gak ketuker pas donatur baca/ketik ulang kodenya.
const TRACKING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TRACKING_PREFIX: Record<string, string> = { lazsip: "LZS", sarsip: "SRS" };

function generateTrackingCode(moduleSource: string): string {
  const prefix = TRACKING_PREFIX[moduleSource] ?? "TRX";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += TRACKING_CODE_ALPHABET[Math.floor(Math.random() * TRACKING_CODE_ALPHABET.length)];
  }
  return `${prefix}-${code}`;
}

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

const DUPLICATE_WINDOW_MS = 5_000;

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

  // Guard against accidental double-submit (double click, client retry, flaky network):
  // reuse a still-pending checkout from the same donor for the same amount/method made
  // moments ago instead of creating a duplicate transaction. Source-specific fields
  // (sourceId) are deliberately excluded — some sources (e.g. zakat) mint a fresh sourceId
  // per attempt, so matching on it would defeat the guard.
  const recent = await tx.paymentTransaction.findFirst({
    where: {
      donorId: input.donorId,
      moduleSource: input.moduleSource,
      fundType: input.fundType,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      status: "pending",
      createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return recent;

  let transaction;
  for (let attempt = 0; ; attempt++) {
    try {
      transaction = await tx.paymentTransaction.create({
        data: {
          trackingCode: generateTrackingCode(input.moduleSource),
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
        include: { donor: { select: { email: true } } },
      });
      break;
    } catch (error) {
      // Extremely unlikely tracking-code collision — regenerate and retry a few times.
      if (attempt < 4 && error && typeof error === "object" && "code" in error && error.code === "P2002") continue;
      throw error;
    }
  }

  // Kode pelacakan selalu tampil di layar (dipanggil di UI dari nilai balik fungsi ini),
  // email cuma pengiriman tambahan — kalau gagal, jangan gagalkan seluruh checkout.
  if (transaction.donor.email) {
    void sendTrackingCodeEmail(transaction.donor.email, transaction.trackingCode, transaction.amount + transaction.adminFee)
      .catch((error) => console.error("Gagal mengirim email kode pelacakan", error));
  }

  return transaction;
}

export async function getTransactionStatus(id: string) {
  // Public response: tracking and status only; no donor identity or bank details.
  return prisma.paymentTransaction.findUnique({
    where: { id },
    select: {
      id: true, trackingCode: true, moduleSource: true, amount: true, adminFee: true, paymentMethod: true, status: true, createdAt: true, paidAt: true,
    },
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

export async function markAsFailed(midtransOrderId: string) {
  return finalizeTransaction({ midtransOrderId }, "failed");
}

export async function setStatusById(id: string, status: "paid" | "failed") {
  return finalizeTransaction({ id }, status);
}
