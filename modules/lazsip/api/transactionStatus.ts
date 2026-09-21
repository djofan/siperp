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
 * Cek status transaksi publik lewat kode pelacakan (mis. "LZS-7F3K2Q"). Ini bukan data
 * sensitif — siapa pun yang tahu kode ini memang pemilik transaksinya (analog resi belanja).
 * Fallback ke id mentah untuk transaksi lama (LazsipDonation/LazsipZakatPayment) yang dibuat
 * sebelum kode pelacakan ada — kode lama yang sudah ditampilkan ke donatur tetap harus jalan.
 */
export async function getTransactionStatus(code: string): Promise<TransactionStatusResult | null> {
  const payment = await prisma.paymentTransaction.findFirst({
    where: { trackingCode: code, moduleSource: "lazsip" },
    select: { trackingCode: true, sourceType: true, sourceId: true, amount: true, adminFee: true, paymentMethod: true, status: true, createdAt: true },
  });
  if (payment && payment.sourceType === "campaign") {
    const campaign = await prisma.lazsipCampaign.findUnique({ where: { id: payment.sourceId }, select: { title: true } });
    return {
      found: true, code: payment.trackingCode, type: "donasi", label: campaign?.title ?? "Donasi",
      amount: payment.amount, adminFee: payment.adminFee, paymentMethod: payment.paymentMethod,
      status: payment.status, createdAt: payment.createdAt,
    };
  }
  if (payment && payment.sourceType === "zakat") {
    const detail = await prisma.lazsipZakatDetail.findUnique({ where: { id: payment.sourceId }, select: { zakatType: true } });
    return {
      found: true, code: payment.trackingCode, type: "zakat", label: detail?.zakatType === "fitrah" ? "Zakat Fitrah" : "Zakat Maal",
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
