import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { type StudentScope, ownerOptions } from "@/modules/tanwir/api/students";
import { saveStudentAsGuruAction } from "@/modules/tanwir/api/actions/guru";
import { StudentForm } from "@/modules/tanwir/components/app/StudentForm";
import { Card, PageTitle } from "@/modules/tanwir/components/ui";

export const metadata = { title: "Tambah Anak Didik" };

export default async function GuruNewStudentPage() {
  const viewer = await requireTanwirMember("guru");
  const scope: StudentScope = { kind: "guru", teacherId: viewer.member.id };
  const owners = await ownerOptions(scope);
  return (
    <div className="max-w-2xl">
      <PageTitle title="Tambah anak didik" />
      <Card>
        <StudentForm action={saveStudentAsGuruAction.bind(null, null)} owners={owners} cancelHref="/tanwir/guru/anak-didik" />
      </Card>
    </div>
  );
}
