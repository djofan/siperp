import Link from "next/link";
import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { BlogTable } from "@/modules/sip/components/admin/BlogTable";
import { listBlogForAdmin } from "@/modules/sip/api/blog";

export default async function BlogListPage() {
  const blog = await listBlogForAdmin();

  return (
    <div>
      <SipAdminPageHeader
        title="Blog"
        description="Blog SIP untuk konten umum lintas-yayasan — terpisah dari Berita LAZSIP."
        action={
          <Link
            href="/admin/sip/blog/baru"
            className="inline-flex items-center gap-2 rounded-full bg-sip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sip-primary-800"
          >
            + Tambah Artikel
          </Link>
        }
      />
      <BlogTable blog={blog} />
    </div>
  );
}
