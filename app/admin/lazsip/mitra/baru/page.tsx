import { BackLink } from "@/components/lazsip/ui/BackLink";
import { PartnerForm } from "@/components/lazsip/admin/PartnerForm";

export default function TambahMitraPage() {
  return (
    <div>
      <BackLink href="/admin/lazsip/mitra">Semua Mitra</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900">Tambah Mitra</h2>
      <PartnerForm />
    </div>
  );
}
