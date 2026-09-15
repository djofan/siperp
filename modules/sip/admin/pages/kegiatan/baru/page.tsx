import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { KegiatanForm } from "@/modules/sip/components/admin/KegiatanForm";

export default function KegiatanCreatePage() {
  return (
    <div>
      <SipAdminPageHeader title="Tambah Kegiatan" />
      <KegiatanForm />
    </div>
  );
}
