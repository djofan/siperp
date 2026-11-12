import Link from "next/link";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyPage5 } from "@/modules/academy/api/page-contracts";
import type { ParticipantDiscussion } from "@/contracts/modules/academy";
import { requireAcademyProfile } from "../../api/access";
import { TeacherPagination } from "../../components/TeacherPagination";
import { PageHeading } from "../../components/ui";

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAcademyProfile();
  const query = await searchParams;
  const page = Math.max(1, Math.min(100000, Number.parseInt(String(query.page ?? "1"), 10) || 1));
  const { enrollments, questions } = await academyPage<{
    enrollments: AcademyPage5["enrollments"];
    questions: { items: ParticipantDiscussion[]; page: number; pages: number; total: number };
  }>(`academy/learning/discussions?view=table&page=${page}`);
  return <div className="mx-auto max-w-7xl p-4 md:p-6">
    <PageHeading title="Tanya jawab Ustadz">Kirim pertanyaan pribadi kepada pengajar dan baca jawabannya melalui daftar berikut.</PageHeading>
    {query.saved === "1" && <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">Pertanyaan berhasil dikirim. Jawaban pengajar dapat dibaca dari tabel ini.</p>}
    {enrollments.length ? <Link href="/academy/tanya-jawab/baru" className="mb-6 inline-block rounded-xl bg-green-700 px-5 py-3 text-sm font-medium text-white">Ajukan pertanyaan</Link> : <p className="mb-6 rounded-xl bg-amber-50 p-4 text-sm">Ikuti angkatan / program terlebih dahulu untuk bertanya. <Link href="/academy/angkatan" className="text-green-700 underline">Lihat angkatan</Link></p>}
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white" aria-label="Pertanyaan saya">
      <div className="border-b border-gray-100 p-5"><h2 className="font-semibold">Pertanyaan saya</h2><p className="mt-1 text-sm text-gray-500">{questions.total} pertanyaan · Hanya pertanyaan milik Anda yang ditampilkan.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-gray-50 text-gray-600"><tr>{["No.", "Angkatan / Program", "Pertanyaan", "Tanggal (WIB)", "Status", "Aksi"].map(label => <th scope="col" key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100">{questions.items.map((question, index) => <tr key={question.id} className="hover:bg-gray-50">
          <td className="px-4 py-4 text-gray-500">{(questions.page - 1) * 10 + index + 1}</td><td className="px-4 py-4">{question.course.cohort?.title ?? question.course.title}</td>
          <td className="max-w-sm px-4 py-4"><p className="line-clamp-3 break-words">{question.question}</p></td>
          <td className="px-4 py-4 text-xs">{new Date(question.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</td>
          <td className="px-4 py-4"><span className={`inline-block rounded-full px-2.5 py-1 text-xs ${question.answer ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}>{question.answer ? "Sudah dijawab" : "Menunggu jawaban"}</span></td>
          <td className="px-4 py-4"><Link href={`/academy/tanya-jawab/${question.id}?page=${questions.page}`} className="font-medium text-green-700 underline">{question.answer ? "Baca jawaban" : "Lihat pertanyaan"}</Link></td>
        </tr>)}{!questions.items.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-500">Belum ada pertanyaan. Gunakan Ajukan pertanyaan untuk bertanya kepada pengajar.</td></tr>}</tbody>
      </table></div>
      <TeacherPagination page={questions.page} lastPage={questions.pages} total={questions.total} base="/academy/tanya-jawab"/>
    </section>
    <details className="mt-6 rounded-2xl border border-gray-200 bg-white p-5"><summary className="cursor-pointer font-semibold">Jadwal sesi tanya jawab</summary>
      {enrollments.map(({ course }) => <section key={course.id} className="mt-4"><h3 className="text-sm font-medium">{course.title}</h3>{course.sessions.length ? course.sessions.map(session => <div key={session.id} className="mt-3 rounded-xl bg-green-50 p-4"><p className="font-medium">{session.title}</p><p className="mt-1 text-sm">{new Date(session.startsAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p><a href={session.joinUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-green-700 underline">Buka sesi</a></div>) : <p className="mt-2 text-sm text-gray-500">Jadwal akan diumumkan pengajar.</p>}</section>)}
    </details>
  </div>;
}
