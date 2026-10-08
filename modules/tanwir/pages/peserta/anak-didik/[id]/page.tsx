import { notFound } from "next/navigation";
import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { getStudent, type StudentScope } from "@/modules/tanwir/api/students";
import { saveStudentAsPesertaAction } from "@/modules/tanwir/api/actions/peserta";
import { StudentForm } from "@/modules/tanwir/components/app/StudentForm";
import { Card, PageTitle } from "@/modules/tanwir/components/ui";

export const metadata = { title: "Ubah Anak Didik" };

export default async function PesertaEditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireTanwirMember("peserta");
  const { id } = await params;
  const scope: StudentScope = { kind: "peserta", memberId: viewer.member.id };
  const student = await getStudent(scope, id);
  if (!student) notFound();
  return (
    <div className="max-w-2xl">
      <PageTitle title={student.name} description="Perbarui data dan progres belajar." />
      <Card>
        <StudentForm action={saveStudentAsPesertaAction.bind(null, student.id)} initial={student} cancelHref="/tanwir/peserta/anak-didik" />
      </Card>
    </div>
  );
}
