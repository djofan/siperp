import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { LaporanForm } from "@/modules/sip/components/admin/LaporanForm";

export default function LaporanCreatePage() {
  return (
    <div>
      <SipAdminPageHeader title="Tambah Laporan" />
      <LaporanForm />
    </div>
  );
}
