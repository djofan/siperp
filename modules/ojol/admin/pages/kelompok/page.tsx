import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { requireOjolAdmin } from "@/modules/ojol/api/access";
import { listGroups } from "@/modules/ojol/api/groups";
import { deleteGroupAction } from "@/modules/ojol/api/actions/admin";
import { AdminDeleteButton } from "@/modules/ojol/components/admin/AdminForms";
import { DirectorySummary } from "@/modules/ojol/components/admin/DirectorySummary";
import { DirectoryTable } from "@/modules/ojol/components/admin/DirectoryTable";
import { Icon } from "@/modules/ojol/components/icons";

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
      <div className="mb-5"><DirectorySummary items={[
        { label: "Total kelompok", value: groups.length, detail: "Wilayah dan basecamp", icon: "map" },
        { label: "Dengan anggota", value: groups.filter(group => group._count.members > 0).length, detail: "Kelompok terisi peserta", icon: "check" },
        { label: "Total anggota", value: groups.reduce((sum,group) => sum + group._count.members,0), detail: "Driver dalam kelompok", icon: "students" },
        { label: "Total tugas", value: groups.reduce((sum,group) => sum + group._count.tasks,0), detail: "Penugasan kelompok", icon: "tasks" },
      ]} /></div>
      <DirectoryTable columns={["Kelompok", "Kode", "Anggota", "Tugas", "Aksi"]} label="kelompok" placeholder="Cari kelompok atau kode" rows={groups.map(group => ({
        id: group.id, search: `${group.name} ${group.code}`,
        cells: [
          <div key="name"><Link href={`/admin/ojol/kelompok/${group.id}`} className="font-medium hover:text-ojol-primary">{group.name}</Link>{group.description && <p className="mt-1 line-clamp-1 max-w-xs text-xs text-ojol-muted">{group.description}</p>}</div>,
          <span key="code" className="directory-code">{group.code}</span>,
          group._count.members, group._count.tasks,
          <div key="actions" className="flex justify-end gap-2"><Link href={`/admin/ojol/kelompok/${group.id}`} className="directory-icon-button" aria-label={`Ubah ${group.name}`}><Icon name="edit" className="h-4 w-4" /></Link><AdminDeleteButton iconOnly action={deleteGroupAction.bind(null, group.id)} confirmText="Hapus kelompok? Anggota jadi tanpa kelompok." /></div>,
        ],
      }))} />
    </div>
  );
}
