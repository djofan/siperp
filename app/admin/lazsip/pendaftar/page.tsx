import { AdminPageHeader } from "@/components/lazsip/admin/AdminPageHeader";
import { ApplicantTable } from "@/components/lazsip/admin/ApplicantTable";
import { listApplicants } from "@/modules/lazsip/applicants";

export default async function PendaftarPage() {
  const applicants = await listApplicants();

  return (
    <div>
      <AdminPageHeader title="Kelola Pendaftar" description="Pendaftar Program Pemberdayaan LAZSIP." />
      <ApplicantTable applicants={applicants} />
    </div>
  );
}
