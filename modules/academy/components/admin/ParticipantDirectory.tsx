import Link from "next/link";
import { Input } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { listAdminCompletions, listAdminEnrollments } from "../../api/admin-participants";
import { adminPage } from "../../api/admin-participant-validation";
import { AdminHeading, AdminEmpty, AddLink } from "./AdminUi";
import { PageLinks, ProgressSummary, adminDate } from "./ParticipantUi";

// Rendered only by pages that have passed requireAcademyAdmin().
export async function ParticipantDirectory({ certificates, query }: {
  certificates: boolean; query: Record<string, string | string[] | undefined>;
}) {
  const search = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const program = typeof query.program === "string" ? query.program.slice(0, 100) : "";
  const base = certificates ? "/admin/academy/sertifikat" : "/admin/academy/peserta";
  const result = certificates
    ? await listAdminCompletions(search, program, adminPage(query.page))
    : await listAdminEnrollments(search, program, adminPage(query.page));
  return <><AdminHeading title={certificates ? "Catatan kelulusan & sertifikat" : "Peserta & progres"}
    description={certificates ? "Status saat ini dihitung ulang dari kurikulum dan progres. Buat catatan dari detail peserta." : "Satu baris per keikutsertaan peserta pada program. Progres mencakup materi dan kuis terpublikasi."}
    action={certificates ? <AddLink href="/admin/academy/peserta">Pilih peserta</AddLink> : undefined} />
    <form action={base} className="mb-6 flex flex-wrap gap-3">
      <Input name="q" aria-label="Cari nama, email atau NIS" placeholder="Nama, email atau NIS…" defaultValue={search} maxLength={100} className="max-w-sm" />
      <Input name="program" aria-label="Cari judul program" placeholder="Judul program…" defaultValue={program} maxLength={100} className="max-w-sm" />
      <Button type="submit">Cari</Button>
    </form>
    {result.items.length ? <div className="overflow-x-auto rounded-2xl bg-surface p-4"><table className="w-full text-left text-sm text-foreground">
      <thead><tr>{["Peserta", "Program", certificates ? "Catatan tersimpan" : "Terdaftar", "Progres saat ini", "Aksi"].map(label => <th key={label} className="p-3 text-foreground/60">{label}</th>)}</tr></thead>
      <tbody>{result.items.map(item => {
        const current = "current" in item ? item.current : item;
        return <tr key={item.id} className="border-t border-border align-top">
          <td className="p-3"><p className="font-semibold">{item.profile.user.name}</p><p className="mt-1 break-all text-foreground/60">{item.profile.user.email}</p><p className="mt-1 text-xs">{item.profile.nis ?? "Tanpa NIS"}{!item.profile.user.isActive && " · Akun nonaktif"}</p></td>
          <td className="p-3">{item.course.title}{!item.course.isPublished && <p className="mt-1 text-xs text-foreground/60">Program draft</p>}</td>
          <td className="p-3">{"updatedAt" in item ? <><p>{item.isEligible ? "Lulus" : "Belum lulus"}</p><p className="mt-1 text-xs">{adminDate(item.completedAt)}</p><p className="mt-1 text-xs">{item.certificateUrl ? "Tautan tersedia" : "Tanpa tautan tambahan"}</p></> : adminDate(item.createdAt)}</td>
          <td className="min-w-64 p-3">{current ? <ProgressSummary value={current} /> : <p className="text-danger">Enrollment tidak ditemukan</p>}</td>
          <td className="p-3"><Link className="text-accent hover:underline" href={base + "/" + item.id}>Kelola<span className="sr-only"> {item.profile.user.name} — {item.course.title}</span></Link></td>
        </tr>;
      })}</tbody>
    </table></div> : <AdminEmpty>Tidak ada data yang cocok.</AdminEmpty>}
    <PageLinks {...result} base={base} query={{ q: search, program }} />
  </>;
}
