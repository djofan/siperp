import { PageHeader } from "@/components/ui/PageHeader";
import { panelClasses } from "@/components/ui/panel";
import { requireTanwirAdmin } from "@/modules/tanwir/api/access";
import { guruOptions } from "@/modules/tanwir/api/groups";
import { saveGroupAction } from "@/modules/tanwir/api/actions/admin";
import { GroupForm } from "@/modules/tanwir/components/admin/AdminForms";

export const metadata = { title: "Tambah Kelompok · Tanwir Qurani" };

export default async function TanwirNewGroupPage() {
  await requireTanwirAdmin();
  const gurus = await guruOptions();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Tambah kelompok" />
      <div className={panelClasses("p-6")}>
        {gurus.length ? (
          <GroupForm action={saveGroupAction.bind(null, null)} initial={null} gurus={gurus} />
        ) : (
          <p className="text-sm text-foreground/60">Belum ada guru. Tambahkan guru terlebih dahulu karena setiap kelompok wajib punya PIC.</p>
        )}
      </div>
    </div>
  );
}
