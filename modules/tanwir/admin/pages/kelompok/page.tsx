import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonVariants } from "@/components/ui/Button";
import { panelClasses } from "@/components/ui/panel";
import { requireTanwirAdmin } from "@/modules/tanwir/api/access";
import { listGroups } from "@/modules/tanwir/api/groups";
import { deleteGroupAction } from "@/modules/tanwir/api/actions/admin";
import { AdminDeleteButton } from "@/modules/tanwir/components/admin/AdminForms";

export const metadata = { title: "Kelompok · Tanwir Qurani" };

export default async function TanwirGroupsPage() {
  await requireTanwirAdmin();
  const groups = await listGroups();

  return (
    <div>
      <PageHeader
        title="Kelompok"
        description="Setiap kelompok dinaungi satu guru PIC. Tugas buatan PIC otomatis terkirim ke semua anggota kelompoknya."
        actions={
          <Link href="/admin/tanwir/kelompok/baru" className={buttonVariants()}>
            Tambah kelompok
          </Link>
        }
      />
      {groups.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <article key={group.id} className={panelClasses("flex flex-col p-5")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium tabular-nums text-foreground/50">{group.code}</p>
                  <Link href={`/admin/tanwir/kelompok/${group.id}`} className="mt-1 block truncate text-lg font-semibold text-foreground hover:underline">
                    {group.name}
                  </Link>
                </div>
              </div>
              <p className="mt-1 text-sm text-foreground/60">PIC: {group.pic ? `${group.pic.user.name} (${group.pic.code})` : "— belum ada"}</p>
              {group.description && <p className="mt-3 line-clamp-2 text-sm text-foreground/50">{group.description}</p>}
              <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-sm">
                <span className="text-foreground/60">
                  <strong className="tabular-nums text-foreground">{group._count.members}</strong> anggota ·{" "}
                  <strong className="tabular-nums text-foreground">{group._count.tasks}</strong> tugas
                </span>
                <AdminDeleteButton action={deleteGroupAction.bind(null, group.id)} confirmText="Hapus kelompok? Anggota jadi tanpa kelompok." />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState>Belum ada kelompok. Tambahkan guru dulu, lalu buat kelompok dengan guru tersebut sebagai PIC.</EmptyState>
      )}
    </div>
  );
}
