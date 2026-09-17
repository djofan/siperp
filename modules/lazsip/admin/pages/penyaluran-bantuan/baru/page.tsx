import { BackLink } from "@/modules/lazsip/components/ui/BackLink";
import { BeneficiaryForm } from "@/modules/lazsip/components/admin/BeneficiaryForm";

export default function TambahBeneficiaryPage() {
  return (
    <div>
      <BackLink href="/admin/lazsip/penyaluran-bantuan">Semua Penerima Manfaat</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900 dark:text-white">Tambah Penerima Manfaat</h2>
      <BeneficiaryForm />
    </div>
  );
}
