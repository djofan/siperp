import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { saveStudentAsPesertaAction } from "@/modules/tanwir/api/actions/peserta";
import { StudentForm } from "@/modules/tanwir/components/app/StudentForm";
import { Card, PageTitle } from "@/modules/tanwir/components/ui";

export const metadata = { title: "Tambah Anak Didik" };

export default async function PesertaNewStudentPage() {
  await requireTanwirMember("peserta");
  return (
    <div className="max-w-2xl">
      <PageTitle title="Tambah anak didik" />
      <Card>
        <StudentForm action={saveStudentAsPesertaAction.bind(null, null)} cancelHref="/tanwir/peserta/anak-didik" />
      </Card>
    </div>
  );
}
