import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { requireTanwirAdmin } from "@/modules/tanwir/api/access";
import { listGroups } from "@/modules/tanwir/api/groups";
import { deleteGroupAction } from "@/modules/tanwir/api/actions/admin";
import { AdminDeleteButton } from "@/modules/tanwir/components/admin/AdminForms";
import { DirectorySummary } from "@/modules/tanwir/components/admin/DirectorySummary";
import { DirectoryTable } from "@/modules/tanwir/components/admin/DirectoryTable";
import { Icon } from "@/modules/tanwir/components/icons";

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
      <div className="mb-5"><DirectorySummary items={[
        { label: "Total kelompok", value: groups.length, detail: "Kelompok pembinaan", icon: "map" },
        { label: "Dengan pembimbing", value: groups.filter(group => group.pic).length, detail: "Kelompok memiliki guru PIC", icon: "user" },
        { label: "Total anggota", value: groups.reduce((sum,group) => sum + group._count.members,0), detail: "Peserta dalam kelompok", icon: "students" },
        { label: "Total tugas", value: groups.reduce((sum,group) => sum + group._count.tasks,0), detail: "Penugasan kelompok", icon: "tasks" },
      ]} /></div>
      <DirectoryTable columns={["Kelompok", "Kode", "Guru PIC", "Anggota", "Tugas", "Aksi"]} label="kelompok" placeholder="Cari kelompok atau guru PIC" rows={groups.map(group => ({
        id: group.id, search: `${group.name} ${group.code} ${group.pic?.user.name ?? ""}`,
        cells: [
          <div key="name"><Link href={`/admin/tanwir/kelompok/${group.id}`} className="font-medium hover:text-tanwir-primary">{group.name}</Link>{group.description && <p className="mt-1 line-clamp-1 max-w-xs text-xs text-tanwir-muted">{group.description}</p>}</div>,
          <span key="code" className="directory-code">{group.code}</span>,
          <div key="pic">{group.pic?.user.name ?? "Belum ada PIC"}{group.pic && <p className="text-xs text-tanwir-muted">{group.pic.code}</p>}</div>,
          group._count.members, group._count.tasks,
          <div key="actions" className="flex justify-end gap-2"><Link href={`/admin/tanwir/kelompok/${group.id}`} className="directory-icon-button" aria-label={`Ubah ${group.name}`}><Icon name="edit" className="h-4 w-4" /></Link><AdminDeleteButton iconOnly action={deleteGroupAction.bind(null, group.id)} confirmText="Hapus kelompok? Anggota jadi tanpa kelompok." /></div>,
        ],
      }))} />
    </div>
  );
}
