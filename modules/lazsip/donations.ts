import { prisma } from "@/lib/prisma";
import { getPaymentFeeRef, calculateFee } from "@/modules/lazsip/paymentFees";

export async function listDonationsForAdmin() {
  return prisma.lazsipDonation.findMany({
    orderBy: { createdAt: "desc" },
    include: { campaign: { select: { title: true, uniqueCode: true } } },
  });
}

interface CreateDonationInput {
  campaignId: string;
  donorName: string;
  amount: number;
  coversFee: boolean;
  isAnonymous: boolean;
  paymentMethod: string;
}

export async function createDonation(input: CreateDonationInput) {
  const feeRef = await getPaymentFeeRef(input.paymentMethod);
  const adminFee = input.coversFee ? calculateFee(feeRef, input.amount) : 0;

  return prisma.lazsipDonation.create({
    data: {
      campaignId: input.campaignId,
      donorName: input.donorName,
      amount: input.amount,
      adminFee,
      coversFee: input.coversFee,
      isAnonymous: input.isAnonymous,
      paymentMethod: input.paymentMethod,
      status: "pending",
    },
  });
}

/**
 * Satu-satunya jalan status donasi berubah jadi paid/failed — dipanggil dari webhook payment
 * gateway asli (nanti) atau endpoint simulasi admin (sekarang). TIDAK BOLEH dipanggil dari
 * halaman redirect sukses di sisi client. Lihat CLAUDE.md §7 aturan #1.
 */
export async function setDonationStatus(id: string, status: "paid" | "failed") {
  await prisma.$transaction(async (tx) => {
    const donation = await tx.lazsipDonation.findUniqueOrThrow({ where: { id } });

    if (donation.status !== "pending") {
      // Sudah final sebelumnya — jangan diproses ulang (mencegah currentAmount dobel tertambah).
      return;
    }

    await tx.lazsipDonation.update({ where: { id }, data: { status } });

    if (status === "paid") {
      await tx.lazsipCampaign.update({
        where: { id: donation.campaignId },
        data: { currentAmount: { increment: donation.amount } },
      });
    }
  });
}
