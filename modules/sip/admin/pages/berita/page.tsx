import Link from "next/link";
import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { NewsTable } from "@/modules/sip/components/admin/NewsTable";
import { listNewsForAdmin } from "@/modules/sip/api/news";

export default async function BeritaListPage() {
  const news = await listNewsForAdmin();

  return (
    <div>
      <SipAdminPageHeader
        title="Berita"
        description="Berita & kajian yang tampil di beranda dan halaman Berita."
        action={
          <Link
            href="/admin/sip/berita/baru"
            className="inline-flex items-center gap-2 rounded-full bg-sip-lime px-4 py-2.5 text-sm font-semibold text-sip-ink transition-colors hover:bg-sip-lime-hover"
          >
            + Tambah Berita
          </Link>
        }
      />
      <NewsTable news={news} />
    </div>
  );
}
