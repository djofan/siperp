import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { DonorTable } from "@/modules/lazsip/components/admin/DonorTable";
import { listDonors } from "@/modules/lazsip/api/donors";

export default async function DonaturZakatPage() {
  const donors = (await listDonors()).filter((d) => d.types.includes("zakat"));

  return (
    <div>
      <AdminPageHeader
        title="Donatur Zakat"
        description="Rekap muzakki (donatur zakat maal & fitrah) — dihitung dari transaksi yang berhasil lunas."
      />
      <DonorTable donors={donors} showSegmentFilter={false} />
    </div>
  );
}
