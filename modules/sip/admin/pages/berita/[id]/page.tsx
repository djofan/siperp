import { notFound } from "next/navigation";
import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { NewsForm } from "@/modules/sip/components/admin/NewsForm";
import { getNewsById } from "@/modules/sip/api/news";

export default async function BeritaEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const news = await getNewsById(id);
  if (!news) notFound();

  return (
    <div>
      <SipAdminPageHeader title="Edit Berita" />
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
