import { prisma } from "@/lib/prisma";
import { syncMidtrans } from "@/modules/payment/api/syncMidtrans";

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
  // Cuma terisi untuk transaksi PaymentTransaction (gateway) yang masih `pending` — dipakai
  // publik buat tombol "Lanjutkan Pembayaran" balik ke halaman checkout (liat lagi VA/QRIS),
  // BUKAN identitas donatur, jadi aman diekspos (halaman checkout sendiri publik tanpa login).
  checkoutId?: string;
  gateway?: string;
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
    select: { id: true, trackingCode: true, sourceType: true, sourceId: true, amount: true, adminFee: true, paymentMethod: true, status: true, createdAt: true, gateway: true, midtransOrderId: true },
  });

  // Donatur cek status di sini SEBELUM webhook/klik "Cek status ke Midtrans" manual sempat
  // jalan — kalau dibiarkan, layar bakal nunjukkin "pending" basi padahal Midtrans udah
  // settlement. Tarik status terbaru dulu di sini biar donatur gak salah paham "kok belum
  // kebaca padahal udah bayar". Gagal narik (mis. Midtrans lagi down) jangan gagalkan cek
  // status — tetap tampilkan status lokal yang ada.
  if (payment && payment.status === "pending" && payment.gateway === "midtrans_sandbox" && payment.midtransOrderId) {
    try {
      await syncMidtrans(payment.midtransOrderId);
      const refreshed = await prisma.paymentTransaction.findUnique({ where: { id: payment.id }, select: { status: true } });
      if (refreshed) payment.status = refreshed.status;
    } catch {
      // biarkan payment.status apa adanya
    }
  }

  if (payment && payment.sourceType === "campaign") {
    const campaign = await prisma.lazsipCampaign.findUnique({ where: { id: payment.sourceId }, select: { title: true } });
    return {
      found: true, code: payment.trackingCode, type: "donasi", label: campaign?.title ?? "Donasi",
      amount: payment.amount, adminFee: payment.adminFee, paymentMethod: payment.paymentMethod,
      status: payment.status, createdAt: payment.createdAt,
      ...(payment.status === "pending" ? { checkoutId: payment.id, gateway: payment.gateway } : {}),
    };
  }
  if (payment && payment.sourceType === "zakat") {
    const detail = await prisma.lazsipZakatDetail.findUnique({ where: { id: payment.sourceId }, select: { zakatType: true } });
    return {
      found: true, code: payment.trackingCode, type: "zakat", label: detail?.zakatType === "fitrah" ? "Zakat Fitrah" : "Zakat Maal",
      amount: payment.amount, adminFee: payment.adminFee, paymentMethod: payment.paymentMethod,
      status: payment.status, createdAt: payment.createdAt,
      ...(payment.status === "pending" ? { checkoutId: payment.id, gateway: payment.gateway } : {}),
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
