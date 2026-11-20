import { notFound } from "next/navigation";
import { getArticle } from "@/modules/lazsip/api/articles";
import { ArticleForm } from "@/modules/lazsip/components/admin/ArticleForm";
import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticle(id, true);
  if (!article) notFound();
  return <div><BackLink href="/admin/lazsip/artikel">Semua Artikel</BackLink><AdminPageHeader title="Edit Artikel" description="Perubahan artikel terbit akan langsung tampil di website." /><ArticleForm article={article} /></div>;
}
