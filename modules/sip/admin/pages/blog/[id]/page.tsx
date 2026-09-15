import { notFound } from "next/navigation";
import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { BlogForm } from "@/modules/sip/components/admin/BlogForm";
import { getBlogById } from "@/modules/sip/api/blog";

export default async function BlogEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const blog = await getBlogById(id);
  if (!blog) notFound();

  return (
    <div>
      <SipAdminPageHeader title="Edit Artikel Blog" />
      <BlogForm
        blogId={blog.id}
        initialValues={{
          title: blog.title,
          content: blog.content,
          image: blog.image ?? "",
          isPinned: blog.isPinned,
          status: blog.status,
        }}
      />
    </div>
  );
}
