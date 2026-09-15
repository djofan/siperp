import { notFound } from "next/navigation";
import { BackLink } from "@/components/lazsip/ui/BackLink";
import { NewsForm } from "@/components/lazsip/admin/NewsForm";
import { getNewsById } from "@/modules/lazsip/news";

export default async function EditBeritaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const news = await getNewsById(id);

  if (!news) {
    notFound();
  }

  return (
    <div>
      <BackLink href="/admin/lazsip/berita">Semua Berita</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900">Edit Berita</h2>
      <NewsForm
        newsId={news.id}
        initialValues={{
          title: news.title,
          content: news.content,
          image: news.image ?? "",
          isPinned: news.isPinned,
          status: news.status,
        }}
      />
    </div>
  );
}
