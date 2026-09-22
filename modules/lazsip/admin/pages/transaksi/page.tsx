import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { TransactionTable, type TransactionRow } from "@/modules/lazsip/components/admin/TransactionTable";
import { listDonationsForAdmin, listPaymentDonationsForAdmin } from "@/modules/lazsip/api/donations";
import { listZakatPaymentsForAdmin } from "@/modules/lazsip/api/zakat";

export default async function TransaksiPage() {
  const [legacyDonations, paymentDonations, zakatPayments] = await Promise.all([
    listDonationsForAdmin(),
    listPaymentDonationsForAdmin(),
    listZakatPaymentsForAdmin(),
  ]);

  const rows: TransactionRow[] = [
    ...legacyDonations.map((d) => ({
      source: "legacy-donation" as const,
      id: d.id,
      type: "donasi" as const,
      label: `Donasi — ${d.campaign.title}`,
      donorName: d.donorName,
      amount: d.amount + d.adminFee,
      paymentMethod: d.paymentMethod,
      status: d.status,
      createdAt: d.createdAt,
    })),
    ...paymentDonations.map((d) => ({
      source: "payment" as const,
      id: d.id,
      type: "donasi" as const,
      label: `Donasi — ${d.campaign.title}`,
      donorName: d.donorName,
      amount: d.amount + d.adminFee,
      paymentMethod: d.paymentMethod,
      status: d.status,
      createdAt: d.createdAt,
    })),
    ...zakatPayments.map((z) => ({
      source: "zakat" as const,
      id: z.id,
      type: "zakat" as const,
      label: z.zakatType === "fitrah" ? "Zakat Fitrah" : "Zakat Maal",
      donorName: z.donorName,
      amount: z.amount,
      paymentMethod: z.paymentMethod,
      status: z.status,
      createdAt: z.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div>
      <AdminPageHeader
        title="Transaksi Donasi"
        description="Transaksi donasi/infaq campaign — settle ke rekening donasi. Selama payment gateway belum terpasang, status lunas/gagal ditandai manual di sini."
      />
      <TransactionTable rows={rows} showTypeFilter={false} />
    </div>
  );
}
