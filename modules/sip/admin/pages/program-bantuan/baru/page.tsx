import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { ProgramBantuanForm } from "@/modules/sip/components/admin/ProgramBantuanForm";

export default function ProgramBantuanCreatePage() {
  return (
    <div>
      <SipAdminPageHeader title="Tambah Program Bantuan" />
      <ProgramBantuanForm />
    </div>
  );
}
