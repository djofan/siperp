import Link from "next/link";
import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { PenyaluranBantuanTable } from "@/modules/sip/components/admin/PenyaluranBantuanTable";
import { listPenyaluranBantuan } from "@/modules/sip/api/penyaluranBantuan";

export default async function PenyaluranBantuanListPage() {
  const items = await listPenyaluranBantuan();

  return (
    <div>
      <SipAdminPageHeader
        title="Penyaluran Bantuan"
        description="Dokumentasi realisasi penyaluran bantuan yang tampil di beranda."
        action={
          <Link
            href="/admin/sip/penyaluran-bantuan/baru"
            className="inline-flex items-center gap-2 rounded-full bg-sip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sip-primary-800"
          >
            + Tambah Penyaluran Bantuan
          </Link>
        }
      />
      <PenyaluranBantuanTable items={items} />
    </div>
  );
}
