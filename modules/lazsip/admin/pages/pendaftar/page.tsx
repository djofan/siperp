import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { ApplicantTable } from "@/modules/lazsip/components/admin/ApplicantTable";
import { listApplicants } from "@/modules/lazsip/api/applicants";

export default async function PendaftarPage() {
  const applicants = await listApplicants();

  return (
    <div>
      <AdminPageHeader title="Kelola Pendaftar" description="Pendaftar Program Pemberdayaan LAZSIP." />
      <ApplicantTable applicants={applicants} />
    </div>
  );
}
