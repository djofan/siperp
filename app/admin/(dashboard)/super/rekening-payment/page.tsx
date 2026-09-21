import { PageHeader } from "@/components/ui/PageHeader";
import { listDestinationAccounts } from "@/modules/payment/api/destinationAccounts";
import { DestinationAccountForm } from "@/modules/payment/components/admin/DestinationAccountForm";
import { DestinationAccountTable } from "@/modules/payment/components/admin/DestinationAccountTable";

export default async function RekeningPaymentPage() {
  const accounts = await listDestinationAccounts();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rekening Tujuan Pembayaran"
        description="Rekening penerima dana per modul & jenis dana (mis. LAZSIP-Zakat, LAZSIP-Infak) — dipakai modul Payment untuk menentukan ke mana transaksi mengalir."
      />
      <DestinationAccountForm />
      <DestinationAccountTable accounts={accounts} />
    </div>
  );
}
