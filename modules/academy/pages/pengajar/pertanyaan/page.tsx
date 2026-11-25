import { formatNumericText } from "@/lib/number-format";
import { requireAcademyAdmin } from "../../../api/admin-access";
import { TeacherSessions } from "../../../components/TeacherSessions";
import Link from "@/modules/academy/pwa/AcademyNavigation";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyTeacherDiscussion } from "@/contracts/modules/academy";
import { requireAcademyTeacher } from "../../../api/access";
import { TeacherPagination } from "../../../components/TeacherPagination";
import { PageHeading } from "../../../components/ui";

export async function QuestionsPanel({ searchParams, admin = false }: { searchParams: Promise<Record<string, string | string[] | undefined>>; admin?: boolean }) {
  if (admin) await requireAcademyAdmin(); else await requireAcademyTeacher();
  const base = admin ? "/admin/academy/pertanyaan" : "/academy/pengajar/pertanyaan";
  const query = await searchParams;
  const tab = !admin && query.tab === "jadwal" ? "jadwal" : "pertanyaan";
  const page = Math.max(1, Math.min(100000, Number.parseInt(String(query.page ?? "1"), 10) || 1));
  const data = tab === "pertanyaan" ? await academyPage<{ items: AcademyTeacherDiscussion[]; page: number; pages: number; total: number }>(`academy/teacher/questions?view=table&page=${page}`) : null;
  return <div className="mx-auto max-w-7xl p-4 md:p-6">
    <PageHeading title={admin ? "Tanya Ustadz" : "Pertanyaan peserta"}>{admin ? "Baca pertanyaan peserta, teruskan secara manual kepada ustadz, lalu masukkan jawaban beliau untuk disampaikan kepada peserta." : "Pertanyaan yang belum dijawab tampil lebih dahulu. Buka halaman jawaban untuk membaca pertanyaan lengkap."}</PageHeading>
    {query.saved === "1" && <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">Jawaban berhasil disimpan dan dapat dilihat oleh peserta yang bertanya.</p>}
    {!admin && <nav aria-label="Tanya jawab pengajar" className="mb-6 flex gap-2">{[["pertanyaan", "Pertanyaan peserta"], ["jadwal", "Jadwal sesi langsung"]].map(([id, title]) => <Link key={id} href={`/academy/pengajar/pertanyaan?tab=${id}`} aria-current={tab === id ? "page" : undefined} className={`rounded-xl px-4 py-3 text-sm font-medium ${tab === id ? "bg-green-700 text-white" : "border bg-white text-gray-600"}`}>{title}</Link>)}</nav>}
    {tab === "jadwal" && <TeacherSessions page={page} saved={query.saved === "session"}/>}
    {data && <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white" aria-label="Daftar pertanyaan">
      <div className="border-b border-gray-100 p-5"><h2 className="font-semibold">Daftar pertanyaan</h2><p className="mt-1 text-sm text-gray-500">{formatNumericText(data.total)} pertanyaan</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm">
        <thead className="bg-gray-50 text-gray-600"><tr>{["No.", "Peserta", "Angkatan", "Judul & pertanyaan", "Tanggal (WIB)", "Status", "Aksi"].map(label => <th scope="col" key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100">{data.items.map((question, index) => <tr key={question.id} className="hover:bg-gray-50">
          <td className="px-4 py-4 text-gray-500">{formatNumericText((data.page - 1) * 10 + index + 1)}</td>
          <td className="px-4 py-4">{question.profile.user.name}</td>
          <td className="px-4 py-4">{question.course.cohort?.title ?? question.course.title}</td>
          <td className="max-w-sm px-4 py-4"><p className="break-words font-semibold">{question.title || "Pertanyaan tanpa judul"}</p><p className="mt-1 line-clamp-2 break-words text-gray-500">{question.question}</p></td>
          <td className="px-4 py-4 text-xs">{new Date(question.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</td>
          <td className="px-4 py-4"><span className={`inline-block rounded-full px-2.5 py-1 text-xs ${question.answer ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}>{question.answer ? "Sudah dijawab" : "Belum dijawab"}</span></td>
          <td className="px-4 py-4"><Link href={`${base}/${question.id}?page=${data.page}`} className="font-medium text-green-700 underline">{question.answer ? "Lihat / edit jawaban" : "Jawab"}</Link></td>
        </tr>)}{!data.items.length && <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-500">Belum ada pertanyaan dari peserta. Pertanyaan baru akan tampil di sini.</td></tr>}</tbody>
      </table></div>
      <TeacherPagination page={data.page} lastPage={data.pages} total={data.total} base={base}/>
    </section>}
  </div>;
}

export default function QuestionsPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <QuestionsPanel {...props} />;
}
