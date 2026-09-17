import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { PenyaluranBantuanForm } from "@/modules/sip/components/admin/PenyaluranBantuanForm";

export default function PenyaluranBantuanCreatePage() {
  return (
    <div>
      <SipAdminPageHeader title="Tambah Penyaluran Bantuan" />
      <PenyaluranBantuanForm />
    </div>
  );
}
