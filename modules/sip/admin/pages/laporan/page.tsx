import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { LaporanManager } from "@/modules/sip/components/admin/LaporanManager";
import { listLaporan } from "@/modules/sip/api/laporan";

export default async function LaporanPage() {
  const laporan = await listLaporan();

  return (
    <div>
      <SipAdminPageHeader title="Laporan Bulanan & Tahunan" description="Kelola tautan atau file laporan keuangan yayasan." />
      <LaporanManager laporan={laporan} />
    </div>
  );
}
