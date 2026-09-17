import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { NewsForm } from "@/modules/sip/components/admin/NewsForm";

export default function BeritaCreatePage() {
  return (
    <div>
      <SipAdminPageHeader title="Tambah Berita" />
      <NewsForm />
    </div>
  );
}
