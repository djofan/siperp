import Link from "next/link";
import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { KegiatanTable } from "@/modules/sip/components/admin/KegiatanTable";
import { listKegiatan } from "@/modules/sip/api/kegiatan";

export default async function KegiatanListPage() {
  const kegiatan = await listKegiatan();

  return (
    <div>
      <SipAdminPageHeader
        title="Kegiatan Terkini"
        description="Berita kegiatan terbaru yang tampil di beranda."
        action={
          <Link
            href="/admin/sip/kegiatan/baru"
            className="inline-flex items-center gap-2 rounded-full bg-sip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sip-primary-800"
          >
            + Tambah Kegiatan
          </Link>
        }
      />
      <KegiatanTable kegiatan={kegiatan} />
    </div>
  );
}
