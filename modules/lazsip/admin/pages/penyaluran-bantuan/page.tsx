import Link from "next/link";
import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { BeneficiaryTable } from "@/modules/lazsip/components/admin/BeneficiaryTable";
import { listBeneficiariesForAdmin } from "@/modules/lazsip/api/beneficiaries";

export default async function PenyaluranBantuanListPage() {
  const beneficiaries = await listBeneficiariesForAdmin();

  return (
    <div>
      <AdminPageHeader
        title="Penyaluran Bantuan"
        description="Data penerima manfaat LAZSIP. Informasi sensitif (alamat, tanggal lahir, status pernikahan) hanya tampil di admin."
        action={
          <Link
            href="/admin/lazsip/penyaluran-bantuan/baru"
            className="inline-flex items-center gap-2 rounded-full bg-lazsip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 dark:bg-lazsip-primary-700 dark:hover:bg-lazsip-primary-600"
          >
            + Tambah Penerima Manfaat
          </Link>
        }
      />
      <BeneficiaryTable beneficiaries={beneficiaries} />
    </div>
  );
}
