import { BackLink } from "@/components/lazsip/ui/BackLink";
import { BeneficiaryForm } from "@/components/lazsip/admin/BeneficiaryForm";

export default function TambahBeneficiaryPage() {
  return (
    <div>
      <BackLink href="/admin/lazsip/penyaluran-bantuan">Semua Penerima Manfaat</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900">Tambah Penerima Manfaat</h2>
      <BeneficiaryForm />
    </div>
  );
}
