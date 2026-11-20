import { ArticleForm } from "@/modules/lazsip/components/admin/ArticleForm";
import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";

export default function NewArticlePage() {
  return <div><BackLink href="/admin/lazsip/artikel">Semua Artikel</BackLink><AdminPageHeader title="Tambah Artikel" description="Simpan sebagai draft atau terbitkan langsung ke website." /><ArticleForm /></div>;
}
