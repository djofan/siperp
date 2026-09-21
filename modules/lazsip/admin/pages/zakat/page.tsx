import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { TransactionTable, type TransactionRow } from "@/modules/lazsip/components/admin/TransactionTable";
import { listZakatPaymentsForAdmin, listPaymentZakatForAdmin } from "@/modules/lazsip/api/zakat";

export default async function TransaksiZakatPage() {
  const [legacyZakat, paymentZakat] = await Promise.all([listZakatPaymentsForAdmin(), listPaymentZakatForAdmin()]);

  const rows: TransactionRow[] = [
    ...legacyZakat.map((z) => ({
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
    ...paymentZakat.map((z) => ({
      source: "payment" as const,
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
        title="Transaksi Zakat"
        description="Transaksi zakat maal & fitrah — settle ke rekening zakat terpisah dari donasi/infaq. Status lunas/gagal ditandai manual di sini."
      />
      <TransactionTable rows={rows} showTypeFilter={false} />
    </div>
  );
}
