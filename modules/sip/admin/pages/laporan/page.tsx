import Link from "next/link";
import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { LaporanTable } from "@/modules/sip/components/admin/LaporanTable";
import { listLaporan } from "@/modules/sip/api/laporan";

export default async function LaporanListPage() {
  const laporan = await listLaporan();

  return (
    <div>
      <SipAdminPageHeader
        title="Laporan Bulanan & Tahunan"
        description="Kelola tautan atau file laporan keuangan yayasan."
        action={
          <Link
            href="/admin/sip/laporan/baru"
            className="inline-flex items-center gap-2 rounded-full bg-sip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sip-primary-800"
          >
            + Tambah Laporan
          </Link>
        }
      />
      <LaporanTable laporan={laporan} />
    </div>
  );
}
