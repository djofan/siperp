import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/FormField";
import { buttonVariants } from "@/components/ui/Button";
import { panelClasses } from "@/components/ui/panel";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { requireTanwirAdmin } from "@/modules/tanwir/api/access";
import { listStudents } from "@/modules/tanwir/api/students";
import { deleteStudentAsAdminAction } from "@/modules/tanwir/api/actions/admin";
import { AdminDeleteButton } from "@/modules/tanwir/components/admin/AdminForms";
import { formatDate } from "@/modules/tanwir/components/ui";

export const metadata = { title: "Anak Didik · Tanwir Qurani" };

export default async function TanwirAdminStudentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireTanwirAdmin();
  const { q = "" } = await searchParams;
  const students = await listStudents({ kind: "admin" }, q);

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
      <form className="mb-4 max-w-sm" role="search">
        <Input name="q" defaultValue={q} placeholder="Cari nama anak atau orang tua" aria-label="Cari" />
      </form>
      {students.length ? (
        <div className={panelClasses("overflow-x-auto")}>
          <Table>
            <Thead>
              <Tr>
                <Th>Nama anak</Th>
                <Th>Usia / kelas</Th>
                <Th>Guru ngaji</Th>
                <Th>Orang tua</Th>
                <Th>Diperbarui</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {students.map((student) => (
                <Tr key={student.id}>
                  <Td>
                    <Link href={`/admin/tanwir/anak-didik/${student.id}`} className="font-medium text-foreground hover:underline">
                      {student.name}
                    </Link>
                    {student.progress && <p className="line-clamp-1 max-w-xs text-xs text-foreground/50">{student.progress}</p>}
                  </Td>
                  <Td className="text-foreground/70">{[student.age ? `${student.age} th` : null, student.className].filter(Boolean).join(" · ") || "—"}</Td>
                  <Td className="text-foreground/70">
                    {student.member.user.name}
                    {student.member.group && <p className="text-xs text-foreground/50">{student.member.group.name}</p>}
                  </Td>
                  <Td className="text-foreground/70">
                    {student.parentName ?? "—"}
                    {student.parentPhone && <p className="text-xs tabular-nums text-foreground/50">{student.parentPhone}</p>}
                  </Td>
                  <Td className="whitespace-nowrap text-foreground/50">{formatDate(student.updatedAt)}</Td>
                  <Td className="text-right">
                    <AdminDeleteButton action={deleteStudentAsAdminAction.bind(null, student.id)} confirmText={`Hapus ${student.name}?`} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      ) : (
        <EmptyState>{q ? "Tidak ada yang cocok." : "Belum ada anak didik yang dicatat."}</EmptyState>
      )}
    </div>
  );
}
