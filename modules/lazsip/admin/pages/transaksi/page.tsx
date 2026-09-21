import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { TransactionTable, type TransactionRow } from "@/modules/lazsip/components/admin/TransactionTable";
import { listDonationsForAdmin } from "@/modules/lazsip/api/donations";

export default async function TransaksiDonasiPage() {
  const donations = await listDonationsForAdmin();

  const rows: TransactionRow[] = donations
    .map((d) => ({
      id: d.id,
      type: "donasi" as const,
      label: `Donasi — ${d.campaign.title}`,
      donorName: d.donorName,
      amount: d.amount + d.adminFee,
      paymentMethod: d.paymentMethod,
      status: d.status,
      createdAt: d.createdAt,
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
