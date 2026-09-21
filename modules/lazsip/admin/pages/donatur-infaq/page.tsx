import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { DonorTable } from "@/modules/lazsip/components/admin/DonorTable";
import { listDonors } from "@/modules/lazsip/api/donors";

export default async function DonaturInfaqPage() {
  const donors = (await listDonors()).filter((d) => d.types.includes("infaq"));

  return (
    <div>
      <AdminPageHeader
        title="Donatur Infaq"
        description="Rekap donatur infaq/donasi campaign — dihitung dari transaksi yang berhasil lunas."
      />
      <DonorTable donors={donors} showSegmentFilter={false} />
    </div>
  );
}
