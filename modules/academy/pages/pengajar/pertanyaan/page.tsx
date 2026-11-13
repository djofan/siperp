import { ListFilters } from "../../../components/ListFilters";
import { TeacherSessions } from "../../../components/TeacherSessions";
import Link from "next/link";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyTeacherDiscussion } from "@/contracts/modules/academy";
import { requireAcademyTeacher } from "../../../api/access";
import { TeacherPagination } from "../../../components/TeacherPagination";
import { PageHeading } from "../../../components/ui";

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAcademyTeacher();
  const query = await searchParams;
  const tab = query.tab === "jadwal" ? "jadwal" : "pertanyaan";
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const status = query.status === "waiting" || query.status === "answered" ? query.status : "";
  const page = Math.max(1, Math.min(100000, Number.parseInt(String(query.page ?? "1"), 10) || 1));
  const data = tab === "pertanyaan" ? await academyPage<{ items: AcademyTeacherDiscussion[]; page: number; pages: number; total: number }>(`academy/teacher/questions?${new URLSearchParams({ view: "table", page: String(page), q, status })}`) : null;
  return <div className="mx-auto max-w-7xl p-4 md:p-6">
    <PageHeading title="Pertanyaan peserta">Pertanyaan yang belum dijawab tampil lebih dahulu. Buka halaman jawaban untuk membaca pertanyaan lengkap.</PageHeading>
    {query.saved === "1" && <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">Jawaban berhasil disimpan dan dapat dilihat oleh peserta yang bertanya.</p>}
    <nav aria-label="Tanya jawab pengajar" className="mb-6 flex gap-2">{[["pertanyaan", "Pertanyaan peserta"], ["jadwal", "Jadwal sesi langsung"]].map(([id, title]) => <Link key={id} href={`/academy/pengajar/pertanyaan?tab=${id}`} aria-current={tab === id ? "page" : undefined} className={`rounded-xl px-4 py-3 text-sm font-medium ${tab === id ? "bg-green-700 text-white" : "border bg-white text-gray-600"}`}>{title}</Link>)}</nav>
    {tab === "jadwal" && <TeacherSessions page={page} saved={query.saved === "session"} edit={typeof query.edit === "string" ? query.edit : ""}/>}
    {data && <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white" aria-label="Daftar pertanyaan">
      <div className="border-b border-gray-100 p-5"><h2 className="font-semibold">Daftar pertanyaan</h2><p className="mt-1 text-sm text-gray-500">{data.total} pertanyaan</p></div>
      <ListFilters base="/academy/pengajar/pertanyaan" q={q} status={status} discussion/>
      <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm">
        <thead className="bg-gray-50 text-gray-600"><tr>{["No.", "Peserta", "Angkatan / Program", "Pertanyaan", "Tanggal (WIB)", "Status", "Aksi"].map(label => <th scope="col" key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100">{data.items.map((question, index) => <tr key={question.id} className="hover:bg-gray-50">
          <td className="px-4 py-4 text-gray-500">{(data.page - 1) * 10 + index + 1}</td>
          <td className="px-4 py-4">{question.profile.user.name}</td>
          <td className="px-4 py-4">{question.course.cohort?.title ?? question.course.title}</td>
          <td className="max-w-sm px-4 py-4"><p className="line-clamp-3 break-words">{question.question}</p></td>
          <td className="px-4 py-4 text-xs">{new Date(question.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</td>
          <td className="px-4 py-4"><span className={`inline-block rounded-full px-2.5 py-1 text-xs ${question.answer ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}>{question.answer ? "Sudah dijawab" : "Belum dijawab"}</span></td>
          <td className="px-4 py-4"><Link href={`/academy/pengajar/pertanyaan/${question.id}?page=${data.page}&back=${encodeURIComponent(`/academy/pengajar/pertanyaan?${new URLSearchParams({ q, status, page: String(data.page) })}`)}`} className="font-medium text-green-700 underline">{question.answer ? "Lihat / edit jawaban" : "Jawab"}</Link></td>
        </tr>)}{!data.items.length && <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-500">Belum ada pertanyaan dari peserta. Pertanyaan baru akan tampil di sini.</td></tr>}</tbody>
      </table></div>
      <TeacherPagination page={data.page} lastPage={data.pages} total={data.total} filters={{ q, status }} base="/academy/pengajar/pertanyaan"/>
    </section>}
  </div>;
}
