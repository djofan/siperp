import { notFound } from "next/navigation";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";
import { BeneficiaryForm } from "@/modules/lazsip/components/admin/BeneficiaryForm";
import { getBeneficiaryForAdmin } from "@/modules/lazsip/api/beneficiaries";

export default async function EditBeneficiaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const beneficiary = await getBeneficiaryForAdmin(id);

  if (!beneficiary) {
    notFound();
  }

  return (
    <div>
      <BackLink href="/admin/lazsip/penyaluran-bantuan">Semua Penerima Manfaat</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900 dark:text-white">Edit Penerima Manfaat</h2>
      <BeneficiaryForm
        beneficiaryId={beneficiary.id}
        initialValues={{
          name: beneficiary.name,
          address: beneficiary.address,
          problemFaced: beneficiary.problemFaced,
          birthDate: beneficiary.birthDate.toISOString().slice(0, 10),
          gender: beneficiary.gender,
          referralSource: beneficiary.referralSource,
          photo: beneficiary.photo ?? "",
          needs: beneficiary.needs,
          aidType: beneficiary.aidType,
          amountReceived: String(beneficiary.amountReceived),
          verifierName: beneficiary.verifierName,
          verifierArea: beneficiary.verifierArea,
          maritalStatus: beneficiary.maritalStatus,
          nik: beneficiary.nik ?? "",
          occupation: beneficiary.occupation ?? "",
          monthlyIncome: beneficiary.monthlyIncome !== null ? String(beneficiary.monthlyIncome) : "",
          dependentsCount: beneficiary.dependentsCount !== null ? String(beneficiary.dependentsCount) : "",
          dependentsDetail: beneficiary.dependentsDetail ?? "",
          isPinned: beneficiary.isPinned,
        }}
      />
    </div>
  );
}
