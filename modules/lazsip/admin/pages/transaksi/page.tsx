import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { TransactionTable, type TransactionRow } from "@/modules/lazsip/components/admin/TransactionTable";
import { listDonationsForAdmin } from "@/modules/lazsip/api/donations";
import { listZakatPaymentsForAdmin } from "@/modules/lazsip/api/zakat";

export default async function TransaksiPage() {
  const [donations, zakatPayments] = await Promise.all([listDonationsForAdmin(), listZakatPaymentsForAdmin()]);

  const rows: TransactionRow[] = [
    ...donations.map((d) => ({
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
      id: z.id,
      type: "zakat" as const,
      label: "Zakat",
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
        title="Kelola Transaksi"
        description="Selama payment gateway belum terpasang, status lunas/gagal ditandai manual di sini — tidak pernah otomatis dari halaman redirect donatur."
      />
      <TransactionTable rows={rows} />
    </div>
  );
}
