import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { MitraManager } from "@/modules/sip/components/admin/MitraManager";
import { listMitra } from "@/modules/sip/api/mitra";

export default async function MitraPage() {
  const mitra = await listMitra();

  return (
    <div>
      <SipAdminPageHeader title="Mitra" description="Logo mitra/pendukung yang tampil di beranda." />
      <MitraManager mitra={mitra} />
    </div>
  );
}
