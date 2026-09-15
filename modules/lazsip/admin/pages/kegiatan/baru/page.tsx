import { BackLink } from "@/modules/lazsip/components/ui/BackLink";
import { ActivityForm } from "@/modules/lazsip/components/admin/ActivityForm";

export default function TambahKegiatanPage() {
  return (
    <div>
      <BackLink href="/admin/lazsip/kegiatan">Semua Kegiatan</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900">Tambah Kegiatan</h2>
      <ActivityForm />
    </div>
  );
}
