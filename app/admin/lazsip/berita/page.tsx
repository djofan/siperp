import Link from "next/link";
import { AdminPageHeader } from "@/components/lazsip/admin/AdminPageHeader";
import { NewsTable } from "@/components/lazsip/admin/NewsTable";
import { listNewsForAdmin } from "@/modules/lazsip/news";

export default async function BeritaListPage() {
  const news = await listNewsForAdmin();

  return (
    <div>
      <AdminPageHeader
        title="Berita"
        description="Berita LAZSIP, pola pinned + grid di halaman publik."
        action={
          <Link
            href="/admin/lazsip/berita/baru"
            className="inline-flex items-center gap-2 rounded-full bg-lazsip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800"
          >
            + Tambah Berita Baru
          </Link>
        }
      />
      <NewsTable news={news} />
    </div>
  );
}
