import { PageHeader } from "@/components/ui/PageHeader";
import { panelClasses } from "@/components/ui/panel";
import { requireOjolAdmin } from "@/modules/ojol/api/access";
import { saveGroupAction } from "@/modules/ojol/api/actions/admin";
import { GroupForm } from "@/modules/ojol/components/admin/AdminForms";

export const metadata = { title: "Tambah Kelompok · Ojol Mengaji" };

export default async function OjolNewGroupPage() {
  await requireOjolAdmin();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Tambah kelompok" />
      <div className={panelClasses("p-6")}>
        <GroupForm action={saveGroupAction.bind(null, null)} initial={null} />
      </div>
    </div>
  );
}
