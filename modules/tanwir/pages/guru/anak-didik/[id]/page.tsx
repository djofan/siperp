import { notFound } from "next/navigation";
import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { getStudent, type StudentScope, ownerOptions } from "@/modules/tanwir/api/students";
import { saveStudentAsGuruAction } from "@/modules/tanwir/api/actions/guru";
import { StudentForm } from "@/modules/tanwir/components/app/StudentForm";
import { Card, PageTitle } from "@/modules/tanwir/components/ui";

export const metadata = { title: "Ubah Anak Didik" };

export default async function GuruEditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireTanwirMember("guru");
  const { id } = await params;
  const scope: StudentScope = { kind: "guru", teacherId: viewer.member.id };
  const student = await getStudent(scope, id);
  if (!student) notFound();
  const owners = await ownerOptions(scope);
  return (
    <div className="max-w-2xl">
      <PageTitle title={student.name} description="Perbarui data dan progres belajar." />
      <Card>
        <StudentForm action={saveStudentAsGuruAction.bind(null, student.id)} initial={student} owners={owners} cancelHref="/tanwir/guru/anak-didik" />
      </Card>
    </div>
  );
}
