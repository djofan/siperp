import { AdminPageHeader } from "@/components/lazsip/admin/AdminPageHeader";
import { DonorTable } from "@/components/lazsip/admin/DonorTable";
import { listDonors } from "@/modules/lazsip/donors";

export default async function DonaturPage() {
  const donors = await listDonors();

  return (
    <div>
      <AdminPageHeader
        title="Kelola Donatur"
        description="Rekap otomatis dari transaksi yang berhasil lunas — dihitung langsung dari data transaksi, bukan tabel terpisah, supaya selalu akurat."
      />
      <DonorTable donors={donors} />
    </div>
  );
}
