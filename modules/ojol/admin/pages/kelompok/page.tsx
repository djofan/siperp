import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonVariants } from "@/components/ui/Button";
import { panelClasses } from "@/components/ui/panel";
import { requireOjolAdmin } from "@/modules/ojol/api/access";
import { listGroups } from "@/modules/ojol/api/groups";
import { deleteGroupAction } from "@/modules/ojol/api/actions/admin";
import { AdminDeleteButton } from "@/modules/ojol/components/admin/AdminForms";

export const metadata = { title: "Kelompok · Ojol Mengaji" };

export default async function OjolGroupsPage() {
  await requireOjolAdmin();
  const groups = await listGroups();

  return (
    <div>
      <PageHeader
        title="Kelompok"
        description="Kelompok peserta (mis. per wilayah atau basecamp). Guru memilih kelompok penerima setiap kali membuat tugas."
        actions={
          <Link href="/admin/ojol/kelompok/baru" className={buttonVariants()}>
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
                  <Link href={`/admin/ojol/kelompok/${group.id}`} className="mt-1 block truncate text-lg font-semibold text-foreground hover:underline">
                    {group.name}
                  </Link>
                </div>
              </div>
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
        <EmptyState>Belum ada kelompok. Buat kelompok, lalu masukkan peserta dari halaman Peserta.</EmptyState>
      )}
    </div>
  );
}
