import { PageHeader } from "@/components/ui/PageHeader";
import { panelClasses } from "@/components/ui/panel";
import { requireTanwirAdmin } from "@/modules/tanwir/api/access";
import { ownerOptions } from "@/modules/tanwir/api/students";
import { saveStudentAsAdminAction } from "@/modules/tanwir/api/actions/admin";
import { AdminStudentForm } from "@/modules/tanwir/components/admin/AdminForms";

export const metadata = { title: "Tambah Anak Didik · Tanwir Qurani" };

export default async function TanwirAdminNewStudentPage() {
  await requireTanwirAdmin();
  const owners = await ownerOptions({ kind: "admin" });
  return (
    <div className="max-w-2xl">
      <PageHeader title="Tambah anak didik" />
      <div className={panelClasses("p-6")}>
        <AdminStudentForm action={saveStudentAsAdminAction.bind(null, null)} initial={null} owners={owners} />
      </div>
    </div>
  );
}
