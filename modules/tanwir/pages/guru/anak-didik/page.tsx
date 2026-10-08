import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { listStudents, type StudentScope } from "@/modules/tanwir/api/students";
import { deleteStudentAsGuruAction } from "@/modules/tanwir/api/actions/guru";
import { StudentList } from "@/modules/tanwir/components/app/StudentList";
import { Icon } from "@/modules/tanwir/components/icons";
import { ButtonLink, PageTitle, inputClass } from "@/modules/tanwir/components/ui";

export const metadata = { title: "Anak Didik" };

export default async function GuruStudentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requireTanwirMember("guru");
  const { q = "" } = await searchParams;
  const scope: StudentScope = { kind: "guru", teacherId: viewer.member.id };
  const students = await listStudents(scope, q);
  return (
    <div>
      <PageTitle
        title="Anak didik"
        description="Santri yang dicatat peserta di kelompok yang Anda PIC-i."
        action={
          <ButtonLink href="/tanwir/guru/anak-didik/baru">
            <Icon name="plus" className="h-4 w-4" />
            Tambah
          </ButtonLink>
        }
      />
      <form className="mb-5 max-w-sm" role="search">
        <input name="q" defaultValue={q} placeholder="Cari nama anak atau orang tua" aria-label="Cari anak didik" className={inputClass} />
      </form>
      <StudentList students={students} basePath="/tanwir/guru/anak-didik" showOwner={true} onDelete={deleteStudentAsGuruAction} />
    </div>
  );
}
