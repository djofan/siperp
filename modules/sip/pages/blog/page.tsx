import { listPublishedBlog } from "@/modules/sip/api/blog";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { BlogCard } from "@/modules/sip/components/BlogCard";

export default async function BlogListPage() {
  const blog = await listPublishedBlog();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <SectionHeading eyebrow="Blog" title="Artikel & Kajian" description="Konten umum lintas-yayasan dari tim SIP." />

      {blog.length === 0 ? (
        <p className="mt-10 text-sm text-sip-primary-800/60">Belum ada artikel.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {blog.map((item) => (
            <BlogCard key={item.id} id={item.id} title={item.title} content={item.content} image={item.image} createdAt={item.createdAt} />
          ))}
        </div>
      )}
    </div>
  );
}
