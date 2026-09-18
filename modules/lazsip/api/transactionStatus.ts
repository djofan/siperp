import { prisma } from "@/lib/prisma";

export interface TransactionStatusResult {
  found: boolean;
  code: string;
  type: "donasi" | "zakat";
  label: string;
  amount: number;
  adminFee: number;
  paymentMethod: string;
  status: string;
  createdAt: Date;
}

/**
 * Cek status transaksi publik lewat kode (= id Donation/ZakatPayment). Ini bukan data
 * sensitif — siapa pun yang tahu kode ini memang pemilik transaksinya (analog resi belanja).
 */
export async function getTransactionStatus(code: string): Promise<TransactionStatusResult | null> {
  const payment = await prisma.paymentTransaction.findFirst({
    where: { id: code, moduleSource: "lazsip", sourceType: "campaign" },
    select: { id: true, sourceId: true, amount: true, adminFee: true, paymentMethod: true, status: true, createdAt: true },
  });
  if (payment) {
    const campaign = await prisma.lazsipCampaign.findUnique({ where: { id: payment.sourceId }, select: { title: true } });
    return {
      found: true, code: payment.id, type: "donasi", label: campaign?.title ?? "Donasi",
      amount: payment.amount, adminFee: payment.adminFee, paymentMethod: payment.paymentMethod,
      status: payment.status, createdAt: payment.createdAt,
    };
  }
  const donation = await prisma.lazsipDonation.findUnique({
    where: { id: code },
    include: { campaign: { select: { title: true } } },
  });

  if (donation) {
    return {
      found: true,
      code: donation.id,
      type: "donasi",
      label: donation.campaign.title,
      amount: donation.amount,
      adminFee: donation.adminFee,
      paymentMethod: donation.paymentMethod,
      status: donation.status,
      createdAt: donation.createdAt,
    };
  }

  const zakat = await prisma.lazsipZakatPayment.findUnique({ where: { id: code } });
  if (zakat) {
    return {
      found: true,
      code: zakat.id,
      type: "zakat",
      label: zakat.zakatType === "fitrah" ? "Zakat Fitrah" : "Zakat Maal",
      amount: zakat.amount,
      adminFee: 0,
      paymentMethod: zakat.paymentMethod,
      status: zakat.status,
      createdAt: zakat.createdAt,
    };
  }

  return null;
}
