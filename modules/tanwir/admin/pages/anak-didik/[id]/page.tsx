import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { panelClasses } from "@/components/ui/panel";
import { requireTanwirAdmin } from "@/modules/tanwir/api/access";
import { getStudent, ownerOptions } from "@/modules/tanwir/api/students";
import { saveStudentAsAdminAction } from "@/modules/tanwir/api/actions/admin";
import { AdminStudentForm } from "@/modules/tanwir/components/admin/AdminForms";

export const metadata = { title: "Anak Didik · Tanwir Qurani" };

export default async function TanwirAdminEditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTanwirAdmin();
  const { id } = await params;
  const [student, owners] = await Promise.all([getStudent({ kind: "admin" }, id), ownerOptions({ kind: "admin" })]);
  if (!student) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader title={student.name} description="Perbarui data dan progres belajar." />
      <div className={panelClasses("p-6")}>
        <AdminStudentForm action={saveStudentAsAdminAction.bind(null, student.id)} initial={student} owners={owners} />
      </div>
    </div>
  );
}
