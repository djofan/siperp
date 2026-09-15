import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { BlogForm } from "@/modules/sip/components/admin/BlogForm";

export default function BlogCreatePage() {
  return (
    <div>
      <SipAdminPageHeader title="Tambah Artikel Blog" />
      <BlogForm />
    </div>
  );
}
