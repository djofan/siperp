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
        description="Alamat, tanggal lahir, dan status pernikahan cuma tampil di sini — tidak pernah ke halaman publik."
        action={
          <Link
            href="/admin/lazsip/penyaluran-bantuan/baru"
            className="inline-flex items-center gap-2 rounded-full bg-lazsip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800"
          >
            + Tambah Data
          </Link>
        }
      />
      <BeneficiaryTable beneficiaries={beneficiaries} />
    </div>
  );
}
