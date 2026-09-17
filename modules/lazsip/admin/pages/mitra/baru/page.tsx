import { BackLink } from "@/modules/lazsip/components/ui/BackLink";
import { PartnerForm } from "@/modules/lazsip/components/admin/PartnerForm";

export default function TambahMitraPage() {
  return (
    <div>
      <BackLink href="/admin/lazsip/mitra">Semua Mitra</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900 dark:text-white">Tambah Mitra</h2>
      <PartnerForm />
    </div>
  );
}
