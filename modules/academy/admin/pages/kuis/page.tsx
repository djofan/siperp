import Link from "next/link";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { listAdminQuizzes } from "@/modules/academy/api/admin-quizzes";
import { AdminHeading, AddLink, AdminEmpty, PublishBadge } from "@/modules/academy/components/admin/AdminUi";
import { Input } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAcademyAdmin();
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const page = Number(query.page);
  const result = await listAdminQuizzes(search, Number.isSafeInteger(page) && page > 0 ? page : 1);
  const href = (page: number) => "/admin/academy/kuis?" + new URLSearchParams({ q: search, page: String(page) });
  return <><AdminHeading title="Kuis" description="Tambahkan kuis dari bab pada program belajar. Pertanyaan dan jawaban hanya tersedia bagi admin academy." action={<AddLink href="/admin/academy/program">Pilih program & bab</AddLink>} />
    <form action="/admin/academy/kuis" className="mb-6 flex gap-3"><Input name="q" aria-label="Cari judul kuis" placeholder="Cari judul kuis…" defaultValue={search} maxLength={100} className="max-w-sm" /><Button type="submit">Cari</Button></form>
    {result.items.length ? <div className="overflow-x-auto rounded-2xl bg-surface p-4"><table className="w-full text-left text-sm">
      <thead><tr>{["Kuis", "Program / Bab", "Status", "Pertanyaan", "Percobaan", "Aksi"].map(label => <th key={label} className="p-3 text-foreground/60">{label}</th>)}</tr></thead>
      <tbody>{result.items.map(quiz => <tr key={quiz.id} className="border-t border-border text-foreground">
        <td className="p-3 font-semibold">{quiz.title}</td><td className="p-3">{quiz.chapter.course.title}<br />{quiz.chapter.title}</td>
        <td className="p-3"><PublishBadge published={quiz.isPublished} /><p className="mt-2 text-xs">{quiz.isActive ? "Pengerjaan aktif" : "Pengerjaan nonaktif"}</p></td>
        <td className="p-3">{quiz._count.questions}</td><td className="p-3">{quiz._count.attempts}</td>
        <td className="p-3"><Link className="text-accent hover:underline" href={`/admin/academy/program/${quiz.chapter.courseId}/bab/${quiz.chapter.id}/kuis/${quiz.id}`}>Kelola<span className="sr-only"> {quiz.title}</span></Link></td>
      </tr>)}</tbody>
    </table></div> : <AdminEmpty>Belum ada kuis yang cocok. Tambahkan kuis dari halaman bab.</AdminEmpty>}
    <nav aria-label="Halaman kuis" className="mt-5 flex flex-wrap gap-4 text-sm text-foreground"><span>{result.total} kuis · Halaman {result.page} dari {result.pages}</span>{result.page > 1 && <Link className="text-accent" href={href(result.page - 1)}>Sebelumnya</Link>}{result.page < result.pages && <Link className="text-accent" href={href(result.page + 1)}>Berikutnya</Link>}</nav>
  </>;
}

