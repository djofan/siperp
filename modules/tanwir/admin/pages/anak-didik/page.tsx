import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { requireTanwirAdmin } from "@/modules/tanwir/api/access";
import { listStudents } from "@/modules/tanwir/api/students";
import { deleteStudentAsAdminAction } from "@/modules/tanwir/api/actions/admin";
import { AdminDeleteButton } from "@/modules/tanwir/components/admin/AdminForms";
import { formatDate } from "@/modules/tanwir/components/ui";
import { DirectorySummary } from "@/modules/tanwir/components/admin/DirectorySummary";
import { DirectoryTable } from "@/modules/tanwir/components/admin/DirectoryTable";
import { Icon } from "@/modules/tanwir/components/icons";
import { Avatar } from "@/modules/tanwir/components/ui";

export const metadata = { title: "Anak Didik · Tanwir Qurani" };

export default async function TanwirAdminStudentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireTanwirAdmin();
  const { q = "" } = await searchParams;
  const students = await listStudents({ kind: "admin" });

  return (
    <div>
      <PageHeader
        title="Anak didik"
        description="Santri yang dicatat para peserta (guru ngaji) di TPQ masing-masing. Data privat — tidak tampil di halaman publik."
        actions={
          <Link href="/admin/tanwir/anak-didik/baru" className={buttonVariants()}>
            Tambah
          </Link>
        }
      />
      <div className="mb-5"><DirectorySummary items={[
        { label: "Total anak didik", value: students.length, detail: "Santri yang terdaftar", icon: "students" },
        { label: "Guru ngaji", value: new Set(students.map(student => student.member.id)).size, detail: "Pemilik data anak didik", icon: "user" },
        { label: "Progres tercatat", value: students.filter(student => student.progress).length, detail: "Memiliki catatan belajar", icon: "check" },
        { label: "Kontak orang tua", value: students.filter(student => student.parentPhone).length, detail: "Nomor kontak tersedia", icon: "user" },
      ]} /></div>
      <DirectoryTable columns={["Anak didik", "Usia / kelas", "Guru ngaji", "Orang tua", "Diperbarui", "Aksi"]} label="anak didik" placeholder="Cari nama anak atau orang tua" initialQuery={q} rows={students.map(student => ({
        id: student.id, search: `${student.name} ${student.parentName ?? ""} ${student.member.user.name}`,
        cells: [
          <div key="name" className="flex items-center gap-3"><Avatar name={student.name} size={36} /><div><Link href={`/admin/tanwir/anak-didik/${student.id}`} className="font-medium hover:text-tanwir-primary">{student.name}</Link>{student.progress && <p className="line-clamp-1 max-w-xs text-xs text-tanwir-muted">{student.progress}</p>}</div></div>,
          [student.age ? `${student.age} th` : null,student.className].filter(Boolean).join(" · ") || "—",
          <div key="teacher">{student.member.user.name}{student.member.group && <p className="text-xs text-tanwir-muted">{student.member.group.name}</p>}</div>,
          <div key="parent">{student.parentName ?? "—"}{student.parentPhone && <p className="text-xs text-tanwir-muted">{student.parentPhone}</p>}</div>,
          <span key="date" className="whitespace-nowrap text-tanwir-muted">{formatDate(student.updatedAt)}</span>,
          <div key="actions" className="flex justify-end gap-2"><Link href={`/admin/tanwir/anak-didik/${student.id}`} className="directory-icon-button" aria-label={`Ubah ${student.name}`}><Icon name="edit" className="h-4 w-4" /></Link><AdminDeleteButton iconOnly action={deleteStudentAsAdminAction.bind(null, student.id)} confirmText={`Hapus ${student.name}?`} /></div>,
        ],
      }))} />
    </div>
  );
}
