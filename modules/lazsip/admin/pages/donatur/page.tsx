import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { DonorTable } from "@/modules/lazsip/components/admin/DonorTable";
import { listDonors } from "@/modules/lazsip/api/donors";

export default async function DonaturPage() {
  const donors = await listDonors();

  return (
    <div>
      <AdminPageHeader
        title="Kelola Donatur"
        description="Identitas donatur untuk pendataan admin. Satu nomor WhatsApp menggunakan data donatur yang sama; total kontribusi dihitung dari transaksi lunas, tanpa biaya admin."
      />
      <DonorTable donors={donors} />
    </div>
  );
}
