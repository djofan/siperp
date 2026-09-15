import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { PengurusManager } from "@/modules/sip/components/admin/PengurusManager";
import { listPengurus } from "@/modules/sip/api/pengurus";

export default async function PengurusPage() {
  const pengurus = await listPengurus();

  return (
    <div>
      <SipAdminPageHeader title="Struktur Pengurus" description="Susunan pengurus yayasan yang tampil di halaman Profil." />
      <PengurusManager pengurus={pengurus} />
    </div>
  );
}
