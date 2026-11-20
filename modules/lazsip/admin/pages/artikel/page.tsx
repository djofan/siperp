import Link from "next/link";
import { listArticles } from "@/modules/lazsip/api/articles";
import { ArticleList } from "@/modules/lazsip/components/admin/ArticleList";
import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";

export default async function ArticlesAdminPage() {
  const articles = await listArticles(true);
  return <div><AdminPageHeader title="Artikel & Panduan" description="Kelola bacaan fiqih zakat, qurban, infak, dan sedekah." action={<Link href="/admin/lazsip/artikel/baru" className="rounded-full bg-lazsip-primary-900 px-5 py-3 text-sm font-semibold text-white">+ Tambah Artikel</Link>} /><ArticleList articles={articles} /></div>;
}
