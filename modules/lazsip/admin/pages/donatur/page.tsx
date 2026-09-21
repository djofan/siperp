import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { DonorTable } from "@/modules/lazsip/components/admin/DonorTable";
import { listDonors } from "@/modules/lazsip/api/donors";

export default async function DonaturPage() {
  const donors = await listDonors();

  return (
    <div>
      <AdminPageHeader
        title="Semua Donatur"
        description="Gabungan donatur infaq/donasi dan muzakki zakat — dihitung otomatis dari transaksi yang berhasil lunas. Lihat menu Donatur Infaq / Donatur Zakat untuk rekap per segmen."
      />
      <DonorTable donors={donors} />
    </div>
  );
}
