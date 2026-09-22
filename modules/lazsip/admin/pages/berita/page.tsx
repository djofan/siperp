import Link from "next/link";
import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { NewsTable } from "@/modules/lazsip/components/admin/NewsTable";
import { listNewsForAdmin } from "@/modules/lazsip/api/news";

export default async function BeritaListPage() {
  const news = await listNewsForAdmin();

  return (
    <div>
      <AdminPageHeader
        title="Berita"
        description="Kelola berita, status publish/draft, dan pin di beranda."
        action={
          <Link
            href="/admin/lazsip/berita/baru"
            className="inline-flex items-center gap-2 rounded-full bg-lazsip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 dark:bg-lazsip-primary-700 dark:hover:bg-lazsip-primary-600"
          >
            + Tambah Berita
          </Link>
        }
      />
      <NewsTable news={news} />
    </div>
  );
}
