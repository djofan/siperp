import { BackLink } from "@/modules/lazsip/components/ui/BackLink";
import { NewsForm } from "@/modules/lazsip/components/admin/NewsForm";

export default function TambahBeritaPage() {
  return (
    <div>
      <BackLink href="/admin/lazsip/berita">Semua Berita</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900 dark:text-white">Tambah Berita Baru</h2>
      <NewsForm />
    </div>
  );
}
